import fs from 'node:fs';
import path from 'node:path';

const dir = '/Users/imadev/Library/CloudStorage/OneDrive-Personal/Contabilidad/IIGG/Comprobantes/gastos de equipamiento/2026';
const csvPath = path.join(dir, 'gastos_siradig_2026.csv');

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');
const header = (lines[0] || '').split(',');
const archivoIdx = header.indexOf('archivo');
const proveedorIdx = header.indexOf('proveedor');

console.log('archivoIdx:', archivoIdx, 'proveedorIdx:', proveedorIdx);

const dirFiles = fs.readdirSync(dir);

const renames: { from: string; to: string }[] = [];

// Simple CSV line parser
function parseCSVLine(line: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const updatedLines: string[] = lines[0] ? [lines[0]] : [];

for (let i = 1; i < lines.length; i++) {
  const line = (lines[i] || '').trim();
  if (!line) continue;
  const cols = parseCSVLine(line);
  let archivo = cols[archivoIdx];
  const proveedor = cols[proveedorIdx];

  if (!archivo || !proveedor) {
    updatedLines.push(line);
    continue;
  }

  // Check if archivo or existing file in dir contains Escáner/Escaner
  // Normalize strings for unicode differences (NFC vs NFD)
  const normArchivo = archivo.normalize('NFD');
  
  // Find actual file in dir that matches archivo
  const foundFile = dirFiles.find(f => f.normalize('NFD') === normArchivo);
  
  if (foundFile && (foundFile.normalize('NFD').toLowerCase().includes('escáner') || foundFile.toLowerCase().includes('escaner'))) {
    // Sanitize proveedor for filename
    // Clean characters like / \ : * ? " < > |
    const safeProveedor = proveedor.replace(/[\/\\:\*\?"<>\|]/g, '-').trim();
    
    // Replace "Escáner" (or variant) with safeProveedor
    let newFilename = foundFile.normalize('NFD').replace(/Escáner/i, safeProveedor).replace(/Escaner/i, safeProveedor);
    newFilename = newFilename.normalize('NFC'); // normalize back

    renames.push({ from: foundFile, to: newFilename });
    
    // Update CSV column
    cols[archivoIdx] = newFilename;
    // Rebuild line
    // Any col with comma should be quoted
    const newLine = cols.map(c => c.includes(',') ? `"${c}"` : c).join(',');
    updatedLines.push(newLine);
  } else {
    updatedLines.push(line);
  }
}

console.log('Planned renames:');
for (const r of renames) {
  console.log(`"${r.from}" -> "${r.to}"`);
}

// Generate a bash script to perform the renames
const shCommands = ['#!/bin/bash', `cd "${dir}"`];
for (const r of renames) {
  shCommands.push(`mv "${r.from}" "${r.to}"`);
}
fs.writeFileSync('scripts/run_renames.sh', shCommands.join('\n'));
fs.chmodSync('scripts/run_renames.sh', 0o755);

// Write updated CSV
fs.writeFileSync(csvPath, updatedLines.join('\n') + '\n');
console.log('Updated CSV saved. run_renames.sh created.');
