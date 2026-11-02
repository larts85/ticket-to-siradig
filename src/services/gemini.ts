import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Directorio y ruta para el cache local
const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'gemini-responses.json');

// Inicializar archivo de cache si no existe
function getCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    if (!fs.existsSync(CACHE_FILE)) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify({}));
      return {};
    }
    const fileContent = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('[Cache] Error al leer caché:', error);
    return {};
  }
}

function setCache(hash: string, data: any) {
  try {
    const cache = getCache();
    cache[hash] = data;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('[Cache] Resultado guardado para el hash:', hash);
  } catch (error) {
    console.error('[Cache] Error al guardar en caché:', error);
  }
}

const extractionPrompt = `
Eres un asistente experto en extraer datos contables de tickets de compra o facturas en Argentina.
A continuación se te provee una imagen o documento de un ticket.
Extrae la siguiente información y devuélvela ESTRICTAMENTE en formato JSON, sin texto adicional (ni siquiera \`\`\`json):

{
  "cuit": "CUIT del emisor (sin guiones, solo los 11 números, ej: 30123456789)",
  "denominacion": "Razón social o nombre del emisor",
  "fecha": "Fecha del comprobante en formato DD/MM/AAAA",
  "tipoFactura": "Tipo de comprobante (ej: Factura A, Factura B, Factura C, Ticket, etc.)",
  "puntoVenta": "El punto de venta (los primeros 4 o 5 números antes del guión, ej: 00001)",
  "numeroComprobante": "El número de factura (los siguientes 8 números después del guión, ej: 00084210)",
  "montoTotal": "El monto total de la factura en formato numérico decimal (usando punto para decimales, sin símbolo $)"
}

Si no logras encontrar algún dato, envía null para ese campo. Asegúrate de devolver un JSON válido.
`;

export async function extractTicketData(mimeType: string, base64Data: string) {
  // 1. Calcular Hash SHA256 del contenido para la deduplicación
  const hash = crypto.createHash('sha256').update(base64Data).digest('hex');
  
  console.log(`[Gemini Service] Procesando comprobante con hash: ${hash}`);
  
  // 2. Verificar en el cache persistente local
  const cache = getCache();
  if (cache[hash]) {
    console.log('[Gemini Service] 🎯 HIT de Cache! Devolviendo resultado guardado sin llamar a la API.');
    return cache[hash];
  }

  console.log('[Gemini Service] 🌐 MISS de Cache. Solicitando análisis a Gemini AI...');

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada.');
  }

  // Usamos el modelo gemini-3.8-flash (la última versión)
  const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

  const result = await model.generateContent([
    extractionPrompt,
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    },
  ]);

  const responseText = result.response.text();
  
  try {
    // Limpiar posibles bloques de markdown en la respuesta
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedResult = JSON.parse(cleanJson);
    
    // Guardar en caché local para deduplicación futura
    setCache(hash, parsedResult);
    
    return parsedResult;
  } catch (error) {
    console.error("Error parseando respuesta de Gemini:", responseText);
    throw new Error('El modelo no devolvió un JSON válido');
  }
}
