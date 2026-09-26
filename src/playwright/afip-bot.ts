import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export interface TicketData {
  cuit: string;
  denominacion: string;
  fecha: string;
  tipoFactura: string;
  puntoVenta: string;
  numeroComprobante: string;
  montoTotal: string | number;
  concepto?: string;
}

// Utilidades de parsing y formateo
function parseDate(dateStr: string) {
  console.log('[Playwright Bot] Parseando fecha:', dateStr);
  let date: Date;
  
  if (!dateStr) {
    date = new Date();
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    // DD/MM/YYYY
    date = new Date(parseInt(parts[2] || '0', 10), parseInt(parts[1] || '1', 10) - 1, parseInt(parts[0] || '1', 10));
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) {
    date = new Date();
  }

  const day = String(date.getDate()).padStart(2, '0');
  const monthNum = String(date.getMonth() + 1);
  const month = monthNum.padStart(2, '0');
  const year = String(date.getFullYear());

  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  
  return {
    formatted: `${day}/${month}/${year}`,
    month,
    monthNum,
    monthName: meses[date.getMonth()] || 'Enero',
    year
  };
}

function normalizeInvoiceType(type: string): string {
  const clean = (type || '').trim().toUpperCase();
  // Comprobar letras específicas usando límites de palabra o patrones explícitos
  // para evitar que la 'C' de 'FACTURA' coincida erróneamente con Factura C
  if (/\bB\b/.test(clean) || clean.includes('FACTURA B') || clean.includes('TIPO B') || clean.endsWith(' B') || clean === 'B') {
    return 'Factura B';
  }
  if (/\bA\b/.test(clean) || clean.includes('FACTURA A') || clean.includes('TIPO A') || clean.endsWith(' A') || clean === 'A') {
    return 'Factura A';
  }
  if (/\bC\b/.test(clean) || clean.includes('FACTURA C') || clean.includes('TIPO C') || clean.endsWith(' C') || clean === 'C') {
    return 'Factura C';
  }
  if (/\bM\b/.test(clean) || clean.includes('FACTURA M') || clean === 'M') {
    return 'Factura M';
  }
  return 'Factura B'; // Por defecto
}

export interface TicketProcessingResult {
  cuit: string;
  nro?: string;
  success: boolean;
  message: string;
}

export interface ProgressEvent {
  type: 'step' | 'ticket_start' | 'ticket_success' | 'ticket_error' | 'done' | 'error';
  message: string;
  ticketIndex?: number;
  totalTickets?: number;
  percent?: number;
  error?: string;
  results?: TicketProcessingResult[];
}

export type OnProgressFn = (event: ProgressEvent) => void;

async function markTicketAsLoadedInCSV(cuit: string, nro: string, pv?: string) {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { parseCSVLine } = await import('../helpers/csv-parser');
    const csvPath = path.join(process.cwd(), 'tickets_2026.csv');
    const content = await fs.readFile(csvPath, 'utf-8').catch(() => '');
    if (!content) return;
    const lines = content.split('\n');
    if (lines.length <= 1) return;

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

    const cleanCuit = cuit.replace(/\D/g, '');
    const cleanNro = nro.replace(/\D/g, '');
    const cleanPv = pv ? pv.replace(/\D/g, '') : '';

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
          cols[cargadoIdx] = 'SI';
        } else {
          cols.push('SI');
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
    console.log(`[Playwright Bot] 💾 Marcado en tickets_2026.csv como Cargado="SI": CUIT ${cuit} (${nro})`);
  } catch (e: any) {
    console.error(`[Playwright Bot] Error al marcar en CSV: ${e.message}`);
  }
}

/**
 * Carga un listado de tickets a la web de AFIP/SIRADIG uno por uno en la misma sesión.
 */
