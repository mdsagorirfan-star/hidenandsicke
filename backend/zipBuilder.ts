import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

function addFileIfExists(zip: JSZip, fsPath: string, zipPath: string) {
  if (fs.existsSync(fsPath) && fs.statSync(fsPath).isFile()) {
    zip.file(zipPath, fs.readFileSync(fsPath));
  }
}

function addDirRecursive(zip: JSZip, fsDir: string, zipDir: string) {
  if (!fs.existsSync(fsDir)) return;
  for (const entry of fs.readdirSync(fsDir, { withFileTypes: true })) {
    const full = path.join(fsDir, entry.name);
    const target = `${zipDir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      addDirRecursive(zip, full, target);
    } else {
      zip.file(target, fs.readFileSync(full));
    }
  }
}

export async function buildHideverseZipBuffer(rootDir: string): Promise<Buffer> {
  const zip = new JSZip();

  // Map workspace directories into the requested /hideverse organized bundle
  addDirRecursive(zip, path.join(rootDir, 'src'), 'hideverse/frontend/src');
  addFileIfExists(zip, path.join(rootDir, 'index.html'), 'hideverse/frontend/index.html');
  addFileIfExists(zip, path.join(rootDir, 'vite.config.ts'), 'hideverse/frontend/vite.config.ts');
  addFileIfExists(zip, path.join(rootDir, 'tsconfig.json'), 'hideverse/frontend/tsconfig.json');

  addDirRecursive(zip, path.join(rootDir, 'src', 'game-engine'), 'hideverse/game-engine');
  addDirRecursive(zip, path.join(rootDir, 'backend'), 'hideverse/backend');
  addFileIfExists(zip, path.join(rootDir, 'server.ts'), 'hideverse/backend/server.ts');

  addDirRecursive(zip, path.join(rootDir, 'shared'), 'hideverse/shared');
  addDirRecursive(zip, path.join(rootDir, 'database'), 'hideverse/database');
  addDirRecursive(zip, path.join(rootDir, 'prisma'), 'hideverse/prisma');
  addDirRecursive(zip, path.join(rootDir, 'docker'), 'hideverse/docker');
  addDirRecursive(zip, path.join(rootDir, 'docs'), 'hideverse/docs');
  addDirRecursive(zip, path.join(rootDir, 'tests'), 'hideverse/tests');

  addFileIfExists(zip, path.join(rootDir, 'docker-compose.yml'), 'hideverse/docker-compose.yml');
  addFileIfExists(zip, path.join(rootDir, '.env.example'), 'hideverse/.env.example');
  addFileIfExists(zip, path.join(rootDir, 'package.json'), 'hideverse/package.json');
  addFileIfExists(zip, path.join(rootDir, 'README.md'), 'hideverse/README.md');
  addFileIfExists(zip, path.join(rootDir, 'firestore.rules'), 'hideverse/firestore.rules');
  addFileIfExists(zip, path.join(rootDir, 'firebase-blueprint.json'), 'hideverse/firebase-blueprint.json');

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
