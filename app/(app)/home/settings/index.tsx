import { memo } from 'react'
import { isWeb, ScrollView, SizableText, YStack } from 'tamagui'
import { Svg, Path, Circle, Line } from 'react-native-svg'
import { H1, H3 } from '~/interface/text/Headings'
import { PageContainer } from '~/interface/layout/PageContainer'

function SpiderWebIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Spiderweb concentric arcs */}
      <Path
        d="M20 20 Q50 30 80 20 Q110 30 140 20"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.4}
      />
      <Path
        d="M35 45 Q58 55 80 45 Q102 55 125 45"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.5}
      />
      <Path
        d="M50 70 Q65 78 80 70 Q95 78 110 70"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.6}
      />
      <Path
        d="M65 95 Q72 100 80 95 Q88 100 95 95"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.7}
      />

      {/* Spiderweb radial lines */}
      <Line
        x1="80"
        y1="120"
        x2="20"
        y2="20"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.6}
      />
      <Line
        x1="80"
        y1="120"
        x2="50"
        y2="15"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.6}
      />
      <Line
        x1="80"
        y1="120"
        x2="80"
        y2="10"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.7}
      />
      <Line
        x1="80"
        y1="120"
        x2="110"
        y2="15"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.6}
      />
      <Line
        x1="80"
        y1="120"
        x2="140"
        y2="20"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.6}
      />

      {/* Thread hanging down */}
      <Line
        x1="80"
        y1="120"
        x2="80"
        y2="142"
        stroke="#64748b"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />

      {/* Little spider */}
      <Circle cx="80" cy="146" r="4.5" fill="#475569" />
      {/* Spider legs */}
      <Path
        d="M76 144 Q72 142 71 146 M76 147 Q71 147 70 150 M84 144 Q88 142 89 146 M84 147 Q89 147 90 150"
        stroke="#475569"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}

export const SettingsPage = memo(() => {
  const content = (
    <YStack flex={1} bg="$background" py="$10" px="$4" items="center" justify="center">
      <PageContainer>
        <YStack
          gap="$5"
          maxW={480}
          mx="auto"
          width="100%"
          items="center"
          justify="center"
          py="$8"
          px="$6"
          bg="$color2"
          rounded="$6"
          borderColor="$color5"
          borderWidth={1}
        >
          {/* Telaraña */}
          <SpiderWebIllustration size={150} />

          <YStack items="center" gap="$2">
            <H1 size="$8" color="$color12" fontWeight="bold">
              Vacío
            </H1>
            <H3
              size="$4"
              color="$color10"
              fontWeight="normal"
              style={{ textAlign: 'center' }}
            >
              Por el momento no hay configuraciones adicionales aquí.
            </H3>
          </YStack>

          <SizableText
            size="$2"
            color="$color9"
            style={{ textAlign: 'center' }}
            lineHeight={20}
          >
            Todas las opciones principales de escaneo, importación de CSV y carga en
            SiRADIG están directamente disponibles desde la pantalla principal y la
            pestaña de usuario.
          </SizableText>
        </YStack>
      </PageContainer>
    </YStack>
  )

  if (isWeb) {
    return content
  }

  return <ScrollView flex={1}>{content}</ScrollView>
})

export default SettingsPage
