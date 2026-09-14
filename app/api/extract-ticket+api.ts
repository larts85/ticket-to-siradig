import type { Endpoint } from 'one';
import { extractTicketData } from '../../src/services/gemini';

export const POST: Endpoint = async (req) => {
  try {
    const formData = (await req.formData()) as any;
    const file = formData.get('file') as File | null;
    const url = formData.get('url') as string | null;

    let mimeType = '';
    let base64Data = '';

    if (file && file.size > 0) {
      // Si se sube un archivo (imagen o PDF)
      const buffer = await file.arrayBuffer();
      base64Data = Buffer.from(buffer).toString('base64');
      mimeType = file.type || 'image/jpeg';
    } else if (url) {
      // Si se provee una URL
      const cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        throw new Error('La URL provista no es válida');
      }
      const response = await fetch(cleanUrl);
      if (!response.ok) {
        throw new Error('No se pudo descargar el comprobante de la URL provista (Error ' + response.status + ')');
      }
      const buffer = await response.arrayBuffer();
      base64Data = Buffer.from(buffer).toString('base64');
      mimeType = response.headers.get('content-type') || 'image/jpeg';
    } else {
      return Response.json({ error: 'Debes enviar un archivo (file) o una URL (url)' }, { status: 400 });
    }

    const extractedData = await extractTicketData(mimeType, base64Data);

    return Response.json({
      success: true,
      data: extractedData
    });
  } catch (error: any) {
    console.error('Error in /api/extract-ticket:', error);
    return Response.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
