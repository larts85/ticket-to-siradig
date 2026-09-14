import { describe, expect, it } from 'bun:test';
import { parseCSVToTickets, exportTicketsToCSV } from './csv-parser';
import type { ParsedTicket } from './csv-parser';

describe('csv-parser', () => {
  it('correctly parses tickets with Cargado column', () => {
    const csvContent = `Archivo,Fecha,CUIT,Concepto/Denominacion,Tipo,PuntoVenta,Comprobante,Monto,Cargado
"ticket1.pdf","11/05/2026","30548083156","COTO CICSA","Factura B","02048","03070158","12435.98","SI"
"ticket2.pdf","04/05/2026","33712244629","COSENZA CONSTRUCCIONES","Factura B","00200","00031375","4500","NO"`;

    const result = parseCSVToTickets(csvContent);
    expect(result.tickets).toHaveLength(2);

    const t1 = result.tickets[0]!;
    expect(t1.cuit).toBe('30548083156');
    expect(t1.cargado).toBe('SI');
    expect(t1.status).toBe('success');

    const t2 = result.tickets[1]!;
    expect(t2.cuit).toBe('33712244629');
    expect(t2.cargado).toBe('NO');
    expect(t2.status).toBe('idle');
  });

  it('exports tickets to CSV including Cargado column', () => {
    const tickets: ParsedTicket[] = [
      {
        cuit: '30548083156',
        denominacion: 'COTO CICSA',
        fecha: '11/05/2026',
        tipoFactura: 'Factura B',
        puntoVenta: '02048',
        numeroComprobante: '03070158',
        montoTotal: '12435.98',
        cargado: 'SI',
        status: 'success'
      },
      {
        cuit: '33712244629',
        denominacion: 'COSENZA CONSTRUCCIONES',
        fecha: '04/05/2026',
        tipoFactura: 'Factura B',
        puntoVenta: '00200',
        numeroComprobante: '00031375',
        montoTotal: '4500',
        cargado: 'NO',
        status: 'idle'
      }
    ];

    const csv = exportTicketsToCSV(tickets);
    expect(csv).toContain('Archivo,Fecha,CUIT,Concepto/Denominacion,Tipo,PuntoVenta,Comprobante,Monto,Cargado');
    expect(csv).toContain('"SI"');
    expect(csv).toContain('"NO"');
  });

  it('correctly parses user CSV with fecha_compra, proveedor, and combined numero_comprobante', () => {
    const userCSV = `fecha_compra,cuit,concepto,numero_comprobante,monto,proveedor,cuit_con_guion,tipo_comprobante,archivo,observaciones
17/03/2026,,otros,07000-00086328,11370.00,Librería,,Nota de Venta,20260317_ESCOLARES.pdf,Sin CUIT
19/03/2026,30709857742,otros,00000-15111495,47500.00,CINCO OLIVOS S.A.,30-70985774-2,Ticket Cliente Mercado Pago,20260319_restau.pdf,Restaurante
09/05/2026,27356467308,otros,00004-00002726,19500.00,ABAL STEFANIA YANET,27-35646730-8,Factura C (Cód. 011),260510101418.pdf,3D PLA
21/03/2026,30715939262,indumentaria,00000-15140682,28550.00,LADANI SA,30-71593926-2,Factura B (Cód. 006),ladani.pdf,Ropa`;

    const res = parseCSVToTickets(userCSV);
    expect(res.skippedCount).toBe(1); // Row without CUIT skipped
    expect(res.tickets).toHaveLength(3);

    // Verificamos que toma el nombre del proveedor y normaliza punto de venta 00000 a 00001
    const t0 = res.tickets[0]!;
    expect(t0.denominacion).toBe('CINCO OLIVOS S.A.');
    expect(t0.puntoVenta).toBe('00001');
    expect(t0.numeroComprobante).toBe('15111495');
    expect(t0.tipoFactura).toBe('Factura B');
    expect(t0.concepto).toBe('otros');

    // Verificamos Factura C
    const t1 = res.tickets[1]!;
    expect(t1.denominacion).toBe('ABAL STEFANIA YANET');
    expect(t1.tipoFactura).toBe('Factura C');
    expect(t1.puntoVenta).toBe('00004');

    // Verificamos Indumentaria
    const t2 = res.tickets[2]!;
    expect(t2.concepto).toBe('indumentaria');
    expect(t2.denominacion).toBe('LADANI SA');
  });
});
