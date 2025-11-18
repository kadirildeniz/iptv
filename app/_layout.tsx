import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  console.log('🔍 RootLayout render ediliyor');

  const [fontsLoaded, fontError] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
      
      // Fonts yüklendikten sonra orientation lock yap
      if (Platform.OS !== 'web') {
        const lockOrientation = async () => {
          try {
            // Activity'nin hazır olması için biraz bekle
            await new Promise(resolve => setTimeout(resolve, 1000));
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            console.log('✅ Orientation locked to landscape');
          } catch (err: any) {
            // Activity hatası varsa sessizce geç
            if (!err?.message?.includes('activity') && !err?.message?.includes('Activity')) {
              console.warn('⚠️ Orientation lock failed:', err);
            }
          }
        };
        lockOrientation();
      }
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <StatusBar style="dark" />
    </>
  );
}
