import fs from 'node:fs/promises';
import path from 'node:path';
import { extractTicketData } from '../src/services/gemini';
import crypto from 'node:crypto';

const targetDir = '/Users/imadev/Library/CloudStorage/OneDrive-Personal/Contabilidad/IIGG/Comprobantes/gastos de equipamiento/2026';
const outputFile = path.join(process.cwd(), 'tickets_2026.csv');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function processFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  let mimeType = '';
  if (ext === '.pdf') mimeType = 'application/pdf';
  else if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else return null;

  const buffer = await fs.readFile(filePath);
  const base64Data = buffer.toString('base64');
  
  let retries = 5;
  while (retries > 0) {
    try {
      const data = await extractTicketData(mimeType, base64Data);
      return { file: path.basename(filePath), ...data };
    } catch (error: any) {
      if (error.message && (error.message.includes('429') || error.message.includes('503'))) {
        console.log(`API busy (${error.message.includes('429') ? '429' : '503'}). Retrying in 15 seconds... (retries left: ${retries})`);
        await sleep(15000);
        retries--;
      } else {
        console.error(`Error processing ${filePath}:`, error.message);
        return null;
      }
    }
  }
  return null;
}

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

  console.log(`Scanning ${targetDir}...`);
  await scanDir(targetDir);
  console.log(`Found ${files.length} files. Starting processing...`);

  const results = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) {
      console.log(`Processing ${file}...`);
      const data = await processFile(file);
      if (data) {
        results.push(data);
      }
      // Add delay only for non-cached files (we can't easily know here, but it's ok, delay is small)
      await sleep(1000);
    }
  }

  console.log(`Writing results to ${outputFile}...`);
  const csvHeaders = ['Archivo', 'Fecha', 'CUIT', 'Concepto/Denominacion', 'Comprobante', 'Monto'];
  const csvLines = [csvHeaders.join(',')];
  
  for (const r of results) {
    // Handling different keys that Gemini might have returned
    const fecha = r.fechaCompra || r.fecha || '';
    const cuit = r.cuitEmisor || r.cuit || '';
    const concepto = r.concepto || r.denominacion || r.tipoFactura || '';
    const comprobante = r.numeroComprobante || '';
    const monto = r.montoTotal || '';
    const tipo = (r.tipoFactura || r.concepto || '').toLowerCase();

    if (tipo.includes('ticket cliente')) {
      console.log(`Excluyendo ${r.file} (es Ticket Cliente)`);
      continue;
    }

    const line = [
      `"${r.file}"`,
      `"${fecha}"`,
      `"${cuit}"`,
      `"${concepto}"`,
      `"${comprobante}"`,
      `"${monto}"`
    ];
    csvLines.push(line.join(','));
  }

  await fs.writeFile(outputFile, csvLines.join('\n'), 'utf-8');
  console.log('Done!');
}

main().catch(console.error);
