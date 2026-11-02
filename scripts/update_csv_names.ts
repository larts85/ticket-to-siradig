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

const updatedLines: string[] = [lines[0] || ''];

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

  const normArchivo = archivo.normalize('NFD');
  if (normArchivo.toLowerCase().includes('escáner') || normArchivo.toLowerCase().includes('escaner')) {
    const safeProveedor = proveedor.replace(/[\/\\:\*\?"<>\|]/g, '-').trim();
    let newFilename = normArchivo.replace(/Escáner/i, safeProveedor).replace(/Escaner/i, safeProveedor).normalize('NFC');
    cols[archivoIdx] = newFilename;
    const newLine = cols.map(c => (c.includes(',') || c.includes('"')) ? `"${c.replace(/"/g, '""')}"` : c).join(',');
    updatedLines.push(newLine);
  } else {
    updatedLines.push(line);
  }
}

fs.writeFileSync('/tmp/updated_gastos_siradig_2026.csv', updatedLines.join('\n') + '\n');
