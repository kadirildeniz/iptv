import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  console.log('🔍 RootLayout render ediliyor');

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="live-tv" options={{ headerShown: false }} />
      <Stack.Screen name="movies" options={{ headerShown: false }} />
      <Stack.Screen name="series" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
      <StatusBar style="auto" />
    </Stack>
  );
}
