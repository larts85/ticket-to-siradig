import { submitTicketToAFIP } from '../src/playwright/afip-bot';

const dummyTicket = {
  cuit: '30123456789',
  denominacion: 'Supermercado Central',
  fecha: '15/05/2026',
  tipoFactura: 'Factura B',
  puntoVenta: '0001',
  numeroComprobante: '00004321',
  montoTotal: '1250.50'
};

async function test() {
  console.log('Probando ejecución del bot...');
  try {
    const result = await submitTicketToAFIP(dummyTicket);
    console.log('Éxito:', result);
  } catch (error) {
    console.error('Fallo de ejecución:', error);
  }
}

test();
