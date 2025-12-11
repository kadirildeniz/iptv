import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, StyleProp, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '@/theme/fonts';

interface SeriesCardProps {
  id: string;
  title: string;
  year: string;
  image: string;
  category: string;
  seasons?: number;
  isFavorite?: boolean;
  onPress?: (id: string) => void;
  onFavoritePress?: (id: string) => void;
  height?: number;
  width?: number;
  style?: StyleProp<ViewStyle>;
}

const SeriesCard: React.FC<SeriesCardProps> = ({
  id,
  title,
  year,
  image,
  category,
  seasons,
  isFavorite = false,
  onPress,
  onFavoritePress,
  height = 200,
  width,
  style,
}) => {
  const [cardFocused, setCardFocused] = useState(false);
  const [favFocused, setFavFocused] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress(id);
    }
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    if (onFavoritePress) {
      onFavoritePress(id);
    }
  };

  const isTV = Platform.isTV;

  return (
    <Pressable
      isTVSelectable={isTV}
      focusable={isTV}
      android_tv_focusable={isTV}
      onFocus={isTV ? () => setCardFocused(true) : undefined}
      onBlur={isTV ? () => setCardFocused(false) : undefined}
      style={[
        styles.card,
        width ? { width } : undefined,
        style,
        isTV && cardFocused && styles.cardFocused
      ]}
      onPress={handlePress}
    >
      <Image
        source={{ uri: image }}
        style={[styles.seriesImage, { height: height }]}
        resizeMode="cover"
      />
      {onFavoritePress && (
        <Pressable
          isTVSelectable={isTV}
          focusable={isTV}
          android_tv_focusable={isTV}
          onFocus={isTV ? () => setFavFocused(true) : undefined}
          onBlur={isTV ? () => setFavFocused(false) : undefined}
          style={[
            styles.favoriteButton,
            isTV && favFocused && styles.favoriteFocused
          ]}
          onPress={handleFavoritePress}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? '#f97316' : '#ffffff'}
          />
        </Pressable>
      )}
      <View style={styles.seriesInfo}>
        <Text style={styles.seriesTitle} numberOfLines={1}>
          {title}
        </Text>
        {year ? <Text style={styles.seriesYear} numberOfLines={1}>{year}</Text> : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
    position: 'relative',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: '#00E5FF',
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  seriesImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  favoriteFocused: {
    borderColor: '#00E5FF',
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  seriesInfo: {
    padding: 6,
    backgroundColor: '#ffffff',
    height: 42,
    overflow: 'hidden',
  },
  seriesTitle: {
    fontSize: 11,
    color: '#000000',
    fontFamily: fonts.semibold,
  },
  seriesYear: {
    fontSize: 10,
    color: '#666666',
    fontFamily: fonts.regular,
  },
  seriesSeasons: {
    fontSize: 10,
    color: '#999999',
    fontFamily: fonts.regular,
  },
});

export default SeriesCard;
