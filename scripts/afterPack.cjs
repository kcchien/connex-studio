/**
 * afterPack hook for electron-builder
 *
 * Workaround: pnpm list --prod --json --depth Infinity returns an incomplete
 * dependency tree, causing electron-builder to miss transitive dependencies.
 *
 * This hook extracts the asar after packing, scans every included package's
 * dependencies, copies any missing packages from the local node_modules, and
 * repacks the asar — recursively, until nothing is missing.
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * Collect all top-level package names inside a node_modules directory,
 * including scoped packages (@org/pkg).
 */
function getInstalledPackages(nmDir) {
  const pkgs = new Set();
  if (!fs.existsSync(nmDir)) return pkgs;

  for (const entry of fs.readdirSync(nmDir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(nmDir, entry);
    if (!fs.statSync(full).isDirectory()) continue;

    if (entry.startsWith("@")) {
      for (const sub of fs.readdirSync(full)) {
        pkgs.add(`${entry}/${sub}`);
      }
    } else {
      pkgs.add(entry);
    }
  }
  return pkgs;
}

/**
 * Read a package.json and return its production dependency names.
 */
function getDeps(pkgJsonPath) {
  if (!fs.existsSync(pkgJsonPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    return Object.keys(data.dependencies || {});
  } catch {
    return [];
  }
}

/**
 * Recursively find all missing transitive dependencies.
 * Returns a Set of package names that need to be copied.
 */
function findMissing(asarNm, localNm) {
  const allMissing = new Set();
  let changed = true;

  while (changed) {
    changed = false;
    const present = getInstalledPackages(asarNm);

    for (const pkg of present) {
      const deps = getDeps(path.join(asarNm, pkg, "package.json"));
      for (const dep of deps) {
        if (!present.has(dep) && !allMissing.has(dep)) {
          const localPath = path.join(localNm, dep);
          if (fs.existsSync(localPath)) {
            allMissing.add(dep);
            // Copy it so the next iteration can check ITS dependencies
            const destPath = path.join(asarNm, dep);
            fs.cpSync(localPath, destPath, { recursive: true });
            changed = true;
          }
        }
      }
    }
  }
  return allMissing;
}

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const platform = context.electronPlatformName;
  const productName = context.packager.appInfo.productFilename;

  // Determine resources directory (platform-specific)
  let resourcesDir;
  if (platform === "darwin") {
    resourcesDir = path.join(appOutDir, `${productName}.app`, "Contents", "Resources");
  } else {
    resourcesDir = path.join(appOutDir, "resources");
  }

  const asarPath = path.join(resourcesDir, "app.asar");
  const unpackedPath = path.join(resourcesDir, "app.asar.unpacked");

  if (!fs.existsSync(asarPath)) {
    console.log("[afterPack] No asar found, skipping dependency check.");
    return;
  }

  const tempDir = path.join(resourcesDir, "__asar_fix_tmp");
  const localNm = path.join(context.packager.projectDir, "node_modules");

  console.log("[afterPack] Extracting asar to check dependencies...");
  execSync(`npx asar extract "${asarPath}" "${tempDir}"`, { stdio: "pipe" });

  const asarNm = path.join(tempDir, "node_modules");
  const beforeCount = getInstalledPackages(asarNm).size;

  const missing = findMissing(asarNm, localNm);

  if (missing.size === 0) {
    console.log(`[afterPack] All dependencies present (${beforeCount} packages). No fix needed.`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    return;
  }

  const afterCount = getInstalledPackages(asarNm).size;
  console.log(`[afterPack] Added ${missing.size} missing packages (${beforeCount} → ${afterCount}):`);
  for (const pkg of [...missing].sort()) {
    console.log(`  + ${pkg}`);
  }

  // Repack asar, preserving the unpack patterns for native modules
  console.log("[afterPack] Repacking asar...");
  fs.rmSync(asarPath, { force: true });

  // Preserve existing unpacked files if any
  const unpackGlob = "{**/*.node,**/better-sqlite3/**}";
  execSync(`npx asar pack "${tempDir}" "${asarPath}" --unpack "${unpackGlob}"`, { stdio: "pipe" });

  // If there was an existing unpacked dir, merge our new native files
  if (fs.existsSync(unpackedPath)) {
    // asar pack --unpack creates a new .unpacked dir; electron-builder already made one
    // The new one from asar pack takes precedence
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log("[afterPack] Done. Asar repacked with complete dependencies.");
};
