/**
 * Build with Brand URI
 *
 * This script reads the brandURI from the selected brand's brand-features.json
 * and sets it as NEXT_PUBLIC_API_URL for the Next.js build process.
 *
 * This runs automatically when you run: npm run build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const BRAND_SELECTION_FILE = path.join(ROOT_DIR, 'lib', 'brand-selection.json');

// Get selected brand
function getSelectedBrand() {
  try {
    const data = JSON.parse(fs.readFileSync(BRAND_SELECTION_FILE, 'utf8'));
    if (!data.brand) {
      console.error('');
      console.error('Error: No brand selected!');
      console.error('Please run: npm run select-brand');
      console.error('');
      process.exit(1);
    }
    return data.brand;
  } catch (error) {
    console.error('');
    console.error('Error: Could not read brand selection file!');
    console.error('Please run: npm run select-brand');
    console.error('');
    process.exit(1);
  }
}

// Get brandURI from brand-features.json
function getBrandURI(brandName) {
  const brandFeaturesPath = path.join(ROOT_DIR, 'public', brandName, 'brand-features.json');

  try {
    const brandFeatures = JSON.parse(fs.readFileSync(brandFeaturesPath, 'utf8'));

    if (!brandFeatures.brandURI) {
      console.error('');
      console.error(`Error: brandURI not found in ${brandName}/brand-features.json`);
      console.error('Please add a brandURI field to the brand-features.json file.');
      console.error('Example: "brandURI": "http://127.0.0.1:6029"');
      console.error('');
      process.exit(1);
    }

    return brandFeatures.brandURI;
  } catch (error) {
    console.error('');
    console.error(`Error: Could not read brand-features.json for ${brandName}`);
    console.error(`Path: ${brandFeaturesPath}`);
    console.error('');
    process.exit(1);
  }
}

// Main function
function main() {
  const brandName = getSelectedBrand();
  const brandURI = getBrandURI(brandName);

  console.log('');
  console.log('========================================');
  console.log('  Building with Brand Configuration');
  console.log('========================================');
  console.log(`  Brand: ${brandName}`);
  console.log(`  Brand URI: ${brandURI}`);
  console.log('========================================');
  console.log('');

  // Set environment variable and run Next.js build
  const env = { ...process.env };
  env.NEXT_PUBLIC_API_URL = brandURI;

  console.log(`Setting NEXT_PUBLIC_API_URL=${brandURI}`);
  console.log('');
  console.log('Running Next.js build...');
  console.log('');

  try {
    execSync('next build', {
      env,
      stdio: 'inherit',
      cwd: ROOT_DIR
    });

    console.log('');
    console.log('========================================');
    console.log('  Build completed successfully!');
    console.log('========================================');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

main();
