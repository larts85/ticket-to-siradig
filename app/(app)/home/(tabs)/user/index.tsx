import { memo, useEffect, useState } from 'react'
import { isWeb, ScrollView, SizableText, Theme, XStack, YStack } from 'tamagui'
import { Button } from '~/interface/buttons/Button'
import { Input } from '~/interface/forms/Input'
import { H1, H2, H3 } from '~/interface/text/Headings'
import { showToast } from '~/interface/toast/helpers'
import { PageContainer } from '~/interface/layout/PageContainer'
import { PasswordIcon } from '~/interface/icons/phosphor/PasswordIcon'
import { UserCircleIcon } from '~/interface/icons/phosphor/UserCircleIcon'

export const UserCredentialsPage = memo(() => {
  const [cuit, setCuit] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false)

  // Cargar credenciales desde sessionStorage al montar el componente
  useEffect(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const storedCuit = window.sessionStorage.getItem('arca_cuit') || ''
      const storedPass = window.sessionStorage.getItem('arca_password') || ''
      if (storedCuit || storedPass) {
        setCuit(storedCuit)
        setPassword(storedPass)
        setHasStoredCredentials(Boolean(storedCuit && storedPass))
      }
    }
  }, [])

  const handleSave = () => {
    const cleanCuit = cuit.replace(/\D/g, '')
    if (!cleanCuit || cleanCuit.length < 10) {
      showToast('Ingresa un CUIT válido (10 u 11 dígitos)', { type: 'error' })
      return
    }
    if (!password.trim()) {
      showToast('Ingresa tu Clave Fiscal de ARCA / AFIP', { type: 'error' })
      return
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('arca_cuit', cleanCuit)
      window.sessionStorage.setItem('arca_password', password.trim())
      setHasStoredCredentials(true)
      showToast('Credenciales guardadas en la sesión del navegador', { type: 'success' })
    }
  }

  const handleClear = () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('arca_cuit')
      window.sessionStorage.removeItem('arca_password')
    }
    setCuit('')
    setPassword('')
    setHasStoredCredentials(false)
    showToast('Credenciales eliminadas de la sesión', { type: 'info' })
  }

  const content = (
    <YStack flex={1} bg="$background" py="$6" px="$4">
      <PageContainer>
        <YStack gap="$6" maxW={600} mx="auto" width="100%">
          {/* Encabezado */}
          <YStack gap="$2">
            <XStack items="center" gap="$3">
              <UserCircleIcon size={32} color="$color11" />
              <H1 size="$7">Credenciales ARCA / AFIP</H1>
            </XStack>
            <SizableText size="$3" color="$color11">
              Configura tus credenciales para autenticarte y cargar comprobantes en
              SiRADIG.
            </SizableText>
          </YStack>

          {/* Banner de Seguridad y Privacidad */}
          <Theme name="blue">
            <YStack
              p="$4"
              bg="$color3"
              rounded="$4"
              borderColor="$color6"
              borderWidth={1}
              gap="$2"
            >
              <XStack items="center" gap="$2">
                <SizableText size="$5">🛡️</SizableText>
                <H3 size="$4" color="$color12" fontWeight="bold">
                  Seguridad en tu Navegador
                </H3>
              </XStack>
              <SizableText size="$2" color="$color11" lineHeight={20}>
                Estas credenciales se conservan{' '}
                <strong>únicamente en la sesión actual de tu navegador</strong> (
                <code style={{ fontFamily: 'monospace' }}>sessionStorage</code>).
                <strong> No se guardan</strong> en ninguna base de datos ni servidor
                permanente. Cuando cierres la pestaña o navegador, se descartarán de forma
                automática.
              </SizableText>
            </YStack>
          </Theme>

          {/* Estado actual */}
          <XStack
            p="$3"
            bg={hasStoredCredentials ? '#ecfdf5' : '$color3'}
            borderColor={hasStoredCredentials ? '#a7f3d0' : '$color6'}
            borderWidth={1}
            rounded="$3"
            items="center"
            justify="space-between"
          >
            <XStack items="center" gap="$2">
              <SizableText
                size="$3"
                fontWeight="bold"
                color={hasStoredCredentials ? '#065f46' : '$color11'}
              >
                {hasStoredCredentials
                  ? '🔒 Credenciales activas en esta sesión'
                  : '⚠️ Sin credenciales en sesión (se intentará usar entorno local)'}
              </SizableText>
            </XStack>
            {hasStoredCredentials && (
              <Button size="$2" theme="red" variant="outlined" onPress={handleClear}>
                Borrar
              </Button>
            )}
          </XStack>

          {/* Formulario */}
          <YStack
            gap="$4"
            bg="$color2"
            p="$5"
            rounded="$5"
            borderColor="$color5"
            borderWidth={1}
          >
            <YStack gap="$2">
              <SizableText size="$3" fontWeight="600">
                CUIT / CUIL Fiscal
              </SizableText>
              <Input
                value={cuit}
                onChangeText={setCuit}
                placeholder="20-12345678-9 o 20123456789"
                keyboardType="numeric"
                size="$4"
              />
              <SizableText size="$1" color="$color10">
                CUIT sin guiones o con formato estándar de 11 dígitos.
              </SizableText>
            </YStack>

            <YStack gap="$2">
              <XStack justify="space-between" items="center">
                <SizableText size="$3" fontWeight="600">
                  Clave Fiscal de ARCA
                </SizableText>
                <Button
                  size="$1"
                  variant="transparent"
                  onPress={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </Button>
              </XStack>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Ingresa tu clave fiscal"
                secureTextEntry={!showPassword}
                size="$4"
              />
              <SizableText size="$1" color="$color10">
                Clave con la que accedes al portal de AFIP / ARCA.
              </SizableText>
            </YStack>

            <XStack gap="$3" mt="$2">
              <Button
                theme="green"
                size="$4"
                flex={1}
                onPress={handleSave}
                icon={<PasswordIcon size={18} />}
              >
                Guardar en Sesión
              </Button>
              {hasStoredCredentials && (
                <Button theme="red" variant="outlined" size="$4" onPress={handleClear}>
                  Eliminar
                </Button>
              )}
            </XStack>
          </YStack>
        </YStack>
      </PageContainer>
    </YStack>
  )

  if (isWeb) {
    return content
  }

  return <ScrollView flex={1}>{content}</ScrollView>
})

export default UserCredentialsPage
