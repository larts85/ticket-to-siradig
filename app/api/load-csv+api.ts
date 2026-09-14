import type { Endpoint } from 'one';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseCSVToTickets } from '../../src/helpers/csv-parser';
import type { ParsedTicket } from '../../src/helpers/csv-parser';

async function enrichWithCache(tickets: ParsedTicket[]) {
  try {
    const cachePath = path.join(process.cwd(), '.cache', 'gemini-responses.json');
    const raw = await fs.readFile(cachePath, 'utf-8');
    const cache = JSON.parse(raw);
    const cacheList: any[] = Object.values(cache);

    for (const t of tickets) {
      const cleanCuit = t.cuit.replace(/\D/g, '');
      const cleanMonto = typeof t.montoTotal === 'number' ? t.montoTotal : parseFloat(String(t.montoTotal).replace(',', '.'));

      const cached = cacheList.find((c: any) => {
        if (!c || !c.cuit) return false;
        const cCuit = String(c.cuit).replace(/\D/g, '');
        if (cCuit !== cleanCuit) return false;

        const cMonto = typeof c.montoTotal === 'number' ? c.montoTotal : parseFloat(String(c.montoTotal).replace(',', '.'));
        const montoMatch = !isNaN(cleanMonto) && !isNaN(cMonto) && Math.abs(cleanMonto - cMonto) < 0.5;

        const cNro = String(c.numeroComprobante || '').replace(/\D/g, '');
        const tNro = String(t.numeroComprobante || '').replace(/\D/g, '');
        const nroMatch = cNro && tNro && (cNro.includes(tNro) || tNro.includes(cNro));

        return montoMatch || nroMatch;
      });

      if (cached) {
        if (cached.tipoFactura) {
          t.tipoFactura = cached.tipoFactura;
        }
        if (cached.puntoVenta && (!t.puntoVenta || t.puntoVenta === '')) {
          t.puntoVenta = String(cached.puntoVenta).padStart(4, '0');
        }
      }
    }
  } catch {
    // Si no existe la caché, continuar con los datos del CSV
  }
}

export const GET: Endpoint = async () => {
  try {
    const csvPath = path.join(process.cwd(), 'tickets_2026.csv');
    const content = await fs.readFile(csvPath, 'utf-8');
    const { tickets, skippedCount } = parseCSVToTickets(content);

    await enrichWithCache(tickets);

    return Response.json({
      success: true,
      count: tickets.length,
      skippedCount,
      filename: 'tickets_2026.csv',
      data: tickets
    });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message || 'Error al leer tickets_2026.csv' }, { status: 500 });
  }
};

export const POST: Endpoint = async (req) => {
  try {
    let csvContent = '';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = (await req.formData()) as any;
      const file = formData.get('file') as File | null;
      if (!file) {
        return Response.json({ success: false, error: 'No se envió ningún archivo' }, { status: 400 });
      }
      csvContent = await file.text();
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      csvContent = body.csvContent || '';
    } else {
      csvContent = await req.text();
    }

    if (!csvContent.trim()) {
      return Response.json({ success: false, error: 'El contenido del CSV está vacío' }, { status: 400 });
    }

    const { tickets, skippedCount } = parseCSVToTickets(csvContent);
    await enrichWithCache(tickets);

    return Response.json({
      success: true,
      count: tickets.length,
      skippedCount,
      data: tickets
    });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message || 'Error al procesar el archivo CSV' }, { status: 500 });
  }
};

