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
import { movieService, databaseService, database, storageService, type Movie } from '@/services';
import { fonts } from '@/theme/fonts';
import apiClient from '@/services/api/client';
import { buildMovieUrl } from '@/services/api/endpoints';
import MovieModel from '@/services/database/models/Movie';

const MovieDetail: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Lazy load durumu için
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

      let movieData: Movie | null = null;
      let detailsLoaded = false;

      // 1. Önce veritabanından temel veriyi ve varsa detayları çek
      if (database) {
        try {
          const dbMovies = await database.get<MovieModel>('movies').query().fetch();
          const dbMovie = dbMovies.find((m) => m.streamId.toString() === id);

          if (dbMovie) {
            const credentials = await storageService.getCredentials();
            const baseUrl = await storageService.getItem<string>('baseUrl');

            let streamUrl = '';
            if (credentials && baseUrl) {
              let fullBaseUrl = baseUrl;
              if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                  fullBaseUrl = `${credentials.protocol || 'http'}://${baseUrl}`;
              }

              streamUrl = buildMovieUrl(
                fullBaseUrl,
                credentials.username,
                credentials.password,
                dbMovie.streamId.toString(),
                dbMovie.containerExtension || 'mp4'
              );
            }

            movieData = {
                num: 1,
                stream_id: dbMovie.streamId,
                name: dbMovie.name,
                stream_type: dbMovie.streamType,
                stream_icon: dbMovie.streamIcon || '',
                rating: dbMovie.rating || '',
                rating_5based: dbMovie.rating5based || 0,
                category_id: dbMovie.categoryId,
                category_ids: dbMovie.categoryIds ? JSON.parse(dbMovie.categoryIds) : [],
                added: dbMovie.added || '',
                container_extension: dbMovie.containerExtension || '',
                custom_sid: dbMovie.customSid || '',
                direct_source: dbMovie.directSource || '',
                streamUrl: streamUrl,
            };

              setMovie(movieData);
              const isFav = await databaseService.isFavorite(movieData.stream_id.toString());
              setIsFavorite(isFav);

              // Detaylar DB'de var mı kontrol et
              if (dbMovie.plot || dbMovie.cast || dbMovie.director) {
                const backdropPath = dbMovie.backdropPath ? JSON.parse(dbMovie.backdropPath) : [];
                
                setMovieInfo({
                  info: {
                    plot: dbMovie.plot || '',
                    description: dbMovie.plot || '',
                    cast: dbMovie.cast || '',
                    actors: dbMovie.cast || '',
                    director: dbMovie.director || '',
                    genre: dbMovie.genre || '',
                    releasedate: dbMovie.releaseDate || '',
                    duration: dbMovie.duration || '',
                    duration_secs: dbMovie.durationSecs ? parseInt(dbMovie.durationSecs) : undefined,
                    backdrop_path: backdropPath,
                    youtube_trailer: dbMovie.youtubeTrailer || '',
                    tmdb_id: dbMovie.tmdbId || '',
                    country: dbMovie.country || '',
                    age: dbMovie.ageRating || '',
                    movie_image: dbMovie.streamIcon || '',
                    cover_big: dbMovie.streamIcon || '',
                  },
                  movie_data: movieData,
                });
                
                detailsLoaded = true;
                console.log('✅ Film detayları cache\'den (DB) yüklendi');
              }
            }
        } catch (dbError) {
          console.warn('Database read error:', dbError);
        }
      }

      // 2. Eğer detaylar eksikse veya film hiç yoksa API'den çek (LAZY LOAD)
      if (!detailsLoaded) {
        console.log('⏳ Detaylar eksik, API\'den çekiliyor (Lazy Load)...');
        setRefreshing(true);
        
        try {
           // Eğer temel veri bile yoksa önce onu al (Fallback)
           if (!movieData) {
             movieData = await movieService.getMovieById(id);
             if (movieData) {
               setMovie(movieData);
               // Favori durumunu kontrol et
               const isFav = await databaseService.isFavorite(movieData.stream_id.toString());
               setIsFavorite(isFav);
             }
           }

           if (movieData) {
             const apiMovieInfo = await movieService.getMovieInfo(id);
             setMovieInfo(apiMovieInfo);
             
             // 3. Gelen detayları DB'ye kaydet (Cache Update)
             if (database) {
               const dbMovies = await database.get<MovieModel>('movies').query().fetch();
               const localMovie = dbMovies.find(m => m.streamId.toString() === id);
               
               if (localMovie) {
                  await database.write(async () => {
                    await localMovie.update(m => {
                      if (apiMovieInfo.info) {
                        m.plot = apiMovieInfo.info.plot || apiMovieInfo.info.description || undefined;
                        m.cast = apiMovieInfo.info.cast || apiMovieInfo.info.actors || undefined;
                        m.director = apiMovieInfo.info.director || undefined;
                        m.genre = apiMovieInfo.info.genre || undefined;
                        m.releaseDate = apiMovieInfo.info.releasedate || undefined;
                        m.duration = apiMovieInfo.info.duration || undefined;
                        m.durationSecs = apiMovieInfo.info.duration_secs?.toString() || undefined;
                        m.backdropPath = JSON.stringify((apiMovieInfo.info as any).backdrop_path || []);
                        m.youtubeTrailer = apiMovieInfo.info.youtube_trailer || undefined;
                        m.tmdbId = apiMovieInfo.info.tmdb_id || undefined;
                        m.country = apiMovieInfo.info.country || undefined;
                        m.ageRating = apiMovieInfo.info.age || apiMovieInfo.info.mpaa_rating || undefined;
                      }
                    });
                  });
                  console.log('💾 Detaylar DB\'ye kaydedildi (Cache Updated)');
               }
             }
           } else {
             setError('Film bulunamadı');
           }
        } catch (apiError) {
          console.error('Lazy load error:', apiError);
          // API hatası olsa bile temel verilerle göstermeye devam et
        } finally {
          setRefreshing(false);
        }
      }

    } catch (err) {
      console.error('Film yüklenirken hata:', err);
      setError('Film yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration: string | number | undefined): string => {
    if (!duration) return 'Bilinmiyor';

    if (typeof duration === 'string' && (duration.includes('sec') || duration.match(/^\d+$/))) {
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

    if (typeof duration === 'number') {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      if (hours > 0) {
        return `${hours}s ${minutes}dk`;
      }
      return `${minutes}dk`;
    }

    return typeof duration === 'string' ? duration : 'Bilinmiyor';
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Bilinmiyor';

    if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

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

  if (!movie && !error) {
      // Yükleniyor olabilir veya veri yok
      return null; 
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

  const baseInfo = (movieInfo?.info || {}) as any;
  const poster =
    baseInfo.movie_image ||
    baseInfo.cover_big ||
    movie.stream_icon ||
    'https://via.placeholder.com/800x1200/001b5b/ffffff?text=Movie';

  const ratingValue =
    movie.rating_5based !== undefined && movie.rating_5based !== null
      ? (movie.rating_5based * 2).toFixed(1)
      : movie.rating || baseInfo.rating?.toFixed?.(1) || baseInfo.rating_count_kinopoisk?.toFixed?.(1);

  const genres = baseInfo.genre
    ? String(baseInfo.genre)
        .split(/[,|]/)
        .map((g: string) => g.trim())
        .filter(Boolean)
    : [];

  const rawCast: Array<any> = Array.isArray(baseInfo.actor_list)
    ? baseInfo.actor_list
    : Array.isArray(baseInfo.cast_list)
    ? baseInfo.cast_list
    : baseInfo.actors || baseInfo.cast
    ? String(baseInfo.actors || baseInfo.cast)
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
    member.name?.toLowerCase().includes(searchCast.toLowerCase())
  );

  const crew =
    baseInfo.director ||
    baseInfo.directors ||
    (Array.isArray(baseInfo.director_list)
      ? baseInfo.director_list.map((d: any) => d.name).join(', ')
      : undefined);

  const description = baseInfo.plot || baseInfo.description || baseInfo.story;

  const mediaItems: Array<{ title: string; duration: string }> = [];

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
            <TouchableOpacity
              style={styles.heroBackButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
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
                {formatDate(baseInfo?.releasedate)} ·{' '}
                {formatDuration(baseInfo?.duration_secs || baseInfo?.duration)} · {genres[0] || 'Tür Bilinmiyor'}
              </Text>

              <View style={styles.heroActions}>
                <TouchableOpacity
                  style={[styles.playButton, !movie.streamUrl && styles.playButtonDisabled]}
                  activeOpacity={0.9}
                  disabled={!movie.streamUrl}
                  onPress={() => {
                    if (movie.streamUrl) {
                      router.push({
                        pathname: '/player',
                        params: {
                          url: movie.streamUrl,
                          title: movie.name,
                          id: movie.stream_id.toString(),
                          type: 'movie',
                          poster: movie.stream_icon || '',
                        },
                      });
                    }
                  }}
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
          {/* Lazy Load Yükleniyor Göstergesi */}
          {refreshing && !description && (
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <ActivityIndicator size="small" color="#0ea5e9" style={{ marginRight: 10 }}/>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Detaylar yükleniyor...</Text>
             </View>
          )}

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
