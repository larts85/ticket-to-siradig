import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { extractTicketData } from '../src/services/gemini';

const targetDir = '/Users/imadev/Library/CloudStorage/OneDrive-Personal/Contabilidad/IIGG/Comprobantes/gastos de equipamiento/2026';
const cacheFile = path.join(process.cwd(), '.cache', 'gemini-responses.json');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  
  // Read cache
  let cache: any = {};
  try {
    const cacheContent = await fs.readFile(cacheFile, 'utf-8');
    cache = JSON.parse(cacheContent);
  } catch (err) {
    console.error("Could not read cache:", err);
  }

  const scannerFiles = files.filter(f => {
    const name = path.basename(f).toLowerCase();
    // macOS might use decomposed characters (NFD) for á, so we normalize
    return name.normalize('NFD').includes('escáner') || 
           name.normalize('NFC').includes('escáner') ||
           name.includes('escaner') ||
           name.includes('scanner');
  });

  console.log(`Found ${scannerFiles.length} scanner files.`);

  for (const filePath of scannerFiles) {
    const buffer = await fs.readFile(filePath);
    const base64Data = buffer.toString('base64');
    const hash = crypto.createHash('sha256').update(base64Data).digest('hex');
    
    let denominacion = cache[hash]?.denominacion;
    
    if (!denominacion) {
      console.log(`Hash not in cache for ${path.basename(filePath)}. Requesting from Gemini...`);
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = '';
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      
      if (mimeType) {
        let retries = 3;
        while(retries > 0) {
          try {
            const data = await extractTicketData(mimeType, base64Data);
            denominacion = data?.denominacion;
            break;
          } catch(e: any) {
             console.log("Error:", e.message);
             await sleep(5000);
             retries--;
          }
        }
      }
    }

    if (denominacion) {
      const dir = path.dirname(filePath);
      const oldName = path.basename(filePath);
      // Clean denominacion for filesystem
      const safeDenominacion = denominacion.replace(/[\/\?<>\\:\*\|":]/g, '').trim();
      
      // Replace Escáner / Escáner / scanner with the safe denominacion
      let newName = oldName.replace(/Escáner/i, safeDenominacion);
      newName = newName.replace(/Escáner/i, safeDenominacion);
      newName = newName.replace(/escaner/i, safeDenominacion);
      newName = newName.replace(/scanner/i, safeDenominacion);
      
      const newPath = path.join(dir, newName);
      
      if (newPath !== filePath) {
        console.log(`Renaming: '${oldName}' -> '${newName}'`);
        await fs.rename(filePath, newPath);
      }
    } else {
      console.log(`Could not get denominacion for ${path.basename(filePath)}`);
    }
  }
}

main().catch(console.error);
