import React, { memo, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '@/theme/fonts';
import { TV_FOCUS_STYLE, TV_BASE_BORDER } from '@/constants/tvStyles';

interface MovieCardProps {
  id: string;
  title: string;
  year: string;
  image: string;
  category: string;
  rating?: string | number;
  rating_5based?: number;
  isFavorite?: boolean;
  onPress?: (id: string) => void;
  onFavoritePress?: (id: string) => void;
  height?: number;
  width?: number;
  style?: any;
}

const MovieCard: React.FC<MovieCardProps> = ({
  id,
  title,
  year,
  image,
  category,
  rating,
  rating_5based,
  isFavorite = false,
  onPress,
  onFavoritePress,
  height = 200,
  width,
  style,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(id);
    }
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    onFavoritePress?.(id);
  };

  // Manuel focus state
  const [isCardFocused, setIsCardFocused] = useState(false);
  const [isFavFocused, setIsFavFocused] = useState(false);

  // Rating formatla
  const formatRating = () => {
    if (rating_5based !== undefined && rating_5based !== null) {
      // 5 üzerinden rating'i 10 üzerinden göster
      const rating10 = (rating_5based * 2).toFixed(1);
      return rating10;
    }
    if (rating) {
      // String rating varsa (örn: "8.5/10")
      if (typeof rating === 'string') {
        // Sadece sayıyı al
        const match = rating.match(/[\d.]+/);
        return match ? match[0] : null;
      }
      return rating.toString();
    }
    return null;
  };

  const displayRating = formatRating();

  const isTV = Platform.isTV;

  return (
    <Pressable
      isTVSelectable={isTV}
      focusable={isTV}
      android_tv_focusable={isTV}
      onFocus={isTV ? () => setIsCardFocused(true) : undefined}
      onBlur={isTV ? () => setIsCardFocused(false) : undefined}
      style={[
        styles.card,
        TV_BASE_BORDER,
        width ? { width } : undefined,
        style,
        isTV && isCardFocused && TV_FOCUS_STYLE
      ]}
      onPress={handlePress}
    >
      <View style={[styles.imageContainer, { height }]}>
        <Image
          source={{ uri: image }}
          style={styles.movieImage}
          resizeMode="cover"
        />
        <View style={styles.overlay}>
          {onFavoritePress && (
            <Pressable
              focusable={isTV}
              onFocus={isTV ? () => setIsFavFocused(true) : undefined}
              onBlur={isTV ? () => setIsFavFocused(false) : undefined}
              style={[
                styles.favoriteButton,
                isTV && isFavFocused && {
                  borderColor: '#00E5FF',
                  borderWidth: 2,
                  transform: [{ scale: 1.1 }],
                }
              ]}
              onPress={handleFavoritePress}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite ? "#ef4444" : "#ffffff"}
              />
            </Pressable>
          )}

          {displayRating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {displayRating}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.movieYear} numberOfLines={1}>{year}</Text>
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
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  movieImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexDirection: 'column',
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto', // Aşağı itmek için
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  movieInfo: {
    padding: 6,
    backgroundColor: '#ffffff',
    height: 42,
    overflow: 'hidden',
  },
  movieTitle: {
    fontSize: 11,
    color: '#000000',
    fontFamily: fonts.semibold,
  },
  movieYear: {
    fontSize: 10,
    color: '#666666',
    fontFamily: fonts.regular,
  },
});

export default memo(MovieCard);
