export interface ParsedTicket {
  cuit: string;
  denominacion: string;
  fecha: string;
  tipoFactura: string;
  puntoVenta: string;
  numeroComprobante: string;
  montoTotal: string | number;
  concepto?: string;
  cargado?: string;
  status?: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string;
}

/**
 * Parsea una línea de CSV respetando comillas.
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parsea el contenido completo de un CSV y lo convierte en lista de tickets para AFIP.
 */
export function parseCSVToTickets(csvContent: string): { tickets: ParsedTicket[]; skippedCount: number; duplicateCount: number } {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { tickets: [], skippedCount: 0, duplicateCount: 0 };

  const headerLine = lines[0]!;
  const rawHeaders = parseCSVLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Búsqueda flexible de encabezados
  const findIdx = (keywords: string[]) =>
    rawHeaders.findIndex(h => keywords.some(k => h.includes(k)));

  const archivoIdx = findIdx(['archivo', 'file']);
  const fechaIdx = findIdx(['fecha', 'date']);
  const cuitIdx = findIdx(['cuit', 'taxid', 'doc']);
  const denomIdx = findIdx(['proveedor', 'denominacion', 'razonsocial', 'razon', 'nombre', 'vendor']);
  const conceptoIdx = findIdx(['concepto', 'rubro', 'categoria']);
  const compIdx = findIdx(['comprobante', 'numero', 'nro', 'invoice', 'factura']);
  const pvIdx = findIdx(['puntoventa', 'pv', 'ptovta']);
  const tipoIdx = findIdx(['tipocomprobante', 'tipofactura', 'tipo', 'letra']);
  const montoIdx = findIdx(['monto', 'importe', 'total', 'amount', 'precio']);
  const cargadoIdx = findIdx(['cargado', 'subido', 'exitoso', 'estado', 'status']);

  const tickets: ParsedTicket[] = [];
  const seenKeys = new Set<string>();
  let skippedCount = 0;
  let duplicateCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const cols = parseCSVLine(line);
    if (cols.length === 0) continue;

    const rawCuit = (cuitIdx >= 0 ? cols[cuitIdx] : '') || '';
    const cleanCuit = rawCuit.replace(/\D/g, '');

    // Omitir filas sin CUIT válido (al menos 10 u 11 dígitos)
    if (!cleanCuit || cleanCuit.length < 10) {
      skippedCount++;
      continue;
    }

    const rawFecha = (fechaIdx >= 0 ? cols[fechaIdx] : '') || '';
    // Priorizar proveedor / razón social sobre concepto genérico
    const rawDenom = (denomIdx >= 0 ? cols[denomIdx] : (conceptoIdx >= 0 ? cols[conceptoIdx] : '')) || '';
    const rawConcepto = (conceptoIdx >= 0 ? cols[conceptoIdx] : '') || '';
    const rawComp = (compIdx >= 0 ? cols[compIdx] : '') || '';
    const rawPv = (pvIdx >= 0 ? cols[pvIdx] : '') || '';
    const rawTipo = (tipoIdx >= 0 ? cols[tipoIdx] : '') || '';
    const rawMonto = (montoIdx >= 0 ? cols[montoIdx] : '') || '';
    const rawArchivo = (archivoIdx >= 0 ? cols[archivoIdx] : '') || '';
    const rawCargado = (cargadoIdx >= 0 ? cols[cargadoIdx] : '') || '';

    // Separar Punto de Venta y Número si vienen unidos con guion (ej. "0020-00071199")
    let puntoVenta = rawPv;
    let numeroComprobante = rawComp;
    if (!puntoVenta && rawComp.includes('-')) {
      const parts = rawComp.split('-');
      puntoVenta = parts[0]?.trim() || '';
      numeroComprobante = parts[1]?.trim() || '';
    }

    // Si el punto de venta es 00000 o vacío, normalizar al punto de venta 00001 (requerido por AFIP)
    if (!puntoVenta || puntoVenta.replace(/^0+/, '') === '') {
      puntoVenta = '00001';
    }

    // Determinar tipoFactura respetando el valor real del CSV
    let tipoFactura = rawTipo.trim();
    if (tipoFactura) {
      const lower = tipoFactura.toLowerCase();
      if (lower.includes('factura c') || lower.includes('cód. 011') || lower.includes('cod. 011') || lower.includes('cód. 11') || lower.includes('cod. 11')) tipoFactura = 'Factura C';
      else if (lower.includes('recibo c')) tipoFactura = 'Recibo C';
      else if (lower.includes('factura a') || lower.includes('cód. 001') || lower.includes('cod. 001') || lower.includes('cód. 1') || lower.includes('cod. 1')) tipoFactura = 'Factura A';
      else if (lower.includes('recibo a')) tipoFactura = 'Recibo A';
      else if (lower.includes('recibo b')) tipoFactura = 'Recibo B';
      else if (lower.includes('recibo')) tipoFactura = 'Recibo';
      else if (lower.includes('factura b') || lower.includes('cód. 006') || lower.includes('cod. 006') || lower.includes('cód. 6') || lower.includes('cod. 6') || lower.includes('cód. 06') || lower.includes('cod. 06')) tipoFactura = 'Factura B';
      else if (lower.includes('tique') || lower.includes('ticket')) tipoFactura = 'Factura B';
      else if (lower.includes('nota de venta') || lower.includes('comprobante de venta') || lower.includes('pedido')) tipoFactura = 'Factura B';
      else if (lower === 'factura' || lower.includes('factura original')) tipoFactura = 'Factura B';
      else tipoFactura = 'Factura B';
    } else {
      const combinedText = `${rawArchivo} ${rawDenom}`.toLowerCase();
      if (combinedText.includes('factura a') || combinedText.includes('factura_a')) {
        tipoFactura = 'Factura A';
      } else if (combinedText.includes('factura c') || combinedText.includes('factura_c')) {
        tipoFactura = 'Factura C';
      } else if (combinedText.includes('recibo c') || combinedText.includes('recibo_c')) {
        tipoFactura = 'Recibo C';
      } else if (combinedText.includes('recibo')) {
        tipoFactura = 'Recibo';
      } else {
        tipoFactura = 'Factura B';
      }
    }

    // Normalizar Monto
    let montoTotal: string | number = rawMonto;
    const cleanMonto = rawMonto.replace(/\$/g, '').trim();
    if (cleanMonto) {
      const num = parseFloat(cleanMonto.replace(',', '.'));
      if (!isNaN(num)) {
        montoTotal = num;
      }
    }

    // Omitir comprobante si es un duplicado exacto dentro del mismo CSV
    const dedupeKey = `${cleanCuit}_${puntoVenta.replace(/^0+/, '')}_${numeroComprobante.replace(/^0+/, '')}_${montoTotal}`;
    if (seenKeys.has(dedupeKey)) {
      duplicateCount++;
      continue;
    }
    seenKeys.add(dedupeKey);

    const isAlreadyLoaded = /^(si|sí|true|1|cargado|exitoso)$/i.test(rawCargado.trim());
    const cargado = isAlreadyLoaded ? 'SI' : 'NO';

    tickets.push({
      cuit: cleanCuit,
      denominacion: rawDenom || 'Proveedor',
      fecha: rawFecha,
      tipoFactura,
      puntoVenta,
      numeroComprobante,
      montoTotal,
      concepto: rawConcepto,
      cargado,
      status: isAlreadyLoaded ? 'success' : 'idle',
    });
  }

  return { tickets, skippedCount, duplicateCount };
}

/**
 * Convierte una lista de tickets a formato CSV con la columna Cargado actualizada.
 */
export function exportTicketsToCSV(tickets: ParsedTicket[]): string {
  const headers = ['Archivo', 'Fecha', 'CUIT', 'Concepto/Denominacion', 'Tipo', 'PuntoVenta', 'Comprobante', 'Monto', 'Cargado'];
  const lines = [headers.join(',')];

  for (const t of tickets) {
    const isLoaded = t.status === 'success' || t.cargado === 'SI';
    const line = [
      `""`,
      `"${t.fecha || ''}"`,
      `"${t.cuit || ''}"`,
      `"${t.denominacion || ''}"`,
      `"${t.tipoFactura || ''}"`,
      `"${t.puntoVenta || ''}"`,
      `"${t.numeroComprobante || ''}"`,
      `"${t.montoTotal || ''}"`,
      `"${isLoaded ? 'SI' : 'NO'}"`
    ];
    lines.push(line.join(','));
  }

  return lines.join('\n');
}
