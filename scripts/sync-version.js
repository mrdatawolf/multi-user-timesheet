const fs = require('fs');
const path = require('path');

console.log('Syncing version numbers...');

// Read root package.json
const rootPackagePath = path.join(__dirname, '..', 'package.json');
const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
const version = rootPackage.version;

console.log(`Root version: ${version}`);

// Update electron-app/package.json
const electronPackagePath = path.join(__dirname, '..', 'electron-app', 'package.json');
const electronPackage = JSON.parse(fs.readFileSync(electronPackagePath, 'utf8'));

if (electronPackage.version !== version) {
  console.log(`Updating electron-app version from ${electronPackage.version} to ${version}`);
  electronPackage.version = version;
  fs.writeFileSync(electronPackagePath, JSON.stringify(electronPackage, null, 2) + '\n');
  console.log('✓ Version synced successfully');
} else {
  console.log('✓ Versions already in sync');
}
