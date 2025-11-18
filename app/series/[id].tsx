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
import { seriesService, databaseService, type Series, type SeriesInfo, type Season, type Episode } from '@/services';
import { fonts } from '@/theme/fonts';
import apiClient from '@/services/api/client';

const SeriesDetail: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [series, setSeries] = useState<Series | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchCast, setSearchCast] = useState('');
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      loadSeriesDetails();
    }
  }, [id]);

  const loadSeriesDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // API client'a credentials'ı yükle
      await apiClient.loadCredentials();

      // Dizi temel bilgilerini getir
      const seriesData = await seriesService.getSeriesById(id);
      if (!seriesData) {
        setError('Dizi bulunamadı');
        return;
      }

      setSeries(seriesData);
      const isFav = await databaseService.isFavorite(seriesData.series_id.toString());
      setIsFavorite(isFav);

      // Dizi detay bilgilerini getir (sezonlar ve bölümler)
      try {
        const info = await seriesService.getSeriesInfo(id);
        setSeriesInfo(info);
        
        // İlk sezonu otomatik seç
        if (info.seasons && info.seasons.length > 0) {
          setSelectedSeason(info.seasons[0].season_number);
        }
      } catch (err) {
        console.warn('Dizi detay bilgileri yüklenemedi:', err);
        // Detay bilgileri yüklenemese bile devam et
      }
    } catch (err) {
      console.error('Dizi yüklenirken hata:', err);
      setError('Dizi yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration: string | number | undefined): string => {
    if (!duration) return 'Bilinmiyor';
    
    // Saniye cinsinden geliyorsa dakika/saat'e çevir
    const seconds = typeof duration === 'string' ? parseInt(duration) : duration;
    if (!isNaN(seconds) && seconds > 0) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}s ${minutes}dk`;
      }
      return `${minutes}dk`;
    }
    
    return typeof duration === 'string' ? duration : 'Bilinmiyor';
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

  const handleSeasonSelect = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    setSelectedEpisode(null);
  };

  const handleEpisodePress = (episode: Episode) => {
    if (episode.streamUrl) {
      setSelectedEpisode(episode);
      setIsPlayerVisible(true);
    }
  };

  const handleToggleFavorite = async () => {
    if (!series) return;
    if (isTogglingFavorite) return;

    try {
      setIsTogglingFavorite(true);
      
      // Poster bilgisini al
      const baseInfo = (seriesInfo?.info || {}) as any;
      const poster =
        baseInfo.cover_big ||
        baseInfo.cover ||
        series.cover ||
        'https://via.placeholder.com/800x1200/001b5b/ffffff?text=Series';

      const next = await databaseService.toggleFavorite({
        id: series.series_id.toString(),
        type: 'series',
        title: series.name,
        cover: poster,
      });
      setIsFavorite(next);
      console.log(`✅ Favori ${next ? 'eklendi' : 'çıkarıldı'}: ${series.name}`);
    } catch (favoriteError) {
      console.error('Favori güncelleme hatası:', favoriteError);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Dizi yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!series || error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>❌ {error || 'Dizi bulunamadı'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const baseInfo = (seriesInfo?.info || {}) as any;
  const poster =
    baseInfo.cover_big ||
    baseInfo.cover ||
    series.cover ||
    'https://via.placeholder.com/800x1200/001b5b/ffffff?text=Series';

  const ratingValue =
    series.rating_5based !== undefined && series.rating_5based !== null
      ? (series.rating_5based * 2).toFixed(1)
      : series.rating || baseInfo.rating?.toFixed?.(1) || baseInfo.rating_count_kinopoisk?.toFixed?.(1);

  const genres = baseInfo.genre
    ? String(baseInfo.genre)
        .split(/[,|]/)
        .map((g) => g.trim())
        .filter(Boolean)
    : series.genre
    ? String(series.genre)
        .split(/[,|]/)
        .map((g) => g.trim())
        .filter(Boolean)
    : [];

  const rawCast: Array<any> = Array.isArray(baseInfo.actor_list)
    ? baseInfo.actor_list
    : Array.isArray(baseInfo.cast_list)
    ? baseInfo.cast_list
    : baseInfo.actors || series.cast
    ? String(baseInfo.actors || series.cast)
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
    series.director ||
    (Array.isArray(baseInfo.director_list) ? baseInfo.director_list.map((d: any) => d.name).join(', ') : undefined);

  const description = baseInfo.plot || baseInfo.description || baseInfo.story || series.plot;

  const seasons = seriesInfo?.seasons || [];
  const episodes = selectedSeason !== null ? seriesInfo?.episodes[selectedSeason.toString()] || [] : [];

  const mediaItems =
    baseInfo.youtube_trailer
      ? [
          {
            title: 'Fragman',
            duration: 'Fragman',
            url: baseInfo.youtube_trailer,
          },
        ]
      : [];

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
              disabled={isTogglingFavorite}
            >
              {isTogglingFavorite ? (
                <ActivityIndicator size="small" color="#f97316" />
              ) : (
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavorite ? '#f97316' : 'rgba(249, 115, 22, 0.6)'}
                />
              )}
            </TouchableOpacity>

            <View style={styles.heroInfo}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroTitle}>{series.name || baseInfo?.name}</Text>
              </View>
              <Text style={styles.heroMeta}>
                {formatDate(baseInfo?.releaseDate || series.releaseDate)} · {seasons.length} Sezon ·{' '}
                {genres[0] || 'Tür Bilinmiyor'}
              </Text>

              <View style={styles.heroActions}>
                {selectedSeason !== null && episodes.length > 0 && episodes[0].streamUrl ? (
                  <TouchableOpacity
                    style={styles.playButton}
                    activeOpacity={0.9}
                    onPress={() => handleEpisodePress(episodes[0])}
                  >
                    <Ionicons name="play" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.playButtonText}>İlk Bölümü İzle</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.playButton, styles.playButtonDisabled]} activeOpacity={0.9} disabled>
                    <Ionicons name="play" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.playButtonText}>Bölüm Bulunamadı</Text>
                  </TouchableOpacity>
                )}
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

          {seasons.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sezonlar</Text>
              <FlatList
                data={seasons}
                keyExtractor={(item) => item.season_number.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonsRow}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.seasonChip,
                      selectedSeason === item.season_number && styles.seasonChipSelected,
                    ]}
                    onPress={() => handleSeasonSelect(item.season_number)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.seasonChipText,
                        selectedSeason === item.season_number && styles.seasonChipTextSelected,
                      ]}
                    >
                      Sezon {item.season_number}
                    </Text>
                    <Text style={styles.seasonChipMeta}>{item.episode_count} Bölüm</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {selectedSeason !== null && episodes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sezon {selectedSeason} - Bölümler</Text>
              <View style={styles.episodesList}>
                {episodes.map((episode, index) => (
                  <TouchableOpacity
                    key={episode.id || index}
                    style={[
                      styles.episodeCard,
                      !episode.streamUrl && styles.episodeCardDisabled,
                    ]}
                    onPress={() => episode.streamUrl && handleEpisodePress(episode)}
                    activeOpacity={0.8}
                    disabled={!episode.streamUrl}
                  >
                    <View style={styles.episodeNumber}>
                      <Text style={styles.episodeNumberText}>{episode.episode_num || index + 1}</Text>
                    </View>
                    <View style={styles.episodeInfo}>
                      <Text style={styles.episodeTitle} numberOfLines={2}>
                        {episode.title || `Bölüm ${episode.episode_num || index + 1}`}
                      </Text>
                      {episode.info?.plot && (
                        <Text style={styles.episodeDescription} numberOfLines={2}>
                          {episode.info.plot}
                        </Text>
                      )}
                      {episode.info?.duration_secs && (
                        <Text style={styles.episodeMeta}>
                          {formatDuration(episode.info.duration_secs)}
                        </Text>
                      )}
                    </View>
                    {episode.streamUrl ? (
                      <Ionicons name="play-circle" size={28} color="#0ea5e9" />
                    ) : (
                      <Ionicons name="lock-closed" size={28} color="#64748b" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {(crew || castList.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Oyuncular ve Ekip</Text>
                {castList.length > 5 && (
                  <View style={styles.castSearch}>
                    <Ionicons name="search" size={16} color="#94a3b8" />
                    <TextInput
                      style={styles.castSearchInput}
                      placeholder="Ara..."
                      placeholderTextColor="rgba(148, 163, 184, 0.6)"
                      value={searchCast}
                      onChangeText={setSearchCast}
                    />
                  </View>
                )}
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
                  <TouchableOpacity style={styles.mediaCard} activeOpacity={0.8}>
                    <Ionicons name="play-circle" size={36} color="#1d4ed8" />
                    <Text style={styles.mediaTitle}>{item.title}</Text>
                    <Text style={styles.mediaMeta}>{item.duration}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </ScrollView>
      {isPlayerVisible && selectedEpisode && selectedEpisode.streamUrl && (
        <View style={styles.playerOverlay}>
          <TouchableOpacity
            style={styles.playerCloseButton}
            onPress={() => {
              setIsPlayerVisible(false);
              setSelectedEpisode(null);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.playerWrapper}>
            <VideoPlayer
              channelName={`${series.name} - ${selectedEpisode.title || `Bölüm ${selectedEpisode.episode_num}`}`}
              channelDescription={selectedEpisode.info?.plot || description || ''}
              channelType={genres.join(', ') || 'Dizi'}
              streamUrl={selectedEpisode.streamUrl}
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
  seasonsRow: {
    gap: 12,
  },
  seasonChip: {
    backgroundColor: 'rgba(13, 31, 74, 0.85)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.25)',
    alignItems: 'center',
    minWidth: 120,
  },
  seasonChipSelected: {
    backgroundColor: 'rgba(30, 144, 255, 0.3)',
    borderColor: '#1e90ff',
  },
  seasonChipText: {
    color: '#93c5fd',
    fontSize: 15,
    fontFamily: fonts.semibold,
    marginBottom: 4,
  },
  seasonChipTextSelected: {
    color: '#ffffff',
  },
  seasonChipMeta: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  episodesList: {
    gap: 12,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 27, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
    alignItems: 'center',
  },
  episodeCardDisabled: {
    opacity: 0.5,
  },
  episodeNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  episodeNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: fonts.bold,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    fontFamily: fonts.semibold,
  },
  episodeDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  episodeMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
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

export default SeriesDetail;
