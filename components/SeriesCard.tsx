import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: image }}
        style={styles.seriesImage}
        resizeMode="cover"
      />
      {onFavoritePress && (
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? '#f97316' : '#ffffff'}
          />
        </TouchableOpacity>
      )}
      <View style={styles.seriesInfo}>
        <Text style={styles.seriesTitle} numberOfLines={2}>
          {title}
        </Text>
        {year ? <Text style={styles.seriesYear}>{year}</Text> : null}
        {seasons !== undefined && seasons > 0 ? (
          <Text style={styles.seriesSeasons}>{seasons} Sezon</Text>
        ) : null}
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
    position: 'relative',
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
  },
  seriesInfo: {
    padding: 12,
    backgroundColor: '#ffffff',
  },
  seriesTitle: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
    fontFamily: fonts.semibold,
  },
  seriesYear: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
    fontFamily: fonts.regular,
  },
  seriesSeasons: {
    fontSize: 12,
    color: '#999999',
    fontFamily: fonts.regular,
  },
});

export default SeriesCard;
