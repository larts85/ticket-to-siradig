import fs from 'node:fs';
import path from 'node:path';

const dir = '/Users/imadev/Library/CloudStorage/OneDrive-Personal/Contabilidad/IIGG/Comprobantes/gastos de equipamiento/2026';
const csvPath = path.join(dir, 'gastos_siradig_2026.csv');

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');
const header = (lines[0] || '').split(',');
const archivoIdx = header.indexOf('archivo');
const proveedorIdx = header.indexOf('proveedor');

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

const renames: { from: string; to: string }[] = [];
const updatedLines: string[] = [lines[0] || ''];

for (let i = 1; i < lines.length; i++) {
  const line = (lines[i] || '').trim();
  if (!line) continue;
  const cols = parseCSVLine(line);
  const archivo = cols[archivoIdx];
  const proveedor = cols[proveedorIdx];

  if (archivo && archivo.startsWith('pdf_') && proveedor) {
    const safeProveedor = proveedor.replace(/[\/\\:\*\?"<>\|]/g, '-').trim();
    const newFilename = `${safeProveedor} - ${archivo.slice(4)}`;
    renames.push({ from: archivo, to: newFilename });
    cols[archivoIdx] = newFilename;
    const newLine = cols.map(c => (c.includes(',') || c.includes('"')) ? `"${c.replace(/"/g, '""')}"` : c).join(',');
    updatedLines.push(newLine);
  } else {
    updatedLines.push(line);
  }
}

// Generate bash script
const shCommands = ['#!/bin/bash', `cd "${dir}"`];
for (const r of renames) {
  shCommands.push(`mv "${r.from}" "${r.to}"`);
}
fs.writeFileSync('scripts/run_pdf_renames.sh', shCommands.join('\n'));
fs.chmodSync('scripts/run_pdf_renames.sh', 0o755);

// Write updated CSV to /tmp
fs.writeFileSync('/tmp/updated_gastos_siradig_2026_pdf.csv', updatedLines.join('\n') + '\n');
console.log(`Generated run_pdf_renames.sh with ${renames.length} renames.`);
