/**
 * afterPack hook for electron-builder (v4)
 *
 * Fixes TWO problems with electron-builder + pnpm:
 * 1. Missing transitive deps (pnpm list --prod returns incomplete tree)
 * 2. Version conflicts (top-level ajv@6 vs conf needing ajv@8)
 *
 * Strategy:
 * - BFS from package.json dependencies to find all 481 production packages
 * - Copy each from local node_modules (dereferenced)
 * - For each, check pnpm's virtual store to detect version conflicts
 * - Where a dep resolves to a DIFFERENT version than top-level, create
 *   a nested node_modules/ with the correct version
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function getDeps(pkgDir) {
  const pj = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pj)) return [];
  try {
    return Object.keys(JSON.parse(fs.readFileSync(pj, "utf8")).dependencies || {});
  } catch {
    return [];
  }
}

function getVersion(pkgDir) {
  const pj = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pj)) return null;
  try {
    return JSON.parse(fs.readFileSync(pj, "utf8")).version || null;
  } catch {
    return null;
  }
}

/**
 * BFS from project's dependencies to find all production package names.
 */
function resolveProductionDeps(localNm) {
  const rootPj = path.join(path.dirname(localNm), "package.json");
  const seeds = Object.keys(JSON.parse(fs.readFileSync(rootPj, "utf8")).dependencies || {});

  const allProd = new Set();
  const queue = [...seeds];
  while (queue.length > 0) {
    const pkg = queue.pop();
    if (allProd.has(pkg)) continue;
    allProd.add(pkg);
    for (const dep of getDeps(path.join(localNm, pkg))) {
      if (!allProd.has(dep)) queue.push(dep);
    }
  }
  return allProd;
}

/**
 * For a given package, find version conflicts between what pnpm resolves
 * for its deps vs what's at the top-level node_modules.
 * Returns array of { dep, correctPath } for conflicting deps.
 */
function findVersionConflicts(pkgName, localNm) {
  const topPath = path.join(localNm, pkgName);
  if (!fs.existsSync(topPath)) return [];

  let realPath;
  try {
    realPath = fs.realpathSync(topPath);
  } catch {
    return [];
  }

  // pnpm virtual store: .pnpm/pkg@version/node_modules/ contains
  // symlinks to the exact versions this package needs
  const pnpmNm = path.dirname(realPath);

  const conflicts = [];
  for (const dep of getDeps(realPath)) {
    const depInStore = path.join(pnpmNm, dep);
    const depTopLevel = path.join(localNm, dep);

    if (!fs.existsSync(depInStore) || !fs.existsSync(depTopLevel)) continue;

    let storeReal, topReal;
    try {
      storeReal = fs.realpathSync(depInStore);
      topReal = fs.realpathSync(depTopLevel);
    } catch {
      continue;
    }

    if (storeReal !== topReal) {
      conflicts.push({ dep, correctPath: storeReal });
    }
  }
  return conflicts;
}

function countPackages(nmDir) {
  if (!fs.existsSync(nmDir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(nmDir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(nmDir, entry);
    if (!fs.statSync(full).isDirectory()) continue;
    if (entry.startsWith("@")) {
      try { count += fs.readdirSync(full).length; } catch {}
    } else {
      count++;
    }
  }
  return count;
}

exports.default = async function afterPack(context) {
  const platform = context.electronPlatformName;
  const productName = context.packager.appInfo.productFilename;
  const projectDir = context.packager.projectDir;
  const appOutDir = context.appOutDir;

  let resourcesDir;
  if (platform === "darwin") {
    resourcesDir = path.join(appOutDir, `${productName}.app`, "Contents", "Resources");
  } else {
    resourcesDir = path.join(appOutDir, "resources");
  }

  const asarPath = path.join(resourcesDir, "app.asar");
  if (!fs.existsSync(asarPath)) {
    console.log("[afterPack] No asar found, skipping.");
    return;
  }

  const localNm = path.join(projectDir, "node_modules");
  const tempDir = path.join(resourcesDir, "__asar_fix_tmp");

  try {
    // 1. Resolve production deps
    console.log("[afterPack] Resolving production dependencies...");
    const prodPkgs = resolveProductionDeps(localNm);
    console.log(`[afterPack] ${prodPkgs.size} production packages found.`);

    // 2. Extract asar
    console.log("[afterPack] Extracting asar...");
    execSync(`npx asar extract "${asarPath}" "${tempDir}"`, { stdio: "pipe" });
    const asarNm = path.join(tempDir, "node_modules");
    const beforeCount = countPackages(asarNm);

    // 3. Replace node_modules with clean copy
    fs.rmSync(asarNm, { recursive: true, force: true });
    fs.mkdirSync(asarNm, { recursive: true });

    let copied = 0;
    let conflictsFixed = 0;

    for (const pkg of prodPkgs) {
      const src = path.join(localNm, pkg);
      const dest = path.join(asarNm, pkg);
      if (!fs.existsSync(src)) continue;

      // Ensure parent dir for scoped packages
      const parent = path.dirname(dest);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

      // Copy package (dereference pnpm symlinks)
      fs.cpSync(src, dest, { recursive: true, dereference: true });
      copied++;

      // 4. Fix version conflicts: create nested node_modules/ where needed
      const conflicts = findVersionConflicts(pkg, localNm);
      for (const { dep, correctPath } of conflicts) {
        const nestedDest = path.join(dest, "node_modules", dep);
        const nestedParent = path.dirname(nestedDest);
        if (!fs.existsSync(nestedParent)) fs.mkdirSync(nestedParent, { recursive: true });
        fs.cpSync(correctPath, nestedDest, { recursive: true });
        conflictsFixed++;
      }
    }

    const afterCount = countPackages(asarNm);
    console.log(`[afterPack] node_modules: ${beforeCount} → ${afterCount} packages (copied ${copied}, version conflicts fixed: ${conflictsFixed})`);

    // 5. Repack
    console.log("[afterPack] Repacking asar...");
    fs.rmSync(asarPath, { force: true });
    execSync(`npx asar pack "${tempDir}" "${asarPath}" --unpack "{**/*.node,**/better-sqlite3/**}"`, { stdio: "pipe" });
    console.log("[afterPack] Done.");
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
};
