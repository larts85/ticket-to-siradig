import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const targetDir = '/Users/imadev/Library/CloudStorage/OneDrive-Personal/Contabilidad/IIGG/Comprobantes/gastos de equipamiento/2026';
const cacheFile = path.join(process.cwd(), '.cache', 'gemini-responses.json');

async function main() {
  const files: string[] = [];
  
  async function scanDir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  await scanDir(targetDir);
  
  let cache: any = {};
  try {
    const cacheContent = await fs.readFile(cacheFile, 'utf-8');
    cache = JSON.parse(cacheContent);
  } catch (err) {}

  const scannerFiles = files.filter(f => {
    const name = path.basename(f).toLowerCase();
    return name.normalize('NFD').includes('escáner') || 
           name.normalize('NFC').includes('escáner') ||
           name.includes('escaner') ||
           name.includes('scanner');
  });

  const commands = ['#!/bin/bash'];

  for (const filePath of scannerFiles) {
    const buffer = await fs.readFile(filePath);
    const base64Data = buffer.toString('base64');
    const hash = crypto.createHash('sha256').update(base64Data).digest('hex');
    
    let denominacion = cache[hash]?.denominacion;

    if (denominacion) {
      const dir = path.dirname(filePath);
      const oldName = path.basename(filePath);
      const safeDenominacion = denominacion.replace(/[\/\?<>\\:\*\|":]/g, '').trim();
      
      let newName = oldName.replace(/Escáner/i, safeDenominacion);
      newName = newName.replace(/Escáner/i, safeDenominacion);
      newName = newName.replace(/escaner/i, safeDenominacion);
      newName = newName.replace(/scanner/i, safeDenominacion);
      
      const newPath = path.join(dir, newName);
      if (newPath !== filePath) {
        commands.push(`mv "${filePath}" "${newPath}"`);
      }
    }
  }
  await fs.writeFile('scripts/do-rename.sh', commands.join('\n'), 'utf-8');
  await fs.chmod('scripts/do-rename.sh', 0o755);
}
main().catch(console.error);
