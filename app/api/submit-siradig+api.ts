import type { Endpoint } from 'one';
import { submitTicketsToAFIP } from '../../src/playwright/afip-bot';
import type { TicketData, ProgressEvent } from '../../src/playwright/afip-bot';

export const POST: Endpoint = async (req: any) => {
  try {
    const body = await req.json();
    
    // Normalizar para soportar tanto un ticket individual como un array de tickets
    const tickets: TicketData[] = Array.isArray(body) ? body : (body ? [body] : []);
    
    if (tickets.length === 0 || !tickets[0]?.cuit) {
      return Response.json({ error: 'Faltan datos de tickets válidos' }, { status: 400 });
    }

    console.log(`[API Submit] Procesando petición para enviar ${tickets.length} tickets a AFIP con streaming en tiempo real.`);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: ProgressEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {}
        };

        try {
          const result = await submitTicketsToAFIP(
            tickets,
            (event) => send(event),
            req.signal
          );
          send({
            type: 'done',
            message: result.message,
            percent: 100,
            results: result.results
          });
        } catch (err: any) {
          send({
            type: 'error',
            message: err.message || 'Error en la ejecución del bot de AFIP',
            error: err.message
          });
        } finally {
          try {
            controller.close();
          } catch (e) {}
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  } catch (error: any) {
    console.error('Error en /api/submit-siradig:', error);
    return Response.json({ error: error.message || 'Error interno del servidor al ejecutar el bot' }, { status: 500 });
  }
};

