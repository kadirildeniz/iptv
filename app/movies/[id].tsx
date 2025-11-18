import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import VideoPlayer from '@/app/components/VideoPlayer';
import { movieService, databaseService, type Movie, type VodInfo } from '@/services';
import { fonts } from '@/theme/fonts';

const MovieDetail: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [movieInfo, setMovieInfo] = useState<VodInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchCast, setSearchCast] = useState('');
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      loadMovieDetails();
    }
  }, [id]);

  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Film temel bilgilerini getir
      const movieData = await movieService.getMovieById(id);
      if (!movieData) {
        setError('Film bulunamadı');
        return;
      }

      setMovie(movieData);
      const isFav = await databaseService.isFavorite(movieData.stream_id.toString());
      setIsFavorite(isFav);

      // Film detay bilgilerini getir
      try {
        const info = await movieService.getMovieInfo(id);
        setMovieInfo(info);
      } catch (err) {
        console.warn('Film detay bilgileri yüklenemedi:', err);
        // Detay bilgileri yüklenemese bile devam et
      }
    } catch (err) {
      console.error('Film yüklenirken hata:', err);
      setError('Film yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration: string | undefined): string => {
    if (!duration) return 'Bilinmiyor';
    
    // Saniye cinsinden geliyorsa dakika/saat'e çevir
    if (duration.includes('sec') || duration.match(/^\d+$/)) {
      const seconds = parseInt(duration);
      if (!isNaN(seconds)) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
          return `${hours}s ${minutes}dk`;
        }
        return `${minutes}dk`;
      }
    }
    
    return duration;
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Bilinmiyor';
    
    // YYYY-MM-DD formatında ise
    if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    
    // Sadece yıl varsa
    if (dateString.match(/^\d{4}$/)) {
      return dateString;
    }
    
    return dateString;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Film yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!movie || error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>❌ {error || 'Film bulunamadı'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const baseInfo = (movieInfo?.info || movie.info || {}) as any;
  const poster =
    baseInfo.movie_image ||
    baseInfo.cover_big ||
    movie.stream_icon ||
    'https://via.placeholder.com/800x1200/001b5b/ffffff?text=Movie';

  const ratingValue =
    movie.rating_5based !== undefined && movie.rating_5based !== null
      ? (movie.rating_5based * 2).toFixed(1)
      : movie.rating || baseInfo.rating?.toFixed?.(1) || baseInfo.rating_count_kinopoisk?.toFixed?.(1);

  const genres = baseInfo.genre ? String(baseInfo.genre).split(/[,|]/).map((g) => g.trim()).filter(Boolean) : [];

  const rawCast: Array<any> = Array.isArray(baseInfo.actor_list)
    ? baseInfo.actor_list
    : Array.isArray(baseInfo.cast_list)
    ? baseInfo.cast_list
    : baseInfo.actors
    ? String(baseInfo.actors)
        .split(',')
        .map((name: string) => ({ name: name.trim() }))
    : [];

  const castList: Array<{ name: string; role?: string; image?: string | null }> = rawCast
    .map((member: any) => ({
      name:
        member?.name ||
        member?.actor ||
        member?.title ||
        (typeof member === 'string' ? member : '') ||
        '',
      role: member?.role || member?.character || member?.type || '',
      image:
        member?.photo ||
        member?.image ||
        member?.picture ||
        member?.img ||
        member?.avatar ||
        member?.url ||
        member?.profile ||
        null,
    }))
    .filter((member) => member.name);

  const filteredCast = castList.filter((member) =>
    member.name?.toLowerCase().includes(searchCast.toLowerCase()),
  );

  const crew =
    baseInfo.director ||
    baseInfo.directors ||
    (Array.isArray(baseInfo.director_list) ? baseInfo.director_list.map((d: any) => d.name).join(', ') : undefined);

  const description = baseInfo.plot || baseInfo.description || baseInfo.story;

  const mediaItems =
    (Array.isArray((movieInfo as any)?.streams)
      ? (movieInfo as any).streams
      : []
    )
      .filter((stream: any) => ['trailer', 'teaser', 'clip'].includes((stream?.category || '').toLowerCase()))
      .map((stream: any) => ({
        title: stream.title || stream.name || 'Fragman',
        duration: stream?.duration ? formatDuration(stream.duration.toString()) : 'Medya',
      }));

  const tabs = ['Özet', 'Oyuncular', 'Medya'];

  const handleToggleFavorite = async () => {
    if (!movie) return;
    if (isTogglingFavorite) return;

    try {
      setIsTogglingFavorite(true);
      const next = await databaseService.toggleFavorite({
        id: movie.stream_id.toString(),
        type: 'movie',
        title: movie.name,
        poster: poster,
      });
      setIsFavorite(next);
    } catch (favoriteError) {
      console.error('Favori güncelleme hatası:', favoriteError);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Image source={{ uri: poster }} style={styles.heroPoster} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <TouchableOpacity style={styles.heroBackButton} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroFavoriteButton}
              activeOpacity={0.85}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? '#f97316' : '#f97316'}
              />
            </TouchableOpacity>

            <View style={styles.heroInfo}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroTitle}>{movie.name || baseInfo?.name}</Text>
              </View>
              <Text style={styles.heroMeta}>
                {formatDate(baseInfo?.releasedate)} · {formatDuration(baseInfo?.duration || baseInfo?.duration_secs?.toString())} · {genres[0] || 'Tür Bilinmiyor'}
              </Text>

              <View style={styles.heroActions}>
                <TouchableOpacity
                  style={[styles.playButton, !movie.streamUrl && styles.playButtonDisabled]}
                  activeOpacity={0.9}
                  disabled={!movie.streamUrl}
                  onPress={() => setIsPlayerVisible(true)}
                >
                  <Ionicons name="play" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.playButtonText}>Oynat</Text>
                </TouchableOpacity>
                {ratingValue && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                    <Text style={styles.ratingText}>IMDb {ratingValue}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Özet</Text>
              <Text style={styles.sectionText}>{description}</Text>
            </View>
          )}

          {(crew || castList.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Oyuncular ve Ekip</Text>
              
              </View>
              <View style={styles.castGrid}>
                {crew && (
                  <View style={styles.castItem}>
                    <View style={[styles.castAvatar, styles.castAvatarDirector]}>
                      <Ionicons name="film-outline" size={22} color="#bfdbfe" />
                    </View>
                    <Text style={styles.castName}>{crew}</Text>
                    <Text style={styles.castRole}>Yönetmen</Text>
                  </View>
                )}
                {filteredCast.length > 0 ? (
                  filteredCast.slice(0, 10).map((member, index) => {
                    const memberAny = member as any;
                    const imageUri =
                      member?.image ||
                      memberAny?.photo ||
                      memberAny?.picture ||
                      memberAny?.img ||
                      memberAny?.avatar ||
                      memberAny?.profile ||
                      memberAny?.url;

                    return (
                      <View style={styles.castItem} key={`${member.name}-${index}`}>
                        <View style={styles.castAvatar}>
                          {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.castAvatarImage} />
                          ) : (
                            <Ionicons name="person" size={20} color="#bae6fd" />
                          )}
                        </View>
                        <Text style={styles.castName} numberOfLines={1}>
                          {member.name}
                        </Text>
                        {member.role ? (
                          <Text style={styles.castRole} numberOfLines={1}>
                            {member.role}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.castEmptyText}>Oyuncu bilgisi bulunamadı.</Text>
                )}
              </View>
            </View>
          )}

          {mediaItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fragmanlar ve Medya</Text>
              <FlatList
                data={mediaItems}
                keyExtractor={(_, index) => `trailer-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaRow}
                renderItem={({ item }) => (
                  <View style={styles.mediaCard}>
                    <Ionicons name="play-circle" size={36} color="#1d4ed8" />
                    <Text style={styles.mediaTitle}>{item.title}</Text>
                    <Text style={styles.mediaMeta}>{item.duration}</Text>
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </ScrollView>
      {isPlayerVisible && movie.streamUrl && (
        <View style={styles.playerOverlay}>
          <TouchableOpacity
            style={styles.playerCloseButton}
            onPress={() => setIsPlayerVisible(false)}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.playerWrapper}>
            <VideoPlayer
              channelName={movie.name}
              channelDescription={description || ''}
              channelType={genres.join(', ') || 'Film'}
              streamUrl={movie.streamUrl}
              variant="fullscreen"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0033ab',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    position: 'relative',
    width: '100%',
    height: Platform.OS === 'web' ? 420 : 420,
    marginBottom: 24,
  },
  heroPoster: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 8, 30, 0.65)',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  heroBackButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 28 : 48,
    left: 20,
    backgroundColor: 'rgba(3, 12, 40, 0.75)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  heroFavoriteButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 28 : 48,
    right: 20,
    backgroundColor: 'rgba(8, 23, 61, 0.8)',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 38 : 28,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
    flex: 1,
    marginRight: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#facc15',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  ratingIcon: {
    color: '#0f172a',
    fontSize: 16,
    marginRight: 6,
  },
  ratingText: {
    color: '#0f172a',
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  heroMeta: {
    marginTop: 12,
    color: 'rgba(226, 232, 240, 0.75)',
    fontSize: 13,
    fontFamily: fonts.medium,
    letterSpacing: 0.3,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  playButtonDisabled: {
    backgroundColor: 'rgba(14, 165, 233, 0.35)',
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.semibold,
    letterSpacing: 0.4,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(2, 10, 38, 0.65)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  heroTabs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  heroTab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(2, 10, 38, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  heroTabActive: {
    backgroundColor: '#1d4ed8',
    borderColor: 'rgba(56, 189, 248, 0.6)',
  },
  heroTabText: {
    color: 'rgba(226, 232, 240, 0.75)',
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  heroTabTextActive: {
    color: '#f8fafc',
  },
  body: {
    paddingHorizontal: Platform.OS === 'web' ? 40 : 20,
    paddingBottom: 40,
    gap: 32,
  },
  section: {
    backgroundColor: 'rgba(5, 16, 46, 0.78)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    shadowColor: '#020617',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  sectionText: {
    color: 'rgba(226, 232, 240, 0.8)',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: fonts.regular,
  },
  castSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(13, 31, 74, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.25)',
    gap: 8,
  },
  castSearchInput: {
    color: '#dbeafe',
    fontSize: 13,
    fontFamily: fonts.regular,
    minWidth: 120,
  },
  castGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  castItem: {
    width: Platform.OS === 'web' ? '19%' : '30%',
    minWidth: 120,
    alignItems: 'center',
    gap: 8,
  },
  castAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(12, 42, 104, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  castAvatarDirector: {
    borderColor: 'rgba(59, 130, 246, 0.45)',
    backgroundColor: 'rgba(30, 64, 175, 0.55)',
  },
  castAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  castName: {
    color: '#f8fafc',
    fontSize: 13,
    fontFamily: fonts.semibold,
    textAlign: 'center',
  },
  castRole: {
    color: 'rgba(226, 232, 240, 0.6)',
    fontSize: 11,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  castEmptyText: {
    color: 'rgba(226, 232, 240, 0.6)',
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  mediaRow: {
    gap: 16,
  },
  mediaCard: {
    width: 180,
    height: 120,
    borderRadius: 16,
    backgroundColor: 'rgba(9, 20, 53, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  mediaTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  mediaMeta: {
    color: 'rgba(226, 232, 240, 0.6)',
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontFamily: fonts.semibold,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  playerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    zIndex: 20,
  },
  playerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 32 : 56,
    right: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    zIndex: 21,
  },
  playerWrapper: {
    width: '90%',
    height: Platform.OS === 'web' ? '80%' : '75%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});

export default MovieDetail;

