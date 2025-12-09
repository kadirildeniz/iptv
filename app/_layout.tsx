import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StatusBar, AppState } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import ErrorBoundary from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => { });

      // Fonts yüklendikten sonra orientation lock yap
      if (Platform.OS !== 'web') {
        const lockOrientation = async () => {
          try {
            // Activity'nin hazır olması için biraz bekle
            await new Promise(resolve => setTimeout(resolve, 1000));
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

            // Android'de navigation bar'ı gizle (immersive mode)
            if (Platform.OS === 'android') {
              await NavigationBar.setPositionAsync('absolute');
              await NavigationBar.setBackgroundColorAsync('#00000000');
              await NavigationBar.setVisibilityAsync('hidden');
              await NavigationBar.setBehaviorAsync('overlay-swipe');

              // AppState değişimlerini dinle ve tekrar gizle
              AppState.addEventListener('change', nextAppState => {
                if (nextAppState === 'active') {
                  NavigationBar.setVisibilityAsync('hidden');
                  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                }
              });
            }
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
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <ExpoStatusBar style="dark" hidden={true} />
    </ErrorBoundary>
  );
}

