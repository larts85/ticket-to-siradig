import { test, expect } from '@playwright/test'

test('test', async ({ page }) => {
  //initial navigation
  await page.goto('https://auth.afip.gob.ar/contribuyente_/login.xhtml')
  await page.getByRole('spinbutton').fill(process.env.AFIP_CUIT || '20000000001')
  await page.getByRole('spinbutton').press('Enter')
  await page
    .getByRole('textbox', { name: 'TU CLAVE' })
    .fill(process.env.AFIP_PASSWORD || 'dummy_password')
  await page.getByRole('button', { name: 'Ingresar' }).click()

  //navigate to form
  const page1Promise = page.waitForEvent('popup')
  await page.locator('a').filter({ hasText: 'SiRADIG - Trabajador' }).click()
  const page1 = await page1Promise
  await page1
    .getByRole('button', { name: process.env.AFIP_PERSONA_NAME || 'CONTRIBUYENTE TEST' })
    .click()
  await expect(page1.getByText('Recordatorio - Formulario')).toBeVisible()
  await page1.getByRole('button', { name: 'Aceptar' }).click()
  await page1.getByRole('button', { name: 'Carga de Formulario' }).click()
  await page1.getByRole('link', { name: '- Deducciones y desgravaciones' }).click()
})
