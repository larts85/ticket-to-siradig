import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const targetDir = '/Users/imadev/Library/CloudStorage/OneDrive-Personal/Contabilidad/IIGG/Comprobantes/gastos de equipamiento/2026';
const outputFile = path.join(process.cwd(), 'tickets_2026.csv');
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
  } catch (err) {
    console.error("Could not read cache:", err);
    return;
  }

  const csvHeaders = ['Archivo', 'Fecha', 'CUIT', 'Concepto/Denominacion', 'Comprobante', 'Monto'];
  const csvLines = [csvHeaders.join(',')];
  
  let processed = 0;
  let excluded = 0;

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) continue;

    const buffer = await fs.readFile(filePath);
    const base64Data = buffer.toString('base64');
    const hash = crypto.createHash('sha256').update(base64Data).digest('hex');
    
    const r = cache[hash];
    if (r) {
      const fecha = r.fechaCompra || r.fecha || '';
      const cuit = r.cuitEmisor || r.cuit || '';
      const concepto = r.concepto || r.denominacion || r.tipoFactura || '';
      const comprobante = r.numeroComprobante || '';
      const monto = r.montoTotal || '';
      const tipo = (r.tipoFactura || r.concepto || '').toLowerCase();

      if (tipo.includes('ticket cliente')) {
        excluded++;
        continue;
      }

      const line = [
        `"${path.basename(filePath)}"`,
        `"${fecha}"`,
        `"${cuit}"`,
        `"${concepto}"`,
        `"${comprobante}"`,
        `"${monto}"`
      ];
      csvLines.push(line.join(','));
      processed++;
    }
  }

  await fs.writeFile(outputFile, csvLines.join('\n'), 'utf-8');
  console.log(`Done! Added ${processed} tickets to CSV. Excluded ${excluded} tickets.`);
}

main().catch(console.error);
