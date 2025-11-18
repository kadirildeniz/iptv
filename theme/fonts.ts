import { Platform } from 'react-native';

export const fonts = {
  regular: Platform.select({
    web: 'Outfit, sans-serif',
    default: 'Outfit-Regular',
  }) as string,
  medium: Platform.select({
    web: 'Outfit, sans-serif',
    default: 'Outfit-Medium',
  }) as string,
  semibold: Platform.select({
    web: 'Outfit, sans-serif',
    default: 'Outfit-SemiBold',
  }) as string,
  bold: Platform.select({
    web: 'Outfit, sans-serif',
    default: 'Outfit-Bold',
  }) as string,
};

