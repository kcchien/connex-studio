/**
 * afterPack hook for electron-builder
 *
 * Root cause: pnpm list --prod returns an incomplete dependency tree,
 * and electron-builder consumes it as-is, resulting in missing packages.
 *
 * Fix: After electron-builder packs, this hook REPLACES the asar's
 * node_modules with a clean copy built by recursively resolving
 * dependencies from the project's package.json. This is independent
 * of pnpm's broken dependency resolution.
 *
 * All copies use dereference: true to resolve pnpm symlinks to real files.
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * Recursively resolve all production dependencies starting from
 * the project's package.json. Returns a Set of package names.
 */
function resolveProductionDeps(projectDir) {
  const localNm = path.join(projectDir, "node_modules");

  function getDeps(pkgName) {
    const pj = path.join(localNm, pkgName, "package.json");
    if (!fs.existsSync(pj)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(pj, "utf8"));
      return Object.keys(data.dependencies || {});
    } catch {
      return [];
    }
  }

  // Seed from project's own dependencies
  const rootPj = path.join(projectDir, "package.json");
  const rootData = JSON.parse(fs.readFileSync(rootPj, "utf8"));
  const seeds = Object.keys(rootData.dependencies || {});

  // BFS to collect all transitive production dependencies
  const allProd = new Set();
  const queue = [...seeds];
  while (queue.length > 0) {
    const pkg = queue.pop();
    if (allProd.has(pkg)) continue;
    allProd.add(pkg);
    for (const dep of getDeps(pkg)) {
      if (!allProd.has(dep)) {
        queue.push(dep);
      }
    }
  }
  return allProd;
}

/**
 * Count top-level packages in a node_modules directory.
 */
function countPackages(nmDir) {
  if (!fs.existsSync(nmDir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(nmDir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(nmDir, entry);
    if (!fs.statSync(full).isDirectory()) continue;
    if (entry.startsWith("@")) {
      try { count += fs.readdirSync(full).length; } catch { /* empty scope */ }
    } else {
      count++;
    }
  }
  return count;
}

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const platform = context.electronPlatformName;
  const productName = context.packager.appInfo.productFilename;
  const projectDir = context.packager.projectDir;

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
    // 1. Resolve the correct set of production dependencies
    console.log("[afterPack] Resolving production dependencies...");
    const prodPkgs = resolveProductionDeps(projectDir);
    console.log(`[afterPack] ${prodPkgs.size} production packages resolved.`);

    // 2. Extract asar
    console.log("[afterPack] Extracting asar...");
    execSync(`npx asar extract "${asarPath}" "${tempDir}"`, { stdio: "pipe" });

    const asarNm = path.join(tempDir, "node_modules");
    const beforeCount = countPackages(asarNm);

    // 3. Delete asar's node_modules and rebuild from scratch
    fs.rmSync(asarNm, { recursive: true, force: true });
    fs.mkdirSync(asarNm, { recursive: true });

    let copied = 0;
    let skipped = 0;
    for (const pkg of prodPkgs) {
      const src = path.join(localNm, pkg);
      const dest = path.join(asarNm, pkg);

      if (!fs.existsSync(src)) {
        skipped++;
        continue;
      }

      // Ensure parent directory exists (for scoped packages)
      const parent = path.dirname(dest);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }

      // Copy with dereference to resolve pnpm symlinks
      fs.cpSync(src, dest, { recursive: true, dereference: true });
      copied++;
    }

    const afterCount = countPackages(asarNm);
    console.log(`[afterPack] Replaced node_modules: ${beforeCount} → ${afterCount} (copied ${copied}, not found ${skipped})`);

    // 4. Repack asar
    console.log("[afterPack] Repacking asar...");
    fs.rmSync(asarPath, { force: true });
    const unpackGlob = "{**/*.node,**/better-sqlite3/**}";
    execSync(`npx asar pack "${tempDir}" "${asarPath}" --unpack "${unpackGlob}"`, { stdio: "pipe" });

    console.log("[afterPack] Done.");
  } finally {
    // Always clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
};
