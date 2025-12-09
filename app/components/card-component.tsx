import { Image, ImageSourcePropType, StyleProp, StyleSheet, Text, Pressable, View, ViewStyle, Animated, useWindowDimensions, findNodeHandle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { getDeviceType, getResponsiveFontSize } from '@/utils/responsive';

interface CardComponentProps {
  title: string;
  description: string;
  image: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  onUpdatePress?: () => void;
  isUpdating?: boolean;
  isUpdateFocused?: boolean;
  onUpdateFocus?: () => void;
  onUpdateBlur?: () => void;
}

const CardComponent = ({
  title,
  description,
  image,
  style,
  onUpdatePress,
  isUpdating,
  isUpdateFocused,
  onUpdateFocus,
  onUpdateBlur
}: CardComponentProps) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const deviceType = getDeviceType(width);

  useEffect(() => {
    if (isUpdating) {
      // Sürekli döndürme animasyonu
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isUpdating]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Responsive değerler
  const titleFontSize = getResponsiveFontSize(width, deviceType === 'mobile' ? 24 : 28);
  const descriptionFontSize = getResponsiveFontSize(width, deviceType === 'mobile' ? 16 : 18);
  const iconSize = deviceType === 'mobile' ? 40 : 50;
  const cardPadding = deviceType === 'mobile' ? 8 : 30;
  const cardPaddingTop = deviceType === 'mobile' ? 50 : 80;

  return (
    <View style={[styles.cardContainer, { padding: cardPadding, paddingTop: cardPaddingTop }, style]}>
      {onUpdatePress && (
        <Pressable
          isTVSelectable={true}
          focusable={true}
          android_tv_focusable={true}
          onFocus={onUpdateFocus}
          onBlur={onUpdateBlur}
          style={[
            styles.updateButton,
            isUpdateFocused && styles.updateButtonFocused
          ]}
          onPress={onUpdatePress}
          disabled={isUpdating}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons
              name={isUpdating ? "refresh" : "refresh-outline"}
              size={20}
              color="#fff"
            />
          </Animated.View>
        </Pressable>
      )}
      <Image source={image} style={[styles.cardImage, { width: iconSize, height: iconSize }]} />
      <Text style={[styles.cardTitle, { fontSize: titleFontSize }]}>{title}</Text>
      <Text style={[styles.cardDescription, { fontSize: descriptionFontSize }]}>{description}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    position: 'relative',
  },
  updateButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    zIndex: 10,
  },
  updateButtonFocused: {
    borderColor: '#00E5FF',
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
    backgroundColor: 'rgba(99, 102, 241, 1)',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.6,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardImage: {
    marginRight: 10,
  },
  cardDescription: {
    color: '#fff',
    fontWeight: '500',
    marginTop: 6,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default CardComponent