export const PUT: Endpoint = async (req) => {
  try {
    const body = await req.json();
    const { tickets, cuit, numeroComprobante, puntoVenta, cargado, all } = body;
    const csvPath = path.join(process.cwd(), 'tickets_2026.csv');
    const content = await fs.readFile(csvPath, 'utf-8').catch(() => '');
    if (!content) {
      return Response.json({ success: false, error: 'No se encontró tickets_2026.csv' }, { status: 404 });
    }

    const lines = content.split('\n');
    if (lines.length <= 1) {
      return Response.json({ success: false, error: 'CSV vacío' }, { status: 400 });
    }

    const { parseCSVLine } = await import('../../src/helpers/csv-parser');
    const header = parseCSVLine(lines[0] || '').map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const cuitIdx = header.findIndex(h => ['cuit', 'taxid', 'doc'].some(k => h.includes(k)));
    const compIdx = header.findIndex(h => ['comprobante', 'numero', 'nro', 'invoice', 'factura'].some(k => h.includes(k)));
    const pvIdx = header.findIndex(h => ['puntoventa', 'pv', 'ptovta'].some(k => h.includes(k)));
    let cargadoIdx = header.findIndex(h => ['cargado', 'subido', 'exitoso', 'estado', 'status'].some(k => h.includes(k)));

    let headerUpdated = false;
    if (cargadoIdx < 0) {
      lines[0] = `${lines[0]},cargado`;
      cargadoIdx = header.length;
      headerUpdated = true;
    }

    if (all && cargado) {
      const newLines = lines.map((line, idx) => {
        if (idx === 0 || !line.trim()) return line;
        const cols = parseCSVLine(line);
        if (cargadoIdx < cols.length) {
          cols[cargadoIdx] = cargado;
        } else {
          cols.push(cargado);
        }
        return cols.map(c => (c.includes(',') || c.includes('"')) ? `"${c.replace(/"/g, '""')}"` : c).join(',');
      });
      await fs.writeFile(csvPath, newLines.join('\n'), 'utf-8');
      return Response.json({ success: true, updated: 'all', cargado });
    }

    if (cuit && (numeroComprobante || body.nro)) {
      const cleanCuit = String(cuit).replace(/\D/g, '');
      const cleanNro = String(numeroComprobante || body.nro).replace(/\D/g, '');
      const cleanPv = puntoVenta ? String(puntoVenta).replace(/\D/g, '') : '';
      const newStatus = cargado === 'SI' ? 'SI' : 'NO';

      const newLines = lines.map((line, idx) => {
        if (idx === 0 || !line.trim()) return line;
        const cols = parseCSVLine(line);
        const rowCuit = (cuitIdx >= 0 ? cols[cuitIdx] : '')?.replace(/\D/g, '') || '';
        let rowComp = (compIdx >= 0 ? cols[compIdx] : '') || '';
        let rowPv = (pvIdx >= 0 ? cols[pvIdx] : '')?.replace(/\D/g, '') || '';

        if (!rowPv && rowComp.includes('-')) {
          const parts = rowComp.split('-');
          rowPv = parts[0]?.replace(/\D/g, '') || '';
          rowComp = parts[1] || '';
        }
        const rowNro = rowComp.replace(/\D/g, '');

        const cuitMatch = rowCuit === cleanCuit;
        const nroMatch = rowNro.includes(cleanNro) || cleanNro.includes(rowNro) || (rowNro.replace(/^0+/, '') === cleanNro.replace(/^0+/, ''));
        const pvMatch = !cleanPv || !rowPv || rowPv.replace(/^0+/, '') === cleanPv.replace(/^0+/, '') || cleanPv === '1' || cleanPv === '00001';

        if (cuitMatch && nroMatch && pvMatch) {
          if (cargadoIdx < cols.length) {
            cols[cargadoIdx] = newStatus;
          } else {
            cols.push(newStatus);
          }
          return cols.map(c => (c.includes(',') || c.includes('"')) ? `"${c.replace(/"/g, '""')}"` : c).join(',');
        }

        if (headerUpdated && cols.length === header.length) {
          cols.push('NO');
          return cols.map(c => (c.includes(',') || c.includes('"')) ? `"${c.replace(/"/g, '""')}"` : c).join(',');
        }

        return line;
      });

      await fs.writeFile(csvPath, newLines.join('\n'), 'utf-8');
      return Response.json({ success: true, updated: 1, cargado: newStatus });
    }

    if (Array.isArray(tickets) && tickets.length > 0) {
      const { exportTicketsToCSV } = await import('../../src/helpers/csv-parser');
      const csvStr = exportTicketsToCSV(tickets);
      await fs.writeFile(csvPath, csvStr, 'utf-8');
      return Response.json({ success: true, count: tickets.length });
    }

    return Response.json({ success: false, error: 'Parámetros no válidos' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
};