export async function submitTicketsToAFIP(
  tickets: TicketData[],
  onProgress?: OnProgressFn,
  signal?: AbortSignal
) {
  console.log(`[Playwright Bot] 📝 Iniciando bot de carga para ${tickets.length} tickets.`);
  onProgress?.({
    type: 'step',
    message: `Iniciando bot para ${tickets.length} comprobante(s)...`,
    percent: 5,
  });
  
  if (tickets.length === 0) {
    return { success: true, hasErrors: false, results: [], message: 'No hay tickets para cargar.' };
  }

  let cuit = process.env.AFIP_CUIT;
  let password = process.env.AFIP_PASSWORD;

  // Fallback robusto de lectura del .env.development
  if (!cuit || !password) {
    try {
      console.log('[Playwright Bot] 📂 Buscando credenciales en .env.development físico...');
      const envPath = path.join(process.cwd(), '.env.development');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const cuitMatch = content.match(/AFIP_CUIT\s*=\s*(.+)/);
        const passMatch = content.match(/AFIP_PASSWORD\s*=\s*(.+)/);
        
        if (cuitMatch && cuitMatch[1]) cuit = cuitMatch[1].trim().replace(/['"]/g, '');
        if (passMatch && passMatch[1]) password = passMatch[1].trim().replace(/['"]/g, '');
      }
    } catch (e) {
      console.error('[Playwright Bot] Error leyendo el archivo .env.development:', e);
    }
  }

  if (!cuit || !password) {
    throw new Error('Faltan credenciales de AFIP (AFIP_CUIT o AFIP_PASSWORD) en las variables de entorno.');
  }

  console.log('[Playwright Bot] 🚀 Lanzando Chromium...');
  onProgress?.({ type: 'step', message: 'Iniciando navegador Chromium...', percent: 10 });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Escuchar si el usuario cancela la carga para cerrar el navegador inmediatamente
  if (signal) {
    signal.addEventListener('abort', () => {
      console.log('[Playwright Bot] 🛑 Carga abortada por el usuario. Cerrando navegador...');
      browser.close().catch(() => {});
    }, { once: true });
  }

  const results: TicketProcessingResult[] = [];

  try {
    if (signal?.aborted) throw new Error('Carga cancelada por el usuario');

    // 1. Ir al login de AFIP/ARCA
    console.log('[Playwright Bot] 🌐 Navegando a AFIP login...');
    onProgress?.({ type: 'step', message: 'Navegando al portal de ingreso de AFIP...', percent: 15 });
    await page.goto('https://auth.afip.gob.ar/contribuyente_/login.xhtml');

    if (signal?.aborted) throw new Error('Carga cancelada por el usuario');

    // 2. Ingresar CUIT
    console.log('[Playwright Bot] 👤 Ingresando CUIT...');
    onProgress?.({ type: 'step', message: 'Ingresando CUIT...', percent: 20 });
    const spin = page.getByRole('spinbutton');
    await spin.waitFor({ state: 'visible', timeout: 15000 });
    await spin.fill(cuit);
    await page.getByRole('button', { name: 'Siguiente' }).click();

    if (signal?.aborted) throw new Error('Carga cancelada por el usuario');

    // 3. Ingresar Contraseña
    console.log('[Playwright Bot] 🔑 Ingresando Clave Fiscal...');
    onProgress?.({ type: 'step', message: 'Ingresando Clave Fiscal...', percent: 25 });
    const passInput = page.getByRole('textbox', { name: 'TU CLAVE' });
    await passInput.waitFor({ state: 'visible', timeout: 15000 });
    await passInput.fill(password);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    if (signal?.aborted) throw new Error('Carga cancelada por el usuario');

    // 4. Esperar confirmación de sesión y abrir SIRADIG en popup
    console.log('[Playwright Bot] 🚪 Entrando al portal...');
    onProgress?.({ type: 'step', message: 'Autenticando y buscando acceso a SiRADIG...', percent: 30 });
    await page.waitForURL(/.*afip\.gob\.ar.*portal.*/i, { timeout: 20000 });
    console.log('[Playwright Bot] ✅ Sesión exitosa. Buscando botón de SiRADIG...');

    const page1Promise = page.waitForEvent('popup');
    await page.locator('a').filter({ hasText: 'SiRADIG - Trabajador' }).click();
    
    console.log('[Playwright Bot] 📑 Cambiando foco a la pestaña de SIRADIG...');
    const page1 = await page1Promise;
    await page1.waitForLoadState('domcontentloaded');

    if (signal?.aborted) throw new Error('Carga cancelada por el usuario');

    // 5. Seleccionar Persona a representar
    console.log('[Playwright Bot] 🧑 Seleccionando Representado...');
    onProgress?.({ type: 'step', message: 'Seleccionando representado en SiRADIG...', percent: 35 });
    const personaBtn = page1.getByRole('button').filter({ hasText: /ARTILES|SOTOLONGO|LIANEL/i }).first();
    await personaBtn.waitFor({ state: 'visible', timeout: 20000 });
    await personaBtn.click();

    try {
      const aceptarBtn = page1.getByRole('button', { name: 'Aceptar' });
      await aceptarBtn.waitFor({ state: 'visible', timeout: 3000 });
      await aceptarBtn.click();
      console.log('[Playwright Bot] ⚠️ Modal Aceptar gestionado.');
    } catch (e) {
      console.log('[Playwright Bot] Modal Aceptar no apareció, continuando...');
    }

    // 6. Navegar a Carga de Formulario / Deducciones y desgravaciones
    console.log('[Playwright Bot] 📋 Navegando al listado general de deducciones...');
    onProgress?.({ type: 'step', message: 'Navegando al listado de deducciones...', percent: 35 });
    
    // Función auxiliar para regresar a la vista de "- Deducciones y desgravaciones"
    const goToDeduccionesList = async () => {
      console.log('[Playwright Bot] 📋 Verificando ubicación actual:', page1.url());

      // Si estamos en verGastosInduEquip.do (formulario de carga/edición), salir de ahí con Volver
      if (page1.url().includes('verGastosInduEquip.do')) {
        console.log('[Playwright Bot] Actualmente en formulario. Presionando botón "Volver"...');
        const volverBtn = page1.getByRole('button', { name: /Volver/i })
          .or(page1.locator('input[value*="Volver" i]'))
          .first();
        if (await volverBtn.isVisible().catch(() => false)) {
          await volverBtn.click().catch(() => {});
          await page1.waitForLoadState('domcontentloaded');
          await page1.waitForTimeout(1500);
        }
      }

      // Comprobar si ya vemos la tabla con botones de edición (.act_editar)
      const hasActEditar = (await page1.locator('.act_editar').count()) > 0;
      if (hasActEditar && !page1.url().includes('verGastosInduEquip.do')) {
        console.log('[Playwright Bot] Ya en listado de deducciones con registros visibles.');
        return;
      }

      // Navegar a Carga de Formulario -> - Deducciones y desgravaciones
      console.log('[Playwright Bot] Navegando a menú de Carga de Formulario...');
      try {
        const cargaBtn = page1.getByRole('button', { name: 'Carga de Formulario' });
        if (await cargaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cargaBtn.click();
        } else {
          const tab = page1.locator('#tab_principal_carga_formulario');
          if ((await tab.count()) > 0) {
            await tab.dispatchEvent('click').catch(() => {});
          } else {
            await page1.goto('https://serviciosjava2.afip.gob.ar/radig/jsp/verMenuDeducciones.do');
          }
        }
      } catch {
        await page1.goto('https://serviciosjava2.afip.gob.ar/radig/jsp/verMenuDeducciones.do').catch(() => {});
      }
      await page1.waitForTimeout(1000);

      console.log('[Playwright Bot] Seleccionando "- Deducciones y desgravaciones"...');
      const dedLink = page1.getByRole('link', { name: /- Deducciones y desgravaciones/i })
        .or(page1.locator('a').filter({ hasText: /Deducciones y desgravaciones/i }))
        .first();
      await dedLink.waitFor({ state: 'visible', timeout: 10000 });
      await dedLink.click();
      await page1.waitForLoadState('domcontentloaded');
      await page1.waitForTimeout(2000);
    };

    // Navegar inicialmente al listado de deducciones
    await goToDeduccionesList();

    // Bucle principal de carga de los tickets
    for (let i = 0; i < tickets.length; i++) {
      if (signal?.aborted) throw new Error('Carga cancelada por el usuario');

      const ticket = tickets[i]!;
      const { formatted, month, monthNum, monthName, year } = parseDate(ticket.fecha);
      const ticketPercent = Math.round(35 + (i / tickets.length) * 60);

      // Normalización de comprobante y números
      const tipoNorm = normalizeInvoiceType(ticket.tipoFactura);
      let ptoVta = (ticket.puntoVenta || '').trim();
      let nroComp = (ticket.numeroComprobante || '').trim();
      if (!ptoVta && nroComp.includes('-')) {
        const [pv, nro] = nroComp.split('-');
        ptoVta = pv?.trim() || '';
        nroComp = nro?.trim() || '';
      }

      // Formatear monto numérico con coma decimal para AFIP (ej. 35034,00)
      const montoNum = typeof ticket.montoTotal === 'number'
        ? ticket.montoTotal
        : parseFloat(String(ticket.montoTotal).replace(',', '.'));
      const montoStr = isNaN(montoNum)
        ? String(ticket.montoTotal).replace('.', ',')
        : montoNum.toFixed(2).replace('.', ',');

      console.log(`\n========================================================================`);
      console.log(`[Playwright Bot] 🔄 [${i + 1}/${tickets.length}] PROCESANDO COMPROBANTE`);
      console.log(`  • CUIT: ${ticket.cuit}`);
      console.log(`  • Fecha original: ${ticket.fecha} -> Formateada: ${formatted}`);
      console.log(`  • Período / Mes objetivo: ${monthName} (${monthNum}/${year})`);
      console.log(`  • Tipo detectado: ${tipoNorm} (original: "${ticket.tipoFactura}")`);
      console.log(`  • Punto de Venta: ${ptoVta} | Número: ${nroComp}`);
      console.log(`  • Monto: $${montoStr}`);
      console.log(`========================================================================\n`);

      onProgress?.({
        type: 'ticket_start',
        ticketIndex: i,
        totalTickets: tickets.length,
        percent: ticketPercent,
        message: `[${i + 1}/${tickets.length}] Verificando CUIT ${ticket.cuit} (${tipoNorm} $${montoStr} en ${monthName})...`
      });

      let montoDeducibleForm = '';
      let denominacionForm = '';

      try {
        if (signal?.aborted) throw new Error('Carga cancelada por el usuario');

        // Asegurar que estamos en el listado de deducciones
        await goToDeduccionesList();

        // 1. IDENTIFICACIÓN DEL MES: Inspeccionar las filas en la tabla para CUIT y Mes
        console.log(`[Playwright Bot] 🔎 Buscando deducción existente para CUIT ${ticket.cuit} en mes ${monthName}...`);
        
        // Esperar que la tabla o los botones act_editar carguen si existen
        await page1.locator('.act_editar').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        
        const allTrs = page1.locator('table tr');
        const trCount = await allTrs.count();
        console.log(`[Playwright Bot] 📊 Analizando ${trCount} filas en la tabla del listado...`);

        let matchingRow = null;
        const targetCuitDigits = ticket.cuit.replace(/\D/g, '');

        for (let r = 0; r < trCount; r++) {
          const trLoc = allTrs.nth(r);
          const trText = (await trLoc.innerText().catch(() => '')).trim();
          const hasEditBtn = (await trLoc.locator('.act_editar, [title*="Editar" i], .ui-icon-pencil').count()) > 0;

          if (hasEditBtn || trText.includes(targetCuitDigits) || trText.includes(ticket.cuit)) {
            console.log(`[Playwright Bot]   📋 Fila [${r}] (editar=${hasEditBtn}): "${trText.replace(/\s+/g, ' ')}"`);
          }

          if (!hasEditBtn) continue;

          const lower = trText.toLowerCase();
          const cuitMatch = lower.includes(targetCuitDigits) || lower.includes(ticket.cuit);
          
          // Coincidencia con nombre del mes (ej: "abril") o número ("4", "04")
          const monthMatch = lower.includes(monthName.toLowerCase())
            || new RegExp(`\\b${monthName}\\b`, 'i').test(trText)
            || new RegExp(`\\b0?${monthNum}\\b`).test(trText);

          if (cuitMatch && monthMatch) {
            console.log(`[Playwright Bot] 🎯 ¡COINCIDENCIA ENCONTRADA en fila [${r}] para ${ticket.cuit} en mes ${monthName}!`);
            matchingRow = trLoc;
            break;
          }
        }

        let isEditing = false;

        if (matchingRow) {
          console.log(`[Playwright Bot] ✏️ Entrando en EDICIÓN de la deducción existente (.act_editar)...`);
          const editBtn = matchingRow.locator('.act_editar, [title*="Editar" i], .ui-icon-pencil').first();
          await editBtn.click();
          await page1.waitForLoadState('domcontentloaded');
          await page1.waitForTimeout(2000);
          isEditing = true;
        } else {
          console.log(`[Playwright Bot] ➕ No existe registro previo para CUIT ${ticket.cuit} en mes ${monthName}. Abriendo formulario para nueva deducción...`);
          await page1.goto('https://serviciosjava2.afip.gob.ar/radig/jsp/verGastosInduEquip.do');
          await page1.waitForLoadState('domcontentloaded');
          await page1.waitForTimeout(1500);

          if (signal?.aborted) throw new Error('Carga cancelada por el usuario');

          // Ingresar CUIT del Proveedor (selector real: #numeroDoc)
          const cuitInput = page1.locator('#numeroDoc')
            .or(page1.locator('#cuit'))
            .or(page1.locator('input[name*="cuit" i]'))
            .or(page1.locator('input[name*="numeroDoc" i]'))
            .or(page1.getByRole('textbox', { name: /CUIT|Documento/i }))
            .first();
          await cuitInput.waitFor({ state: 'visible', timeout: 15000 });

          console.log(`[Playwright Bot] ✍️ Ingresando CUIT ${ticket.cuit} en #numeroDoc...`);
          await cuitInput.click();
          await cuitInput.fill(ticket.cuit);
          await cuitInput.press('Enter');
          await page1.waitForTimeout(2500); // Esperar autocompletado

          // Seleccionar Concepto "Indumentaria" (código 1) o "Equipamiento" (código 2)
          const isIndumentaria = /indumentaria|ropa|calzado/i.test(ticket.concepto || '');
          const targetConceptoCode = isIndumentaria ? '1' : '2';
          const targetConceptoLabel = isIndumentaria ? 'Indumentaria' : 'Equipamiento';
          const conceptoSelect = page1.locator('#idConcepto')
            .or(page1.locator('#tipoGasto'))
            .or(page1.locator('#concepto'))
            .or(page1.locator('select[name*="concepto" i]'))
            .first();
          if (await conceptoSelect.isVisible()) {
            try {
              await conceptoSelect.selectOption(targetConceptoCode);
            } catch {
              await conceptoSelect.selectOption({ label: targetConceptoLabel }).catch(() => {});
            }
            console.log(`[Playwright Bot] 🏷️ Concepto seleccionado: "${targetConceptoLabel}" (código ${targetConceptoCode})`);
            await page1.waitForTimeout(1000);
          }

          // ⚠️ VERIFICAR SI AFIP MOSTRÓ EL GLOBO ROJO "Ya existen Gastos registrados..."
          const balloonLink = page1.locator('a').filter({ hasText: /deducci[oó]n existente/i }).first();
          if (await balloonLink.isVisible().catch(() => false)) {
            console.log('[Playwright Bot] ⚠️ Globo rojo detectado: Ya existen gastos registrados para esta CUIT y mes. Clickeando enlace "deducción existente"...');
            await balloonLink.click();
            await page1.waitForLoadState('domcontentloaded');
            await page1.waitForTimeout(2000);
            isEditing = true;
          }
        }

        // Asegurar que el mes en el formulario corresponda al comprobante (tanto en modo edición como en nueva deducción)
        console.log(`[Playwright Bot] 📅 Verificando y configurando selector de mes (#mesDesde) a ${monthName} (${monthNum})...`);
        const cleanMonthNum = String(parseInt(monthNum, 10));
        const mesSelect = page1.locator('#mesDesde').first();
        if (await mesSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
          const isEnabled = await mesSelect.isEnabled().catch(() => true);
          if (isEnabled) {
            await mesSelect.evaluate((el: HTMLSelectElement, { num, name }: { num: string, name: string }) => {
              const options = Array.from(el.options);
              const match = options.find(o => o.value === num || o.value === num.padStart(2, '0'))
                || options.find(o => o.text.trim().toLowerCase() === name.toLowerCase())
                || options.find(o => o.text.toLowerCase().includes(name.toLowerCase()));
              if (match) {
                el.value = match.value;
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }, { num: cleanMonthNum, name: monthName });
            try {
              await mesSelect.selectOption(cleanMonthNum);
            } catch {}
            await page1.waitForTimeout(1500);
            const actualVal = await mesSelect.inputValue().catch(() => '');
            console.log(`[Playwright Bot] 📅 Selector #mesDesde configurado con valor: "${actualVal}" (objetivo: ${cleanMonthNum})`);
          } else {
            console.log(`[Playwright Bot] ℹ️ Selector #mesDesde se encuentra bloqueado/disabled en este formulario.`);
          }
        }

        // Obtener denominación para logging
        denominacionForm = await page1.evaluate(() => {
          const inp = document.querySelector('#denominacion, #txtDenominacion, #razonSocial, input[name*="denominacion" i], input[name*="razon" i]') as HTMLInputElement | null;
          if (inp && inp.value) return inp.value.trim();
          const allLabels = Array.from(document.querySelectorAll('td, th, label, span, div'));
          for (const l of allLabels) {
            if (l.textContent && /denominaci[oó]n/i.test(l.textContent)) {
              const field = l.closest('tr')?.querySelector('input') || l.parentElement?.querySelector('input');
              if (field && field.value) return field.value.trim();
            }
          }
          return '';
        });

        // 2. Comprobar si el comprobante exacto ya está listado en la tabla de comprobantes del formulario
        const isComprobanteAlreadyInTable = await page1.evaluate(({ pv, nro, monto }: { pv: string, nro: string, monto: string }) => {
          const cleanPv = pv ? pv.replace(/^0+/, '') : '';
          const cleanNro = nro ? nro.replace(/^0+/, '') : '';
          const rawNro = nro.trim();
          const rawPv = pv.trim();

          const tables = Array.from(document.querySelectorAll('table'));
          for (const table of tables) {
            const rows = Array.from(table.querySelectorAll('tr'));
            for (const row of rows) {
              const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
              if (cells.length === 0) continue;
              const text = row.textContent || '';

              // Comprobar coincidencia de número de comprobante
              const hasNro = (cleanNro && cells.some(c => c.replace(/^0+/, '') === cleanNro))
                || (rawNro && cells.some(c => c === rawNro || c.includes(rawNro)))
                || (cleanNro && text.includes(cleanNro));

              if (!hasNro) continue;

              // Comprobar coincidencia de PV si fue suministrado
              if (cleanPv) {
                const hasPv = cells.some(c => c.replace(/^0+/, '') === cleanPv)
                  || cells.some(c => c === rawPv || c.includes(rawPv))
                  || text.includes(cleanPv);
                if (!hasPv) continue;
              }

              return {
                found: true,
                rowText: text.replace(/\s+/g, ' ').trim()
              };
            }
          }
          return { found: false };
        }, { pv: ptoVta, nro: nroComp, monto: montoStr });

        if (isComprobanteAlreadyInTable.found) {
          const duplicateMsg = `Comprobante ${tipoNorm} (${ptoVta}-${nroComp}) YA REGISTRADO previamente en AFIP (detectado en tabla de deducciones: "${isComprobanteAlreadyInTable.rowText}"). Omitiendo para evitar duplicado.`;
          console.log(`[Playwright Bot] ⏭️ ${duplicateMsg}`);
          
          results.push({
            cuit: ticket.cuit,
            nro: `${ptoVta}-${nroComp}`,
            success: true,
            message: duplicateMsg
          });

          await markTicketAsLoadedInCSV(ticket.cuit, nroComp, ptoVta);

          onProgress?.({
            type: 'ticket_success',
            ticketIndex: i,
            totalTickets: tickets.length,
            percent: Math.round(35 + ((i + 1) / tickets.length) * 60),
            message: `ℹ️ [${i + 1}/${tickets.length}] CUIT ${ticket.cuit} (${ptoVta}-${nroComp}): Ya existe en AFIP (duplicado omitido)`
          });

          // Continuar al siguiente ticket sin modificar ni re-guardar el formulario
          await goToDeduccionesList();
          continue;
        }

        // 3. Cargar Comprobante en modal
        console.log('[Playwright Bot] 📄 Abriendo formulario "Alta de Comprobante"...');
        const altaBtn = page1.getByRole('link', { name: 'Alta de Comprobante' })
          .or(page1.getByText('Alta de Comprobante'))
          .first();
        await altaBtn.waitFor({ state: 'visible', timeout: 10000 });
        await altaBtn.click();

        const montoInput = page1.locator('#cmpMontoFacturado')
          .or(page1.getByRole('row', { name: /^Monto$/i }).getByRole('textbox'))
          .or(page1.getByLabel(/Monto/i))
          .first();
        await montoInput.waitFor({ state: 'visible', timeout: 10000 });

        // Fecha del Comprobante
        const fechaInput = page1.locator('#cmpFechaFactura')
          .or(page1.locator('input.hasDatepicker'))
          .or(page1.getByRole('row', { name: /Fecha/i }).getByRole('textbox'))
          .first();
        if (await fechaInput.isVisible()) {
          await fechaInput.click();
          await fechaInput.fill('');
          await fechaInput.fill(formatted);
          await fechaInput.press('Tab');
          await fechaInput.dispatchEvent('change').catch(() => {});
        } else {
          const dayNum = String(parseInt(ticket.fecha.split('/')[0] || '1', 10));
          const trigger = page1.locator('.ui-datepicker-trigger').first();
          if (await trigger.isVisible()) {
            await trigger.click();
            await page1.getByRole('link', { name: dayNum, exact: true }).first().click();
          }
        }

        // Tipo de Comprobante (Evitar seleccionar Factura C por error)
        const tipoSelect = page1.locator('#cmpTipoComprobante')
          .or(page1.getByRole('row', { name: /Tipo/i }).getByRole('combobox'))
          .first();
        let selectedTipoText = tipoNorm;
        if (await tipoSelect.isVisible()) {
          const selInfo = await tipoSelect.evaluate((el: HTMLSelectElement, targetNorm: string) => {
            const options = Array.from(el.options);
            const letter = targetNorm.slice(-1);
            let match = options.find(o => o.text.trim().toLowerCase() === targetNorm.toLowerCase());
            if (!match) {
              match = options.find(o => new RegExp(`\\bFactura\\s*${letter}\\b`, 'i').test(o.text));
            }
            if (!match) {
              match = options.find(o => o.text.trim().endsWith(` ${letter}`));
            }
            if (!match) {
              match = options.find(o => o.text.toLowerCase().includes(targetNorm.toLowerCase()));
            }

            if (match) {
              el.value = match.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return { value: match.value, text: match.text.trim() };
            }
            return { value: el.value, text: el.options[el.selectedIndex]?.text?.trim() || '' };
          }, tipoNorm);

          selectedTipoText = selInfo.text || tipoNorm;
          console.log(`[Playwright Bot] 📑 Tipo comprobante seleccionado: "${selInfo.text}" (código: ${selInfo.value})`);
        }

        // Punto de Venta
        const ptoVtaInput = page1.getByRole('textbox', { name: 'Punto de Venta' })
          .or(page1.locator('#cmpPuntoVenta'))
          .first();
        await ptoVtaInput.click();
        await ptoVtaInput.fill(ptoVta);

        // Número
        const nroInput = page1.getByRole('textbox', { name: 'Número' })
          .or(page1.locator('#cmpNumero'))
          .first();
        await nroInput.click();
        await nroInput.fill(nroComp);

        // Monto comprobante
        await montoInput.click();
        await montoInput.fill(montoStr);
        await montoInput.press('Tab');

        // Presionar "Agregar" en modal
        console.log('[Playwright Bot] ➕ Presionando botón "Agregar" comprobante...');
        const agregarBtn = page1.getByRole('button', { name: 'Agregar' })
          .or(page1.locator('input[value="Agregar"]'))
          .or(page1.locator('#btnAgregar'))
          .first();
        await agregarBtn.click();
        await page1.waitForTimeout(2000);

        // Esperar y comprobar si el modal se cerró (desaparición de overlay)
        const modalOverlay = page1.locator('.ui-widget-overlay');
        const isOverlayVisible = await modalOverlay.isVisible().catch(() => false);

        if (isOverlayVisible) {
          console.warn('[Playwright Bot] ⚠️ El modal de comprobante sigue abierto tras presionar "Agregar". Verificando errores...');
          const modalError = await page1.evaluate(() => {
            const dialog = document.querySelector('.ui-dialog:visible, div[role="dialog"]');
            const err = dialog?.querySelector('.error, .alert-error, .ui-state-error, #error, #errores, .errorMessage, font[color="red"], .ui-state-highlight');
            return err?.textContent?.trim() || dialog?.textContent?.trim() || null;
          });

          // Cerrar el modal para no bloquear la pantalla con el overlay
          const closeBtn = page1.locator('.ui-dialog-titlebar-close, button:has-text("Cerrar"), a:has-text("Cerrar")').first();
          await closeBtn.click().catch(() => {});
          await page1.waitForTimeout(1000);

          // Si AFIP rechazó porque ya está registrado o duplicado:
          const isDuplicate = modalError && /ya existe|duplicado|registrado previamente/i.test(modalError);
          if (isDuplicate) {
            const duplicateMsg = `Comprobante ${tipoNorm} (${ptoVta}-${nroComp}) reportado por AFIP como ya existente (${modalError}). Omitido por duplicado.`;
            console.log(`[Playwright Bot] ℹ️ ${duplicateMsg}`);

            results.push({
              cuit: ticket.cuit,
              nro: `${ptoVta}-${nroComp}`,
              success: true,
              message: duplicateMsg
            });

            await markTicketAsLoadedInCSV(ticket.cuit, nroComp, ptoVta);

            onProgress?.({
              type: 'ticket_success',
              ticketIndex: i,
              totalTickets: tickets.length,
              percent: Math.round(35 + ((i + 1) / tickets.length) * 60),
              message: `ℹ️ [${i + 1}/${tickets.length}] CUIT ${ticket.cuit}: Ya registrado en AFIP (${modalError})`
            });

            await goToDeduccionesList();
            continue;
          }

          throw new Error(`AFIP rechazó el comprobante en el modal: ${modalError || 'Error de validación o fecha no coincidente con el período seleccionado'}`);
        }

        // 4. Leer Monto Deducible acumulado en el formulario principal antes de guardar
        montoDeducibleForm = await page1.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input'));
          for (const inp of inputs) {
            const combined = `${inp.id || ''} ${inp.name || ''}`.toLowerCase();
            if (combined.includes('deducible') || combined.includes('totalded') || combined.includes('montototal')) {
              if (inp.value) return inp.value.trim();
            }
          }
          const allText = Array.from(document.querySelectorAll('td, th, label, span, div, b, strong'));
          for (const el of allText) {
            if (el.textContent && /monto\s*deducible/i.test(el.textContent)) {
              const container = el.closest('tr') || el.parentElement;
              const inp = container?.querySelector('input');
              if (inp && inp.value) return inp.value.trim();
            }
          }
          return '';
        });

        // LOG DETALLADO DE DATOS CARGADOS
        console.log(`\n------------------------------------------------------------------------`);
        console.log(`[Playwright Bot] 📋 DATOS CARGADOS PARA VALIDACIÓN:`);
        console.log(`  • CUIT Proveedor:             ${ticket.cuit}`);
        console.log(`  • Denominación / Razón Soc.:  ${denominacionForm || ticket.denominacion || 'N/A'}`);
        console.log(`  • Modo:                       ${isEditing ? 'EDICIÓN DE DEDUCCIÓN EXISTENTE' : 'NUEVA DEDUCCIÓN'}`);
        console.log(`  • Período / Mes:              ${monthName} (${monthNum})`);
        console.log(`  • Comprobante:                ${tipoNorm} ${ptoVta}-${nroComp}`);
        console.log(`  • Fecha Comprobante:          ${formatted}`);
        console.log(`  • Monto Comprobante:          $${montoStr}`);
        console.log(`  • Monto Deducible Formulario: $${montoDeducibleForm || montoStr}`);
        console.log(`------------------------------------------------------------------------\n`);

        onProgress?.({
          type: 'step',
          percent: Math.min(ticketPercent + 5, 90),
          message: `[${i + 1}/${tickets.length}] Datos listos para guardar: ${tipoNorm} ${ptoVta}-${nroComp} ($${montoStr}) en ${monthName}. Monto Deducible: $${montoDeducibleForm || montoStr}...`
        });

        // 5. Guardar el bloque del proveedor
        console.log('[Playwright Bot] 💾 Presionando botón "Guardar" del proveedor...');
        const overlayBeforeSave = page1.locator('.ui-widget-overlay');
        if (await overlayBeforeSave.isVisible().catch(() => false)) {
          console.warn('[Playwright Bot] ⚠️ Se detectó un overlay activo antes de guardar. Esperando cierre...');
          await overlayBeforeSave.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        }

        const guardarBtn = page1.getByRole('button', { name: 'Guardar' })
          .or(page1.getByRole('button', { name: /Guardar/i }))
          .or(page1.locator('#btn_guardar, input[value="Guardar"]'))
          .first();
        await guardarBtn.waitFor({ state: 'visible', timeout: 10000 });
        await guardarBtn.click();
        await page1.waitForLoadState('domcontentloaded');
        await page1.waitForTimeout(2500);

        // 6. VALIDACIÓN ESTRICTA DE ERRORES AL GUARDAR (Evitar falsos positivos)
        const hasErrorBanner = await page1.locator('text=/Se detectaron errores en los datos enviados/i').isVisible().catch(() => false);
        const balloonVisible = await page1.locator('text=/Ya existen Gastos registrados/i').isVisible().catch(() => false);

        if (hasErrorBanner || balloonVisible) {
          const errorMsgs = await page1.locator('.error, .alert-error, .ui-state-error, #error, #errores')
            .allInnerTexts()
            .catch(() => []);
          const detail = balloonVisible
            ? 'Ya existen Gastos registrados para esta CUIT, mes y concepto'
            : (errorMsgs.join(' | ').trim() || 'Se detectaron errores en los datos enviados');
          console.error(`[Playwright Bot] ❌ AFIP rechazó el guardado: ${detail}`);
          throw new Error(`AFIP rechazó la carga: ${detail}`);
        }

        // Comprobar que no nos hayamos quedado trabados en el formulario de edición con errores
        const currentUrl = page1.url();
        if (currentUrl.includes('verGastosInduEquip.do') && !currentUrl.includes('verDeducciones.do')) {
          const generalError = await page1.evaluate(() => {
            const el = document.querySelector('.error, .alert-error, .ui-state-error, #error, #errores');
            return el?.textContent?.trim() || null;
          });
          if (generalError) {
            throw new Error(`AFIP error en formulario: ${generalError}`);
          }
        }

        // 7. VERIFICACIÓN FINAL CRUZADA: Matchear Monto Deducible con la columna Importe del listado externo
        await goToDeduccionesList();

        console.log(`[Playwright Bot] 🔍 Verificación final: Matcheando Monto Deducible ($${montoDeducibleForm || montoStr}) con columna Importe en listado externo para CUIT ${ticket.cuit} (${monthName})...`);
        const verification = await page1.evaluate(({ targetCuit, targetMonth, expectedAmountStr }: { targetCuit: string, targetMonth: string, expectedAmountStr: string }) => {
          const rows = Array.from(document.querySelectorAll('table tr'));
          const cuitRows = rows.filter(r => r.textContent?.includes(targetCuit));
          if (cuitRows.length === 0) {
            return {
              found: false,
              message: `No se encontró fila para CUIT ${targetCuit} en el listado externo de gastos.`
            };
          }

          let targetRow = cuitRows.find(r => r.textContent?.toLowerCase().includes(targetMonth.toLowerCase()));
          if (!targetRow) {
            return {
              found: false,
              message: `Se encontró fila para CUIT ${targetCuit}, pero no para el mes ${targetMonth}. Filas presentes: ${cuitRows.map(r => r.textContent?.trim().replace(/\s+/g, ' ')).join(' | ')}`
            };
          }

          const cells = Array.from(targetRow.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
          let tableImporte = '';
          const cell4 = cells[4];
          if (cell4 && /^\d+([.,]\d{2})?$/.test(cell4.replace(/\s/g, ''))) {
            tableImporte = cell4.trim();
          } else {
            for (const cell of cells) {
              const clean = cell.replace(/\s/g, '');
              if (/^\d+([.,]\d{2})$/.test(clean) && clean !== targetCuit) {
                tableImporte = cell.trim();
                break;
              }
            }
          }

          const parseNum = (val: string) => {
            if (!val) return 0;
            const clean = val.replace(/\./g, '').replace(',', '.');
            return parseFloat(clean) || 0;
          };

          const expectedNum = parseNum(expectedAmountStr);
          const actualNum = parseNum(tableImporte);
          const matched = Math.abs(expectedNum - actualNum) < 0.05 && actualNum > 0;

          return {
            found: true,
            tableImporte,
            expectedNum,
            actualNum,
            matched,
            cells
          };
        }, {
          targetCuit: ticket.cuit,
          targetMonth: monthName,
          expectedAmountStr: montoDeducibleForm || montoStr
        });

        console.log(`[Playwright Bot] 📊 Resultado verificación listado externo:`, verification);

        if (!verification.found) {
          throw new Error(`Verificación fallida: ${verification.message}`);
        }
        if (!verification.matched) {
          console.warn(`[Playwright Bot] ⚠️ ADVERTENCIA: Monto Deducible ($${montoDeducibleForm || montoStr}) difiere del listado externo ($${verification.tableImporte}).`);
          throw new Error(`Discrepancia en importes: Monto Deducible en formulario fue $${montoDeducibleForm || montoStr} pero el listado externo muestra $${verification.tableImporte}.`);
        }

        console.log(`[Playwright Bot] ✅ VERIFICACIÓN CONFIRMADA: El Monto Deducible ($${montoDeducibleForm || montoStr}) coincide exactamente con el Importe del listado ($${verification.tableImporte}).`);

        const importeFinal = verification.tableImporte;
        const successMsg = `Factura ${tipoNorm} (${ptoVta}-${nroComp}) de $${montoStr} en mes ${monthName} cargada con éxito. Verificado en listado externo: Importe $${importeFinal}.`;
        
        results.push({
          cuit: ticket.cuit,
          nro: `${ptoVta}-${nroComp}`,
          success: true,
          message: successMsg
        });

        await markTicketAsLoadedInCSV(ticket.cuit, nroComp, ptoVta);

        onProgress?.({
          type: 'ticket_success',
          ticketIndex: i,
          totalTickets: tickets.length,
          percent: Math.round(35 + ((i + 1) / tickets.length) * 60),
          message: `✅ [${i + 1}/${tickets.length}] CUIT ${ticket.cuit}: ${successMsg}`
        });

      } catch (ticketErr: any) {
        // Si la carga fue cancelada por el usuario, salir de inmediato sin continuar
        if (signal?.aborted || ticketErr.message?.includes('cancelad') || ticketErr.message?.includes('Target closed') || ticketErr.message?.includes('closed')) {
          console.log('[Playwright Bot] 🛑 Carga cancelada por el usuario. Deteniendo bot de inmediato.');
          throw new Error('Carga cancelada por el usuario');
        }

        console.error(`[Playwright Bot] ❌ Falló el procesamiento del ticket individual CUIT ${ticket.cuit} (${ptoVta}-${nroComp}):`, ticketErr);
        const errMsg = ticketErr.message || 'Error desconocido al cargar el comprobante';
        results.push({
          cuit: ticket.cuit,
          nro: `${ptoVta}-${nroComp}`,
          success: false,
          message: errMsg
        });

        onProgress?.({
          type: 'ticket_error',
          ticketIndex: i,
          totalTickets: tickets.length,
          percent: Math.round(35 + ((i + 1) / tickets.length) * 60),
          error: errMsg,
          message: `❌ [${i + 1}/${tickets.length}] CUIT ${ticket.cuit} (${ptoVta}-${nroComp}): Falló (${errMsg})`
        });
        
        // Intentamos recuperarnos para procesar el siguiente ticket
        try {
          const cancelarBtn = page1.getByRole('button', { name: /Cancelar/i }).or(page1.getByRole('button', { name: /Volver/i })).first();
          if (await cancelarBtn.isVisible()) {
            await cancelarBtn.click();
            await page1.waitForTimeout(1000);
          }
        } catch (e) {}
      }
    }

    console.log('[Playwright Bot] 🏁 Todo el listado de tickets ha sido procesado.');
    const allSuccess = results.every(r => r.success);
    const hasErrors = results.some(r => !r.success);

    onProgress?.({
      type: 'done',
      percent: 100,
      message: allSuccess
        ? 'Todos los comprobantes fueron cargados exitosamente.'
        : 'Finalizado con errores en algunos comprobantes.',
      results
    });

    return { 
      success: allSuccess, 
      hasErrors,
      results,
      message: `Procesamiento finalizado. Resumen de carga:\n\n${results.map(r => (r.success ? '✅' : '❌') + ' ' + r.cuit + ': ' + r.message).join('\n')}`
    };

  } catch (error: any) {
    console.error('[Playwright Bot] ❌ Falló catastrófico en flujo principal:', error);
    onProgress?.({
      type: 'error',
      message: error.message || 'Error general en la automatización',
      error: error.message
    });
    throw new Error('Fallo automatización SIRADIG: ' + error.message);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close().catch(() => {});
  }
}

/**
 * Mantiene compatibilidad para la carga de 1 ticket individual.
 */
export async function submitTicketToAFIP(ticket: TicketData) {
  return submitTicketsToAFIP([ticket]);
}
