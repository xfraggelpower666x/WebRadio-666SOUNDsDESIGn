const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Soundwave Studio optimized build pipeline...');

const distDir = path.join(__dirname, '../dist');
const packagedDir = path.join(distDir, 'SoundwaveStudio-win32-x64');
const zipPath = path.join(distDir, 'SoundwaveStudio-portable-win-x64.zip');

// 1. Execute electron-packager
console.log('📦 Running electron-packager...');
try {
  execSync('npx electron-packager . SoundwaveStudio --platform=win32 --arch=x64 --out=dist --overwrite --asar', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  console.error('❌ electron-packager failed:', error.message);
  process.exit(1);
}

// 2. Preserve Electron runtime resources. Do not strip locales or legal notices.
console.log('🛡️ Preserving Electron locales and third-party license notices...');
const localesDir = path.join(packagedDir, 'locales');
if (!fs.existsSync(localesDir)) { console.error('❌ Electron locales directory missing.'); process.exit(1); }
const localeCount = fs.readdirSync(localesDir).filter(f => f.endsWith('.pak')).length;
if (localeCount < 2) { console.error(`❌ Locale integrity gate failed: ${localeCount} locale pack(s).`); process.exit(1); }
console.log(`PASS Electron locale packs preserved: ${localeCount}`);
const licenseHtml = path.join(packagedDir, 'LICENSES.chromium.html');
if (!fs.existsSync(licenseHtml)) { console.error('❌ Chromium third-party license notice missing.'); process.exit(1); }
console.log('PASS Chromium license notice preserved.');

// 3. Compress folder into portable ZIP
console.log('🤐 Compressing packaged application to portable ZIP...');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

try {
  // Use PowerShell's Compress-Archive
  const psCommand = `powershell -Command "Compress-Archive -Path '${packagedDir}' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });
  console.log(`🎉 Optimization complete! Portable ZIP successfully generated.`);
  const stats = fs.statSync(zipPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📁 Final ZIP Size: ${sizeMb} MB`);
  const crypto = require('crypto');
  const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const manifestPath = path.join(distDir, 'RELEASE_ARTIFACT_SHA256SUMS.txt');
  const lines = [`${sha256(zipPath)}  ${path.basename(zipPath)}`];
  const exe = fs.readdirSync(packagedDir).find(n=>/\.exe$/i.test(n));
  if (exe) lines.push(`${sha256(path.join(packagedDir,exe))}  ${path.join(path.basename(packagedDir),exe)}`);
  fs.writeFileSync(manifestPath, lines.join('\n')+'\n', 'utf8');
  console.log(`PASS release SHA-256 manifest: ${manifestPath}`);
} catch (error) {
  console.error('❌ Compression failed:', error.message);
  process.exit(1);
}
