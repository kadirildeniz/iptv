import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface ChannelCardProps {
  id: string;
  name: string;
  logo: string;
  subscribers: string;
  quality: string[];
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  id,
  name,
  logo,
  subscribers,
  quality,
  isFavorite,
  onToggleFavorite,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>{logo}</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.channelName}>{name}</Text>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => onToggleFavorite(id)}
          >
            <Text style={[styles.star, isFavorite && styles.starFilled]}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.subscribers}>{subscribers}</Text>
        
        <View style={styles.qualityContainer}>
          {quality.map((q, index) => (
            <View key={index} style={styles.qualityBadge}>
              <Text style={styles.qualityText}>{q}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 27, 42, 0.6)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  channelName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  star: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  starFilled: {
    color: '#1e90ff',
  },
  subscribers: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 6,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  qualityContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  qualityBadge: {
    backgroundColor: '#1e90ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  qualityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
});

export default ChannelCard;
