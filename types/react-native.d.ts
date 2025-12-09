import 'react-native';

declare module 'react-native' {
    export interface PressableStateCallbackType {
        readonly pressed: boolean;
        /**
         * Android TV / tvOS için odak durumu
         */
        readonly focused?: boolean;
    }

    export interface PressableProps {
        /**
         * Android TV: Bu bileşen D-Pad ile odaklanabilir mi?
         */
        isTVSelectable?: boolean;
        /**
         * Android TV: Uygulama açıldığında ilk odak buraya mı gelsin?
         */
        hasTVPreferredFocus?: boolean;
        /**
         * Android TV: Ekstra focus garantisi (bazı cihazlarda şart)
         */
        android_tv_focusable?: boolean;
    }
}
Özet