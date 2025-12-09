import { Dimensions, Platform } from 'react-native';

export const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
};

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'tv';

// TV tespiti - Platform.isTV zaten doğru çalışıyor
console.log('🔍 Platform Debug:', {
    isTV: Platform.isTV,
    OS: Platform.OS,
    Version: Platform.Version,
});

const { width, height } = Dimensions.get('window');

// Platform.isTV zaten true dönüyor
export const isTV = Platform.isTV === true;

console.log('📺 TV Tespit Sonucu:', {
    isTV,
    width,
    height,
    'Platform.isTV': Platform.isTV,
});

export const getDeviceType = (width: number): DeviceType => {
    if (width < BREAKPOINTS.mobile) return 'mobile';
    if (width < BREAKPOINTS.tablet) return 'tablet';
    return 'desktop';
};

export const getResponsiveValue = <T>(
    width: number,
    values: { mobile: T; tablet: T; desktop: T; tv: T }
): T => {
    const deviceType = getDeviceType(width);
    return values[deviceType];
};

export const isMobile = (width: number): boolean => {
    return width < BREAKPOINTS.mobile;
};

export const isTablet = (width: number): boolean => {
    return width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
};

export const isDesktop = (width: number): boolean => {
    return width >= BREAKPOINTS.tablet;
};

// Get responsive font size
export const getResponsiveFontSize = (width: number, baseSize: number): number => {
    const deviceType = getDeviceType(width);
    const multipliers = {
        mobile: 0.9,
        tablet: 1.0,
        desktop: 1.1,
        tv: 1.2,
    };
    return baseSize * multipliers[deviceType];
};

// Get responsive spacing
export const getResponsiveSpacing = (width: number, baseSpacing: number): number => {
    const deviceType = getDeviceType(width);
    const multipliers = {
        mobile: 0.8,
        tablet: 1.0,
        desktop: 1.2,
        tv: 1.4,
    };
    return baseSpacing * multipliers[deviceType];
};
