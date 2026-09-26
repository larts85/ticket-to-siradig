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

const dirFiles = fs.readdirSync(dir);
console.log("Matching files starting with pdf_ on disk:");
const pdfFilesOnDisk = dirFiles.filter(f => f.startsWith('pdf_'));
console.log(pdfFilesOnDisk);

const matches: { archivo: string; proveedor: string; newName: string }[] = [];

for (let i = 1; i < lines.length; i++) {
  const line = (lines[i] || '').trim();
  if (!line) continue;
  const cols = parseCSVLine(line);
  const archivo = cols[archivoIdx];
  const proveedor = cols[proveedorIdx];

  if (archivo && archivo.startsWith('pdf_') && proveedor) {
    const safeProveedor = proveedor.replace(/[\/\\:\*\?"<>\|]/g, '-').trim();
    // Replacing "pdf_" with `${safeProveedor} - `
    const newName = `${safeProveedor} - ${archivo.slice(4)}`;
    matches.push({ archivo, proveedor, newName });
  }
}

console.log("\nMatches from CSV:");
console.log(JSON.stringify(matches, null, 2));

const missingFromCSV = pdfFilesOnDisk.filter(f => !matches.some(m => m.archivo === f));
console.log("\nFiles on disk starting with pdf_ NOT in CSV:", missingFromCSV);
