import { memo, useRef, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { isWeb, ScrollView, SizableText, Spinner, Theme, XStack, YStack } from 'tamagui'
import { Button } from '~/interface/buttons/Button'
import { Input } from '~/interface/forms/Input'
import { H1, H2, H3 } from '~/interface/text/Headings'
import { showToast } from '~/interface/toast/helpers'

import { parseCSVToTickets, exportTicketsToCSV } from '~/helpers/csv-parser'

export interface TicketItem {
  cuit: string
  denominacion: string
  fecha: string
  tipoFactura: string
  puntoVenta: string
  numeroComprobante: string
  montoTotal: string | number
  concepto?: string
  cargado?: string
  status?: 'idle' | 'loading' | 'success' | 'error'
  errorMessage?: string
}

export const HomePage = memo(() => {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [tickets, setTickets] = useState<TicketItem[]>([])

  // Estados de progreso y control del Scraping de AFIP
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [botError, setBotError] = useState<string | null>(null)
  const [submitProgress, setSubmitProgress] = useState(0)
  const [submitStatusText, setSubmitStatusText] = useState('')
  const [botLogs, setBotLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const insets = useSafeAreaInsets()

  const extractSingleTicket = async (formData: FormData) => {
    try {
      const response = await fetch('/api/extract-ticket', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      if (result.success) {
        return result.data
      } else {
        showToast(result.error || 'Error al extraer comprobante', { type: 'error' })
        return null
      }
    } catch (error) {
      showToast('Error de conexión con la API de extracción', { type: 'error' })
      return null
    }
  }

  const handleFileUpload = async (e: any) => {
    const files = Array.from(e.target.files || []) as File[]
    if (files.length === 0) return

    setIsLoading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        setStatusMessage(`Analizando archivo ${i + 1} de ${files.length} con Gemini AI...`)
        
        const formData = new FormData()
        formData.append('file', file)
        
        const result = await extractSingleTicket(formData)
        if (result) {
          setTickets(prev => [...prev, { ...result, status: 'idle' }])
        }
      }
      showToast(`${files.length} comprobante(s) procesado(s) secuencialmente.`, { type: 'success' })
    } catch (err) {
      showToast('Ocurrió un problema procesando los archivos', { type: 'error' })
    } finally {
      setIsLoading(false)
      setStatusMessage('')
      e.target.value = null
    }
  }

  const handleUrlSubmit = async () => {
    if (!url.trim()) return
    setIsLoading(true)
    setStatusMessage('Analizando URL del comprobante...')
    
    try {
      const formData = new FormData()
      formData.append('url', url)
      
      const result = await extractSingleTicket(formData)
      if (result) {
        setTickets(prev => [...prev, { ...result, status: 'idle' }])
        setUrl('')
        showToast('Ticket extraído correctamente.', { type: 'success' })
      }
    } finally {
      setIsLoading(false)
      setStatusMessage('')
    }
  }

  // Carga a través de archivo CSV seleccionado por el usuario
  const handleCsvFileUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setStatusMessage('Procesando archivo CSV...')

    try {
      const text = await file.text()
      const { tickets: parsedTickets, skippedCount, duplicateCount } = parseCSVToTickets(text)

      if (parsedTickets.length === 0) {
        showToast('No se encontraron comprobantes válidos en el archivo CSV', { type: 'error' })
        return
      }

      setTickets(prev => [...prev, ...parsedTickets])
      let msg = `${parsedTickets.length} comprobantes cargados desde CSV.`
      if (duplicateCount > 0) {
        msg += ` (${duplicateCount} duplicados omitidos).`
      }
      if (skippedCount > 0) {
        msg += ` (${skippedCount} omitidos sin CUIT).`
      }
      showToast(msg, { type: 'success' })
    } catch (err: any) {
      showToast('Error al leer el archivo CSV: ' + err.message, { type: 'error' })
    } finally {
      setIsLoading(false)
      setStatusMessage('')
      e.target.value = null
    }
  }

  // Carga rápida del archivo tickets_2026.csv existente en el workspace
  const handleLoadDefaultCsv = async () => {
    setIsLoading(true)
    setStatusMessage('Cargando tickets_2026.csv pre-escaneados...')

    try {
      const response = await fetch('/api/load-csv')
      const result = await response.json()

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        setTickets(prev => [...prev, ...result.data])
        showToast(`${result.data.length} comprobantes cargados desde tickets_2026.csv`, { type: 'success' })
      } else {
        showToast(result.error || 'No se pudieron cargar los comprobantes pre-escaneados', { type: 'error' })
      }
    } catch (err: any) {
      showToast('Error al conectar con la API de CSV: ' + err.message, { type: 'error' })
    } finally {
      setIsLoading(false)
      setStatusMessage('')
    }
  }


  // Carga masiva con streaming de progreso y cancelación
  const handleAFIPSubmit = async () => {
    if (tickets.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    setBotError(null)
    setSubmitProgress(5)
    setSubmitStatusText('Iniciando navegador y conexión con AFIP...')
    setBotLogs(['[Sistema] Iniciando proceso de carga en SIRADIG...'])

    // Limpiar estados de error previos para el nuevo intento
    setTickets(prev =>
      prev.map(t => ({
        ...t,
        status: t.status === 'success' ? 'success' : 'idle',
        errorMessage: undefined,
      }))
    )

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      // Enviamos solo los tickets que aún no han sido cargados con éxito
      const pendingTickets = tickets.filter(t => t.status !== 'success' && t.cargado !== 'SI')

      if (pendingTickets.length === 0) {
        showToast('Todos los comprobantes ya figuran como cargados', { type: 'info' })
        setIsSubmitting(false)
        return
      }

      const matchIndexInList = (list: TicketItem[], item?: TicketItem | { cuit: string; nro?: string; numeroComprobante?: string }) => {
        if (!item) return -1
        const cleanC = (item.cuit || '').replace(/\D/g, '')
        const itemNro = ('numeroComprobante' in item ? item.numeroComprobante : item.nro) || ''
        const cleanN = String(itemNro).replace(/\D/g, '')
        return list.findIndex(t => {
          const tC = (t.cuit || '').replace(/\D/g, '')
          const tN = (t.numeroComprobante || '').replace(/\D/g, '')
          const cuitMatch = tC === cleanC
          const nroMatch = !cleanN || !tN || tN === cleanN || tN.replace(/^0+/, '') === cleanN.replace(/^0+/, '')
          return cuitMatch && nroMatch
        })
      }

      const response = await fetch('/api/submit-siradig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingTickets),
        signal: abortController.signal,
      })

      if (!response.body) {
        throw new Error('No se pudo establecer el flujo de eventos con el servidor')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          try {
            const event = JSON.parse(trimmed.slice(6))

            if (event.percent !== undefined) {
              setSubmitProgress(event.percent)
            }

            if (event.message) {
              setSubmitStatusText(event.message)
              setBotLogs(prev => [...prev, event.message])
            }

            if (event.type === 'ticket_start' && event.ticketIndex !== undefined) {
              const targetTicket = pendingTickets[event.ticketIndex]
              setTickets(prev => {
                const targetIdx = matchIndexInList(prev, targetTicket)
                if (targetIdx >= 0) {
                  const next = [...prev]
                  next[targetIdx] = { ...next[targetIdx]!, status: 'loading' }
                  return next
                }
                return prev
              })
            }

            if (event.type === 'ticket_success' && event.ticketIndex !== undefined) {
              const targetTicket = pendingTickets[event.ticketIndex]
              setTickets(prev => {
                const targetIdx = matchIndexInList(prev, targetTicket)
                if (targetIdx >= 0) {
                  const next = [...prev]
                  next[targetIdx] = {
                    ...next[targetIdx]!,
                    status: 'success',
                    cargado: 'SI',
                    errorMessage: undefined,
                  }
                  return next
                }
                return prev
              })
            }

            if (event.type === 'ticket_error' && event.ticketIndex !== undefined) {
              const targetTicket = pendingTickets[event.ticketIndex]
              setTickets(prev => {
                const targetIdx = matchIndexInList(prev, targetTicket)
                if (targetIdx >= 0) {
                  const next = [...prev]
                  next[targetIdx] = {
                    ...next[targetIdx]!,
                    status: 'error',
                    cargado: 'NO',
                    errorMessage: event.error || 'Error al procesar comprobante',
                  }
                  return next
                }
                return prev
              })
            }

            if (event.type === 'done') {
              setSubmitProgress(100)
              
              // Actualizamos el estado final según los resultados sin eliminar de la lista
              if (event.results && Array.isArray(event.results)) {
                const hasFailures = event.results.some((r: any) => !r.success)
                if (hasFailures) {
                  setBotError('Finalizado con errores en algunos comprobantes')
                }
                setTickets(prev => {
                  const updated = [...prev]
                  event.results.forEach((res: any) => {
                    const matchIdx = matchIndexInList(updated, { cuit: res.cuit, nro: res.nro })
                    if (matchIdx >= 0) {
                      updated[matchIdx] = {
                        ...updated[matchIdx]!,
                        status: res.success ? 'success' : 'error',
                        cargado: res.success ? 'SI' : 'NO',
                        errorMessage: res.success ? undefined : res.message,
                      }
                    }
                  })
                  return updated
                })
                showToast(
                  hasFailures ? 'Carga finalizada con errores en algunos comprobantes' : (event.message || 'Todos los comprobantes cargados'),
                  { type: hasFailures ? 'error' : 'success' }
                )
              } else {
                showToast(event.message || 'Procesamiento finalizado', { type: 'success' })
              }
            }

            if (event.type === 'error') {
              setBotError(event.message || 'Error durante la automatización')
              setSubmitStatusText(event.message || 'Error en AFIP')
              showToast(event.message || 'Error durante la automatización', { type: 'error' })
              setBotLogs(prev => [...prev, `❌ ${event.message}`])
              setTickets(prev =>
                prev.map(t => (t.status !== 'success' ? { ...t, status: 'error', errorMessage: event.message } : t))
              )
            }
          } catch (jsonErr) {
            // Ignorar líneas malformadas
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        showToast('Carga cancelada por el usuario', { type: 'info' })
        setSubmitStatusText('🛑 Proceso de carga cancelado.')
        setBotLogs(prev => [...prev, '🛑 Proceso cancelado por el usuario.'])
        setTickets(prev =>
          prev.map(t => (t.status === 'loading' ? { ...t, status: 'idle', errorMessage: 'Cancelado' } : t))
        )
      } else {
        setBotError(error.message)
        setSubmitStatusText(error.message || 'Error de conexión con AFIP')
        showToast(error.message || 'Error de conexión o timeout con AFIP', { type: 'error' })
        setBotLogs(prev => [...prev, `❌ Error: ${error.message}`])
        setTickets(prev =>
          prev.map(t => (t.status !== 'success' ? { ...t, status: 'error', errorMessage: error.message } : t))
        )
      }
    } finally {
      setIsSubmitting(false)
      abortControllerRef.current = null
    }
  }

  const toggleTicketLoaded = (index: number) => {
    const current = tickets[index]
    if (!current) return
    const isCurrentlyLoaded = current.status === 'success' || current.cargado === 'SI'
    const newCargado = isCurrentlyLoaded ? 'NO' : 'SI'
    const newStatus = isCurrentlyLoaded ? 'idle' : 'success'

    setTickets(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index]!,
        cargado: newCargado,
        status: newStatus,
        errorMessage: undefined,
      }
      return next
    })

    // Persistir el cambio directamente en tickets_2026.csv
    fetch('/api/load-csv', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuit: current.cuit,
        numeroComprobante: current.numeroComprobante,
        puntoVenta: current.puntoVenta,
        cargado: newCargado,
      }),
    }).catch(err => console.error('Error al actualizar CSV:', err))
  }

  const toggleMarkAll = () => {
    const allLoaded = tickets.every(t => t.status === 'success' || t.cargado === 'SI')
    const newStatus = allLoaded ? 'idle' : 'success'
    const newCargado = allLoaded ? 'NO' : 'SI'

    setTickets(prev =>
      prev.map(t => ({
        ...t,
        cargado: newCargado,
        status: newStatus,
        errorMessage: undefined,
      }))
    )

    // Persistir todos en tickets_2026.csv
    fetch('/api/load-csv', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        all: true,
        cargado: newCargado,
      }),
    }).catch(err => console.error('Error al actualizar todos en CSV:', err))

    showToast(
      allLoaded ? 'Todos marcados como pendientes en CSV' : 'Todos marcados como cargados en CSV',
      { type: 'info' }
    )
  }

  // Cancelar la carga en progreso
  const handleCancelSubmit = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsSubmitting(false)
    setSubmitStatusText('🛑 Proceso de carga cancelado.')
    setBotLogs(prev => [...prev, '🛑 Cancelación solicitada por el usuario.'])
    setTickets(prev =>
      prev.map(t => (t.status === 'loading' ? { ...t, status: 'idle', errorMessage: 'Cancelado' } : t))
    )
  }

  const updateTicketField = (index: number, field: string, value: any) => {
    setTickets(prev => {
      const next = [...prev]
      const current = next[index]!
      const updated = { ...current, [field]: value }
      if (field === 'cargado') {
        const isYes = /^(si|sí|true|1)$/i.test(String(value).trim())
        updated.cargado = isYes ? 'SI' : 'NO'
        updated.status = isYes ? 'success' : 'idle'
      } else if (field !== 'status') {
        updated.status = 'idle'
        updated.errorMessage = undefined
      }
      next[index] = updated
      return next
    })
  }

  const removeTicket = (index: number) => {
    setTickets(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllTickets = () => {
    if (confirm('¿Deseas vaciar toda la lista de comprobantes?')) {
      setTickets([])
      setBotLogs([])
      setBotError(null)
      setSubmitProgress(0)
      setSubmitStatusText('')
    }
  }

  const hasFailedTickets = tickets.some(t => t.status === 'error')

  const content = (
    <YStack
      position="relative"
      flexBasis="auto"
      bg="$background"
      flex={1}
      {...(isWeb && {
        width: '100vw' as any,
        ml: '50%' as any,
        transform: 'translateX(-50%)' as any,
        minHeight: '100vh' as any,
      })}
    >
      <YStack
        pb={isWeb ? '$10' : insets.bottom + 40}
        gap="$6"
        px="$4"
        width="100%"
        maxW={800}
        mx="auto"
        flex={1}
      >
        <YStack flex={1} gap="$4" pt="$4">
          <H1 py="$2" size="$8" text="center">
            Carga Masiva a SIRADIG
          </H1>

          <Theme name="blue">
            <YStack p="$4" bg="$color3" rounded="$4" borderColor="$color6" borderWidth={1} gap="$4">
              <H3>1. Carga de comprobantes</H3>

              {/* Opción 1: Carga desde CSV (Sin consumir cuota de IA) */}
              <YStack p="$3" bg="$color4" rounded="$3" borderColor="$color7" borderWidth={1} gap="$3">
                <XStack justify="space-between" items="center" flexWrap="wrap" gap="$2">
                  <YStack gap="$1" flex={1}>
                    <SizableText fontWeight="bold" size="$4">
                      📊 Importar desde CSV (Recomendado — Sin gastar cuota)
                    </SizableText>
                    <SizableText size="$2" color="$gray11">
                      Carga instantánea utilizando el escaneo ya realizado en el proyecto.
                    </SizableText>
                  </YStack>

                  <Button
                    theme="green"
                    size="$3"
                    onPress={handleLoadDefaultCsv}
                    disabled={isLoading || isSubmitting}
                  >
                    ⚡ Cargar tickets_2026.csv (39 comprobantes)
                  </Button>
                </XStack>

                {isWeb && (
                  <YStack gap="$1" mt="$1">
                    <SizableText size="$2" color="$gray11">O selecciona otro archivo .csv de comprobantes:</SizableText>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvFileUpload}
                      style={{
                        padding: 8,
                        backgroundColor: '#ffffff',
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    />
                  </YStack>
                )}
              </YStack>

              {/* Opción 2: Escaneo con Gemini AI */}
              <YStack gap="$2" pt="$1">
                <SizableText size="$3" fontWeight="600" color="$gray11">
                  📸 Escaneo con IA (Gemini OCR) — Sujeto a límites de cuota:
                </SizableText>
                
                {isWeb && (
                  <YStack gap="$2">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,application/pdf" 
                      onChange={handleFileUpload} 
                      style={{ padding: 10, backgroundColor: '#f3f4f6', borderRadius: 8, border: '1px dashed #d1d5db', cursor: 'pointer' }} 
                    />
                  </YStack>
                )}

                <XStack gap="$2" width="100%" mt="$1">
                  <Input
                    flex={1}
                    placeholder="URL de comprobante (https://...)"
                    value={url}
                    onChangeText={setUrl}
                    size="$4"
                    height={44}
                  />
                  <Button onPress={handleUrlSubmit} theme="blue" px="$4" size="$4" disabled={isLoading || isSubmitting}>
                    Extraer
                  </Button>
                </XStack>
              </YStack>
            </YStack>
          </Theme>

          {isLoading && (
            <YStack p="$6" items="center" justify="center" gap="$3" bg="$gray3" rounded="$4">
              <Spinner size="large" color="$blue10" />
              <SizableText size="$5" fontWeight="bold">{statusMessage}</SizableText>
              <SizableText size="$3" color="$gray11">Por seguridad, procesamos tus archivos de a 1 para evitar límites de cuota en la IA.</SizableText>
            </YStack>
          )}

          {/* Panel de Progreso del Bot de AFIP */}
          {(isSubmitting || botLogs.length > 0) && (
            <Theme name={isSubmitting ? 'blue' : (botError || hasFailedTickets) ? 'red' : 'green'}>
              <YStack
                p="$4"
                bg="$color3"
                rounded="$4"
                borderColor="$color6"
                borderWidth={1}
                gap="$3"
                elevation={2}
              >
                <XStack justify="space-between" items="center">
                  <XStack items="center" gap="$2">
                    {isSubmitting && <Spinner size="small" color="$color10" />}
                    <SizableText fontWeight="bold" size="$4">
                      {isSubmitting
                        ? '🤖 Bot de AFIP en ejecución'
                        : (botError || hasFailedTickets)
                        ? '❌ Error en la carga de AFIP'
                        : '✅ Carga en AFIP finalizada'}
                    </SizableText>
                  </XStack>
                  <SizableText fontWeight="bold" color="$color10">
                    {submitProgress}%
                  </SizableText>
                </XStack>

                {/* Barra de progreso visual */}
                <YStack width="100%" height={8} bg="$color5" rounded="$2" overflow="hidden">
                  <YStack
                    width={`${submitProgress}%`}
                    height="100%"
                    bg="$color10"
                  />
                </YStack>

                <SizableText size="$3" color="$color11" fontWeight="500">
                  {submitStatusText || 'Aguardando actualizaciones del bot...'}
                </SizableText>

                {/* Botones de acción del scraping */}
                <XStack gap="$2" flexWrap="wrap" mt="$2">
                  {isSubmitting ? (
                    <Button
                      theme="red"
                      size="$3"
                      onPress={handleCancelSubmit}
                    >
                      🛑 Cancelar / Detener Carga
                    </Button>
                  ) : (botError || hasFailedTickets) ? (
                    <Button
                      theme="orange"
                      size="$3"
                      onPress={handleAFIPSubmit}
                    >
                      🔄 Reintentar Carga en AFIP ({tickets.length})
                    </Button>
                  ) : null}

                  <Button
                    size="$3"
                    variant="outlined"
                    onPress={() => setShowLogs(prev => !prev)}
                  >
                    {showLogs ? '👁️ Ocultar Logs' : `👁️ Ver Logs (${botLogs.length})`}
                  </Button>
                </XStack>

                {/* Visor de logs del bot en tiempo real */}
                {showLogs && (
                  <YStack
                    mt="$2"
                    p="$3"
                    bg="#1e1e1e"
                    rounded="$3"
                    maxH={200}
                    overflow="scroll"
                  >
                    {botLogs.map((log, lIdx) => (
                      <SizableText key={lIdx} size="$2" color="#e0e0e0" fontFamily="$mono">
                        {log}
                      </SizableText>
                    ))}
                  </YStack>
                )}
              </YStack>
            </Theme>
          )}

          {/* Listado de comprobantes */}
          {tickets.length > 0 && !isLoading && (
            <Theme name="green">
              <YStack gap="$4" mt="$2">
                <XStack justify="space-between" items="center" px="$1" flexWrap="wrap" gap="$2">
                  <H2 size="$6">2. Revisa y edita tus comprobantes</H2>
                  <XStack items="center" gap="$2" flexWrap="wrap">
                    <SizableText color="$color10" fontWeight="bold">
                      {tickets.length} comprobante(s)
                    </SizableText>
                    {!isSubmitting && (
                      <>
                        <Button 
                          size="$2" 
                          theme={tickets.every(t => t.status === 'success' || t.cargado === 'SI') ? 'gray' : 'green'} 
                          variant="outlined" 
                          onPress={toggleMarkAll}
                        >
                          {tickets.every(t => t.status === 'success' || t.cargado === 'SI') ? '↩️ Desmarcar todos' : '✅ Marcar todos'}
                        </Button>
                        <Button size="$2" theme="red" variant="outlined" onPress={clearAllTickets}>
                          🗑️ Vaciar
                        </Button>
                      </>
                    )}
                  </XStack>
                </XStack>

                {hasFailedTickets && (
                  <YStack p="$3" bg="#fef2f2" borderColor="#f87171" borderWidth={1} rounded="$3">
                    <SizableText size="$3" color="#b91c1c" fontWeight="bold">
                      ⚠️ Algunos comprobantes tuvieron errores durante la carga. Puedes corregir los datos abajo y pulsar "Reintentar Carga".
                    </SizableText>
                  </YStack>
                )}
                
                <YStack gap="$4">
                  {tickets.map((ticket, index) => {
                    const isTicketLoading = ticket.status === 'loading'
                    const isTicketError = ticket.status === 'error'
                    const isTicketLoaded = ticket.status === 'success' || ticket.cargado === 'SI'

                    return (
                      <YStack 
                        key={index} 
                        p="$4" 
                        bg={isTicketError ? '#fef2f2' : isTicketLoaded ? '#f0fdf4' : '$color3'} 
                        rounded="$4" 
                        borderColor={isTicketError ? '#ef4444' : isTicketLoaded ? '#22c55e' : '$color6'} 
                        borderWidth={isTicketError || isTicketLoaded ? 2 : 1} 
                        gap="$3"
                        elevation={1}
                      >
                        <XStack justify="space-between" items="center" flexWrap="wrap" gap="$2">
                          <XStack items="center" gap="$2" flexWrap="wrap">
                            <SizableText fontWeight="bold" size="$4">
                              📄 Comprobante #{index + 1}
                            </SizableText>
                            {isTicketLoading && (
                              <XStack items="center" gap="$1">
                                <Spinner size="small" color="$color10" />
                                <SizableText size="$2" color="$color10" fontWeight="bold">
                                  Cargando en AFIP...
                                </SizableText>
                              </XStack>
                            )}
                            {isTicketLoaded && !isTicketLoading && (
                              <YStack px="$2" py="$0.5" bg="#dcfce7" rounded="$2" borderColor="#86efac" borderWidth={1}>
                                <SizableText size="$2" color="#15803d" fontWeight="bold">
                                  ✅ Cargado en AFIP (SI)
                                </SizableText>
                              </YStack>
                            )}
                            {isTicketError && !isTicketLoading && (
                              <YStack px="$2" py="$0.5" bg="#fee2e2" rounded="$2" borderColor="#fca5a5" borderWidth={1}>
                                <SizableText size="$2" color="#b91c1c" fontWeight="bold">
                                  ❌ Error en carga (NO)
                                </SizableText>
                              </YStack>
                            )}
                            {!isTicketLoaded && !isTicketError && !isTicketLoading && (
                              <YStack px="$2" py="$0.5" bg="$color4" rounded="$2">
                                <SizableText size="$2" color="$gray11" fontWeight="500">
                                  ⏳ Pendiente (NO)
                                </SizableText>
                              </YStack>
                            )}
                          </XStack>

                          {!isSubmitting && (
                            <XStack items="center" gap="$2">
                              <Button 
                                size="$2" 
                                theme={isTicketLoaded ? 'gray' : 'green'} 
                                variant={isTicketLoaded ? 'outlined' : undefined}
                                onPress={() => toggleTicketLoaded(index)}
                              >
                                {isTicketLoaded ? '↩️ Desmarcar' : '✓ Marcar Cargado'}
                              </Button>
                              <Button 
                                size="$2" 
                                theme="red" 
                                variant="outlined"
                                onPress={() => removeTicket(index)}
                              >
                                Quitar
                              </Button>
                            </XStack>
                          )}
                        </XStack>

                        {/* Mensaje de error detallado del comprobante */}
                        {isTicketError && ticket.errorMessage && (
                          <YStack p="$2" bg="#fee2e2" rounded="$2">
                            <SizableText size="$2" color="#b91c1c">
                              {ticket.errorMessage}
                            </SizableText>
                          </YStack>
                        )}

                        <XStack gap="$2" flexWrap="wrap">
                          <YStack flex={1} minW={180}>
                            <SizableText size="$1" mb="$1">CUIT Proveedor</SizableText>
                            <Input 
                              value={ticket.cuit || ''} 
                              onChangeText={(val) => updateTicketField(index, 'cuit', val)} 
                              placeholder="CUIT" 
                              size="$3"
                              disabled={isSubmitting}
                            />
                          </YStack>
                          <YStack flex={2} minW={240}>
                            <SizableText size="$1" mb="$1">Denominación / Razón Social</SizableText>
                            <Input 
                              value={ticket.denominacion || ''} 
                              onChangeText={(val) => updateTicketField(index, 'denominacion', val)} 
                              placeholder="Denominación" 
                              size="$3"
                              disabled={isSubmitting}
                            />
                          </YStack>
                        </XStack>

                        <XStack gap="$2" flexWrap="wrap">
                          <YStack flex={1} minW={120}>
                            <SizableText size="$1" mb="$1">Fecha</SizableText>
                            <Input 
                              value={ticket.fecha || ''} 
                              onChangeText={(val) => updateTicketField(index, 'fecha', val)} 
                              placeholder="DD/MM/AAAA" 
                              size="$3"
                              disabled={isSubmitting}
                            />
                          </YStack>
                          <YStack flex={1} minW={120}>
                            <SizableText size="$1" mb="$1">Tipo</SizableText>
                            <Input 
                              value={ticket.tipoFactura || ''} 
                              onChangeText={(val) => updateTicketField(index, 'tipoFactura', val)} 
                              placeholder="Factura B/C, etc" 
                              size="$3"
                              disabled={isSubmitting}
                            />
                          </YStack>
                          <YStack flex={0.8} minW={80}>
                            <SizableText size="$1" mb="$1">PV</SizableText>
                            <Input 
                              value={ticket.puntoVenta || ''} 
                              onChangeText={(val) => updateTicketField(index, 'puntoVenta', val)} 
                              placeholder="00001" 
                              size="$3"
                              disabled={isSubmitting}
                            />
                          </YStack>
                          <YStack flex={1.5} minW={120}>
                            <SizableText size="$1" mb="$1">Nº Comprobante</SizableText>
                            <Input 
                              value={ticket.numeroComprobante || ''} 
                              onChangeText={(val) => updateTicketField(index, 'numeroComprobante', val)} 
                              placeholder="00084210" 
                              size="$3"
                              disabled={isSubmitting}
                            />
                          </YStack>
                          <YStack flex={1.2} minW={120}>
                            <SizableText size="$1" mb="$1">Monto Total</SizableText>
                            <Input 
                              value={String(ticket.montoTotal || '')} 
                              onChangeText={(val) => updateTicketField(index, 'montoTotal', val)} 
                              placeholder="Monto" 
                              size="$3"
                              disabled={isSubmitting}
                            />
                          </YStack>
                        </XStack>
                      </YStack>
                    )
                  })}
                </YStack>

                {(() => {
                  const pendingCount = tickets.filter(t => t.status !== 'success' && t.cargado !== 'SI').length
                  const isAllDone = pendingCount === 0 && tickets.length > 0

                  return (
                    <Button
                      mt="$4"
                      size="$6"
                      theme={isAllDone ? 'green' : hasFailedTickets ? 'orange' : 'green'}
                      onPress={handleAFIPSubmit}
                      disabled={isSubmitting || tickets.length === 0 || isAllDone}
                    >
                      {isSubmitting
                        ? 'Procesando carga en SIRADIG...'
                        : isAllDone
                        ? `🎉 ¡Todos los ${tickets.length} comprobantes están cargados con éxito!`
                        : hasFailedTickets
                        ? `Reintentar Carga (${pendingCount} pendiente(s))`
                        : `Iniciar Carga de ${pendingCount} Comprobante(s) Pendientes en SIRADIG`}
                    </Button>
                  )
                })()}
              </YStack>
            </Theme>
          )}

        </YStack>
      </YStack>
    </YStack>
  )

  if (isWeb) {
    return content
  }

  return (
    <ScrollView flex={1} pt={insets.top + 16}>
      {content}
    </ScrollView>
  )
})
