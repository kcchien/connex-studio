/**
 * afterPack hook for electron-builder (v5 — strip mode)
 *
 * Vite bundles all JS dependencies into a single file.
 * electron-builder still copies the full node_modules tree (313+ packages).
 * This hook strips everything except native module runtime dependencies,
 * then updates the asar integrity hash so Electron's verification passes.
 */
const { execSync } = require("child_process");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

// Only these packages are needed at runtime (native module + its loader)
const KEEP = new Set([
  "better-sqlite3",   // native .node binary
  "bindings",         // locates .node files at runtime
  "file-uri-to-path", // dependency of bindings
]);

function countPackages(nmDir) {
  if (!fs.existsSync(nmDir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(nmDir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(nmDir, entry);
    if (!fs.statSync(full).isDirectory()) continue;
    if (entry.startsWith("@")) {
      try { count += fs.readdirSync(full).length; } catch { /* ignore unreadable scope dirs */ }
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Update ElectronAsarIntegrity in Info.plist (macOS) after repacking.
 * Without this, Electron silently refuses to load the asar.
 */
function updateAsarIntegrity(platform, appOutDir, productName, asarPath) {
  if (platform !== "darwin") {
    // On Windows/Linux, integrity is embedded differently.
    // electron-builder stores it in the executable resources.
    // For now, we'll handle macOS only.
    // TODO: handle Windows/Linux if needed
    return;
  }

  const hash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(asarPath))
    .digest("hex");

  const plistPath = path.join(
    appOutDir,
    `${productName}.app`,
    "Contents",
    "Info.plist"
  );

  if (!fs.existsSync(plistPath)) {
    console.log("[afterPack] Info.plist not found, skipping integrity update.");
    return;
  }

  // Read current plist
  const plistXml = fs.readFileSync(plistPath, "utf8");

  // Replace the hash value in ElectronAsarIntegrity
  // The plist XML structure:
  //   <key>ElectronAsarIntegrity</key>
  //   <dict>
  //     <key>Resources/app.asar</key>
  //     <dict>
  //       <key>algorithm</key><string>SHA256</string>
  //       <key>hash</key><string>OLD_HASH</string>
  //     </dict>
  //   </dict>
  const hashRegex = /(<key>hash<\/key>\s*<string>)[a-f0-9]{64}(<\/string>)/;
  if (!hashRegex.test(plistXml)) {
    console.log("[afterPack] Could not find asar hash in Info.plist.");
    return;
  }

  const updated = plistXml.replace(hashRegex, `$1${hash}$2`);
  fs.writeFileSync(plistPath, updated);
  console.log(`[afterPack] Updated asar integrity hash in Info.plist: ${hash.substring(0, 16)}...`);
}

exports.default = async function afterPack(context) {
  const platform = context.electronPlatformName;
  const productName = context.packager.appInfo.productFilename;
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

  const tempDir = path.join(resourcesDir, "__asar_strip_tmp");

  try {
    // 1. Extract asar
    console.log("[afterPack] Extracting asar to strip bundled deps...");
    execSync(`npx asar extract "${asarPath}" "${tempDir}"`, { stdio: "pipe" });
    const asarNm = path.join(tempDir, "node_modules");
    const beforeCount = countPackages(asarNm);

    if (!fs.existsSync(asarNm)) {
      console.log("[afterPack] No node_modules in asar, nothing to strip.");
      return;
    }

    // 2. Remove everything except KEEP list
    let removed = 0;
    for (const entry of fs.readdirSync(asarNm)) {
      const full = path.join(asarNm, entry);
      if (!fs.statSync(full).isDirectory()) continue;

      if (entry.startsWith("@")) {
        // Scoped package: check each sub-entry
        let allRemoved = true;
        for (const sub of fs.readdirSync(full)) {
          const scopedName = `${entry}/${sub}`;
          if (KEEP.has(scopedName)) {
            allRemoved = false;
          } else {
            fs.rmSync(path.join(full, sub), { recursive: true, force: true });
            removed++;
          }
        }
        if (allRemoved) {
          fs.rmSync(full, { recursive: true, force: true });
        }
      } else {
        if (!KEEP.has(entry)) {
          fs.rmSync(full, { recursive: true, force: true });
          removed++;
        }
      }
    }

    const afterCount = countPackages(asarNm);
    console.log(`[afterPack] node_modules: ${beforeCount} → ${afterCount} packages (removed ${removed})`);

    // 3. Repack
    console.log("[afterPack] Repacking asar...");
    fs.rmSync(asarPath, { force: true });
    execSync(
      `npx asar pack "${tempDir}" "${asarPath}" --unpack "{**/*.node,**/better-sqlite3/**}"`,
      { stdio: "pipe" }
    );

    // 4. Update asar integrity hash (critical for macOS)
    updateAsarIntegrity(platform, appOutDir, productName, asarPath);

    console.log("[afterPack] Done.");
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
};
