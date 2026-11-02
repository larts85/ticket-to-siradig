import { Redirect, Slot, Stack, usePathname } from 'one'
import { Configuration } from 'tamagui'

import { useAuth } from '~/features/auth/client/authClient'
import { DialogProvider } from '~/interface/dialogs/Dialog'
import { PlatformSpecificRootProvider } from '~/interface/platform/PlatformSpecificRootProvider'
import { ToastProvider } from '~/interface/toast/Toast'
import { ProvideZero } from '~/zero/client'

export function AppLayout() {
  const { state, session } = useAuth()
  const pathname = usePathname()

  // Only block render during the initial loading if there's no session
  if (state === 'loading' && !session) {
    return null
  }

  // Temporarily bypass auth for testing
  /*
  // redirect logged-out users away from protected routes
  const isLoggedInRoute = pathname.startsWith('/home')
  if (state === 'logged-out' && isLoggedInRoute) {
    return <Redirect href="/auth/login" />
  }

  // redirect logged-in users away from auth routes
  const isAuthRoute = pathname.startsWith('/auth')
  if (state === 'logged-in' && isAuthRoute) {
    return <Redirect href="/home/ticket" />
  }
  */

  return (
    <Configuration disableSSR>
      <ProvideZero>
        <ToastProvider>
          <DialogProvider>
            <PlatformSpecificRootProvider>
              {process.env.VITE_PLATFORM === 'web' ? (
                <Slot />
              ) : (
                // We need Stack here for transition animation to work on native
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="home" />
                  <Stack.Screen name="auth" />
                </Stack>
              )}
            </PlatformSpecificRootProvider>
          </DialogProvider>
        </ToastProvider>
      </ProvideZero>
    </Configuration>
  )
}
