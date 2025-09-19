import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';

interface MovieCardProps {
  id: string;
  title: string;
  year: string;
  image: string;
  category: string;
}

const MovieCard: React.FC<MovieCardProps> = ({
  id,
  title,
  year,
  image,
  category,
}) => {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: image }}
        style={styles.movieImage}
        resizeMode="cover"
      />
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.movieYear}>{year}</Text>
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
  movieImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  movieInfo: {
    padding: 12,
    backgroundColor: '#ffffff',
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  movieYear: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
});

export default MovieCard;
