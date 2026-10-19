import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const zipPath = path.join(distDir, 'focustube-v1.0.0.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Files and folders to include
const itemsToInclude = [
  'manifest.json',
  'icons',
  'src/popup/popup.html',
  'src/popup/popup.css',
  'src/popup/popup.bundle.js',
  'src/options/options.html',
  'src/options/options.css',
  'src/options/options.bundle.js',
  'src/background/service-worker.bundle.js',
  'src/content/content.bundle.js'
];

// Verify all files exist
for (const item of itemsToInclude) {
  if (!fs.existsSync(path.resolve(item))) {
    console.error(`Missing required build item: ${item}`);
    process.exit(1);
  }
}

// Stage files into dist/extension
const stageDir = path.join(distDir, 'extension');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

for (const item of itemsToInclude) {
  copyRecursive(path.resolve(item), path.join(stageDir, item));
}

// Zip stageDir to zipPath using PowerShell on Windows
try {
  const psCommand = `powershell -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });
  console.log(`Successfully created Chrome Web Store zip: ${zipPath}`);
} catch (err) {
  console.error('Failed to create zip package:', err);
  process.exit(1);
}
