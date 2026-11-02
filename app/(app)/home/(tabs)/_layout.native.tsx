import { Tabs } from 'one'

export function TabsLayout() {
  return (
    <Tabs
      initialRouteName="ticket"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="ticket" />
    </Tabs>
  )
}
