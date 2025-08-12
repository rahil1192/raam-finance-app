#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Run with: node scripts/analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');

console.log('📊 Bundle Size Analysis');
console.log('========================\n');

// Check for key optimization files
const optimizationFiles = [
  'app.json',
  'eas.json', 
  'babel.config.js',
  'metro.config.js',
  'proguard-rules.pro'
];

console.log('🔍 Optimization Files Check:');
optimizationFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Check package.json for optimization dependencies
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const devDeps = packageJson.devDependencies || {};

console.log('\n📦 Optimization Dependencies:');
const optimizationDeps = [
  '@babel/plugin-transform-runtime'
];

optimizationDeps.forEach(dep => {
  const installed = devDeps[dep];
  console.log(`${installed ? '✅' : '❌'} ${dep}${installed ? ` (${installed})` : ''}`);
});

// Check app.json for Hermes and Proguard
const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));
const expo = appJson.expo;

console.log('\n⚙️  App Configuration:');
console.log(`✅ Hermes Engine: ${expo.jsEngine === 'hermes' ? 'Enabled' : 'Disabled'}`);
console.log(`✅ Proguard: ${expo.android?.enableProguardInReleaseBuilds ? 'Enabled' : 'Disabled'}`);
console.log(`✅ Resource Shrinking: ${expo.android?.enableShrinkResourcesInReleaseBuilds ? 'Enabled' : 'Disabled'}`);

// Check EAS config
const easJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'eas.json'), 'utf8'));

console.log('\n🚀 EAS Build Configuration:');
console.log(`✅ AAB Build Type: ${easJson.build.preview?.android?.buildType === 'app-bundle' ? 'Enabled' : 'Disabled'}`);
console.log(`✅ Build Profile: ${easJson.build.preview ? 'Preview' : 'Not configured'}`);
console.log(`✅ Production Profile: ${easJson.build.production ? 'Production' : 'Not configured'}`);

console.log('\n📈 Expected Size Reduction:');
console.log('• Hermes Engine: 20-30%');
console.log('• Proguard + Resource Shrinking: 10-20%');
console.log('• Tree Shaking: 5-15%');
console.log('• AAB Format: 5-10%');
console.log('• Total Expected: 40-75%');

console.log('\n🎯 Next Steps:');
console.log('1. Run: eas build --profile preview --platform android');
console.log('2. Compare APK/AAB sizes');
console.log('3. Monitor build performance');
console.log('4. Test app functionality after optimization'); 