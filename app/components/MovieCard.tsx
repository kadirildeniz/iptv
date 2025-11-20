import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '@/theme/fonts';

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
}) => {
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: image }}
          style={styles.movieImage}
          resizeMode="cover"
        />
        <View style={styles.overlay}>
          {onFavoritePress && (
            <TouchableOpacity 
              style={styles.favoriteButton} 
              onPress={handleFavoritePress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={20} 
                color={isFavorite ? "#ef4444" : "#ffffff"} 
              />
            </TouchableOpacity>
          )}
          
          {displayRating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {displayRating}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.movieYear}>{year}</Text>
      </View>
    </TouchableOpacity>
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  movieTitle: {
    fontSize: 12,
    color: '#000000',
    marginBottom: 4,
    fontFamily: fonts.semibold,
  },
  movieYear: {
    fontSize: 10,
    color: '#666666',
    fontFamily: fonts.regular,
  },
});

export default memo(MovieCard);
