import { Image, ImageSourcePropType, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';

interface CardComponentProps {
  title: string;
  description: string;
  image: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  onUpdatePress?: () => void;
  isUpdating?: boolean;
}

const CardComponent = ({ title, description, image, style, onUpdatePress, isUpdating }: CardComponentProps) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

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

  return (
    <View style={[styles.cardContainer, style]}>
      {onUpdatePress && (
        <TouchableOpacity 
          style={styles.updateButton}
          onPress={onUpdatePress}
          disabled={isUpdating}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons 
              name={isUpdating ? "refresh" : "refresh-outline"} 
              size={20} 
              color="#fff"
            />
          </Animated.View>
        </TouchableOpacity>
      )}
      <Image source={image} style={styles.cardImage} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    paddingTop: 100,
    padding: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 20,
    width: '100%',
    position: 'relative',
  },
  updateButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 10,
  },
  cardImage: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  cardDescription: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '400',
    marginTop: 3,
  },
});

export default CardComponent