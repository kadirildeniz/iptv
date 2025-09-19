import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';

interface SeriesCardProps {
  id: string;
  title: string;
  year: string;
  image: string;
  category: string;
  seasons?: number;
}

const SeriesCard: React.FC<SeriesCardProps> = ({
  id,
  title,
  year,
  image,
  category,
  seasons = 1,
}) => {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: image }}
        style={styles.seriesImage}
        resizeMode="cover"
      />
      <View style={styles.seriesInfo}>
        <Text style={styles.seriesTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.seriesYear}>{year}</Text>
        <Text style={styles.seriesSeasons}>{seasons} Sezon</Text>
      </View>
    </View>
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
  seriesImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  seriesInfo: {
    padding: 12,
    backgroundColor: '#ffffff',
  },
  seriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  seriesYear: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  seriesSeasons: {
    fontSize: 12,
    color: '#999999',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
});

export default SeriesCard;
