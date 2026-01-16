/**
 * Build All Brands
 *
 * Automatically builds distributions for all available brands.
 * This script:
 * 1. Discovers all brand folders in public/
 * 2. For each brand:
 *    - Selects the brand
 *    - Runs the full build pipeline
 *    - Moves outputs to brand-specific folders
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const BRAND_SELECTION_FILE = path.join(ROOT_DIR, 'lib', 'brand-selection.json');
const DIST_ALL_BRANDS_DIR = path.join(ROOT_DIR, 'dist-all-brands');

// Get available brands from public/ subfolders
function getAvailableBrands() {
  const entries = fs.readdirSync(PUBLIC_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .filter(entry => {
      // Check if the folder contains a brand-features.json
      const brandFeaturesPath = path.join(PUBLIC_DIR, entry.name, 'brand-features.json');
      return fs.existsSync(brandFeaturesPath);
    })
    .map(entry => entry.name);
}

// Select a brand programmatically
function selectBrand(brandName) {
  const data = {
    brand: brandName,
    selectedAt: new Date().toISOString(),
  };
  fs.writeFileSync(BRAND_SELECTION_FILE, JSON.stringify(data, null, 2) + '\n');
}

// Move build outputs to brand-specific folder
function moveBuildOutputs(brandName) {
  const brandDistDir = path.join(DIST_ALL_BRANDS_DIR, brandName);

  // Create brand distribution directory
  if (!fs.existsSync(brandDistDir)) {
    fs.mkdirSync(brandDistDir, { recursive: true });
  }

  // Move dist-server
  const distServerSrc = path.join(ROOT_DIR, 'dist-server');
  const distServerDest = path.join(brandDistDir, 'dist-server');
  if (fs.existsSync(distServerSrc)) {
    if (fs.existsSync(distServerDest)) {
      fs.rmSync(distServerDest, { recursive: true, force: true });
    }
    fs.renameSync(distServerSrc, distServerDest);
    console.log(`  ✓ Moved dist-server to ${brandName}/`);
  }

  // Move dist-electron
  const distElectronSrc = path.join(ROOT_DIR, 'dist-electron');
  const distElectronDest = path.join(brandDistDir, 'dist-electron');
  if (fs.existsSync(distElectronSrc)) {
    if (fs.existsSync(distElectronDest)) {
      fs.rmSync(distElectronDest, { recursive: true, force: true });
    }
    fs.renameSync(distElectronSrc, distElectronDest);
    console.log(`  ✓ Moved dist-electron to ${brandName}/`);
  }
}

// Main function
async function main() {
  const brands = getAvailableBrands();

  console.log('');
  console.log('========================================');
  console.log('  Build All Brands');
  console.log('========================================');
  console.log('');
  console.log(`Found ${brands.length} brands: ${brands.join(', ')}`);
  console.log('');

  // Clean dist-all-brands directory
  if (fs.existsSync(DIST_ALL_BRANDS_DIR)) {
    console.log('Cleaning dist-all-brands directory...');
    fs.rmSync(DIST_ALL_BRANDS_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_ALL_BRANDS_DIR, { recursive: true });

  let successCount = 0;
  let failureCount = 0;
  const failures = [];

  // Build each brand
  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i];

    console.log('');
    console.log('========================================');
    console.log(`  Building ${brand} (${i + 1}/${brands.length})`);
    console.log('========================================');
    console.log('');

    try {
      // Select the brand
      console.log(`Selecting brand: ${brand}...`);
      selectBrand(brand);

      // Run build:all
      console.log('');
      console.log('Running build:all...');
      console.log('');

      execSync('npm run build:all', {
        stdio: 'inherit',
        cwd: ROOT_DIR
      });

      // Move outputs to brand-specific folder
      console.log('');
      console.log(`Moving build outputs to dist-all-brands/${brand}/...`);
      moveBuildOutputs(brand);

      successCount++;
      console.log('');
      console.log(`✓ ${brand} built successfully!`);

    } catch (error) {
      failureCount++;
      failures.push(brand);
      console.error('');
      console.error(`✗ ${brand} build failed:`, error.message);
    }
  }

  // Summary
  console.log('');
  console.log('========================================');
  console.log('  Build Summary');
  console.log('========================================');
  console.log(`  Total brands: ${brands.length}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failureCount}`);
  if (failures.length > 0) {
    console.log(`  Failed brands: ${failures.join(', ')}`);
  }
  console.log('========================================');
  console.log('');
  console.log(`All distributions saved to: ${DIST_ALL_BRANDS_DIR}`);
  console.log('');

  if (failureCount > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('');
  console.error('Fatal error:', error);
  process.exit(1);
});
