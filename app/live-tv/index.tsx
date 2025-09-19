import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import CategoryList from '@/app/components/CategoryList';
import ChannelCard from '@/app/components/ChannelCard';
import VideoPlayer from '@/app/components/VideoPlayer';

interface Channel {
  id: string;
  name: string;
  logo: string;
  subscribers: string;
  quality: string[];
  description: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
}

const LiveTv: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('series');
  const [selectedChannel] = useState<Channel | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const categories: Category[] = [
    { id: 'sports', name: 'Spor Kanalları' },
    { id: 'news', name: 'Haber Kanalları' },
    { id: 'series', name: 'Dizi Kanalları' },
    { id: 'foreign', name: 'Yabancı Kanallar' },
    { id: 'documentary', name: 'Belgesel Kanalları' },
  ];

  const channels: Channel[] = [
    {
      id: 'disney',
      name: 'Disney Channel',
      logo: 'DISNEY',
      subscribers: '+8.2 Million',
      quality: ['HD', '4K'],
      description: 'Çizgi film ve animasyon içerikleri ile çocukların favori kanalı. En sevilen Disney karakterleri ve orijinal diziler.',
      type: 'Çizgi Film ve Animasyon',
    },
    {
      id: 'mtv',
      name: 'MTV Music',
      logo: 'MTV',
      subscribers: '+5.1 Million',
      quality: ['HD'],
      description: 'Müzik videoları, konserler ve gençlik programları. En popüler şarkılar ve sanatçılar.',
      type: 'Müzik ve Eğlence',
    },
    {
      id: 'natgeo',
      name: 'National Geographic',
      logo: 'NAT GEO',
      subscribers: '+12.3 Million',
      quality: ['HD', '4K'],
      description: 'Doğa, bilim ve keşif belgeselleri. Dünyanın en uzak köşelerini keşfedin.',
      type: 'Belgesel ve Keşif',
    },
    {
      id: 'hbo',
      name: 'HBO Family',
      logo: 'HBO',
      subscribers: '+6.8 Million',
      quality: ['HD', '4K'],
      description: 'Kaliteli film ve dizi içerikleri. Ailece izlenebilecek premium içerikler.',
      type: 'Film ve Dizi',
    },
  ];

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleToggleFavorite = (channelId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(channelId)) {
      newFavorites.delete(channelId);
    } else {
      newFavorites.add(channelId);
    }
    setFavorites(newFavorites);
  };

  const currentChannel = selectedChannel || channels[0];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Left Panel - Categories */}
        <CategoryList
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={handleToggleMobileMenu}
        />

        {/* Middle Panel - Channel Cards */}
        <ScrollView 
          style={styles.channelsContainer}
          contentContainerStyle={styles.channelsContent}
          showsVerticalScrollIndicator={false}
        >
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              id={channel.id}
              name={channel.name}
              logo={channel.logo}
              subscribers={channel.subscribers}
              quality={channel.quality}
              isFavorite={favorites.has(channel.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </ScrollView>

        {/* Right Panel - Video Player */}
        <VideoPlayer
          channelName={currentChannel.name}
          channelDescription={currentChannel.description}
          channelType={currentChannel.type}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
    ...(Platform.OS === 'web' && {
      background: 'linear-gradient(135deg, #0d1b2a 0%, #1e3a8a 50%, #0d1b2a 100%)',
    }),
  },
  content: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    padding: Platform.OS === 'web' ? 24 : 16,
    gap: Platform.OS === 'web' ? 24 : 16,
  },
  channelsContainer: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 450 : '100%',
    ...(Platform.OS === 'web' && {
      minWidth: 400,
    }),
  },
  channelsContent: {
    paddingBottom: 20,
    paddingTop: Platform.OS === 'web' ? 0 : 20,
  },
});

export default LiveTv;