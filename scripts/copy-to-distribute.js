/**
 * Copy to Distribute
 *
 * Copies the built exe to the distribute/ folder with a brand-specific name.
 * Used as the final step of build:all to collect distribution artifacts.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_ELECTRON_DIR = path.join(ROOT_DIR, 'dist-electron');
const DISTRIBUTE_DIR = path.join(ROOT_DIR, 'distribute');
const BRAND_SELECTION_FILE = path.join(ROOT_DIR, 'lib', 'brand-selection.json');

// Get current brand from selection file
function getCurrentBrand() {
  try {
    const data = JSON.parse(fs.readFileSync(BRAND_SELECTION_FILE, 'utf8'));
    return data.brand || 'Default';
  } catch {
    return 'Default';
  }
}

// Get package version
function getPackageVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  return packageJson.version;
}

// Main function
function main() {
  const brand = getCurrentBrand();
  const version = getPackageVersion();

  console.log('');
  console.log('========================================');
  console.log('  Copy to Distribute');
  console.log('========================================');
  console.log(`  Brand: ${brand}`);
  console.log(`  Version: ${version}`);
  console.log('');

  if (!fs.existsSync(DIST_ELECTRON_DIR)) {
    console.log('⚠ dist-electron not found, nothing to copy');
    return;
  }

  // Find the Setup exe file
  const files = fs.readdirSync(DIST_ELECTRON_DIR);
  const setupExe = files.find(f => f.endsWith('.exe') && f.includes('Setup'));

  if (!setupExe) {
    console.log('⚠ No Setup exe found in dist-electron');
    return;
  }

  // Create distribute directory if needed
  if (!fs.existsSync(DISTRIBUTE_DIR)) {
    fs.mkdirSync(DISTRIBUTE_DIR, { recursive: true });
  }

  const srcPath = path.join(DIST_ELECTRON_DIR, setupExe);
  const destFileName = `Attendance-Management-${brand}-${version}-Setup.exe`;
  const destPath = path.join(DISTRIBUTE_DIR, destFileName);

  fs.copyFileSync(srcPath, destPath);
  console.log(`✓ Copied: ${destFileName}`);
  console.log(`  → ${DISTRIBUTE_DIR}`);
  console.log('');
}

main();
