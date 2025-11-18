import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { fonts } from '@/theme/fonts';

interface MovieCardProps {
  id: string;
  title: string;
  year: string;
  image: string;
  category: string;
  rating?: string | number;
  rating_5based?: number;
  onPress?: (id: string) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({
  id,
  title,
  year,
  image,
  category,
  rating,
  rating_5based,
  onPress,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(id);
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
      <Image
        source={{ uri: image }}
        style={styles.movieImage}
        resizeMode="cover"
      />
      {displayRating && (
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>⭐ {displayRating}</Text>
        </View>
      )}
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
  movieImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
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
