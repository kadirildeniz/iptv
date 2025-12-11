import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, GestureResponderEvent, Platform } from 'react-native';
import { fonts } from '@/theme/fonts';
import { TV_FOCUS_STYLE, TV_BASE_BORDER } from '@/constants/tvStyles';

interface ChannelCardProps {
  id: string;
  name: string;
  logo: string;
  subscribers: string;
  quality: string[];
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onChannelSelect?: (channel: { id: string; name: string; streamUrl?: string }) => void;
  variant?: 'grid' | 'list';
  height?: number;
  width?: number;
  style?: any;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  id,
  name,
  logo,
  subscribers,
  quality,
  isFavorite,
  onToggleFavorite,
  onChannelSelect,
  variant = 'grid',
  height,
  width,
  style,
}) => {
  const [imageError, setImageError] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);
  const [favoriteFocused, setFavoriteFocused] = useState(false);
  const isGrid = variant === 'grid';
  const isTV = Platform.isTV;

  const handleCardPress = () => {
    if (onChannelSelect) {
      onChannelSelect({
        id,
        name,
        streamUrl: undefined,
      });
    }
  };

  const handleFavoritePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onToggleFavorite(id);
  };

  const isLogoUrl = logo && (logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('//'));
  const showImage = isLogoUrl && !imageError;

  if (isGrid) {
    return (
      <Pressable
        isTVSelectable={isTV}
        focusable={isTV}
        android_tv_focusable={isTV}
        onFocus={isTV ? () => setCardFocused(true) : undefined}
        onBlur={isTV ? () => setCardFocused(false) : undefined}
        style={[
          styles.gridCard,
          style,
          isTV && cardFocused && styles.cardFocused
        ]}
        onPress={handleCardPress}
      >
        <View style={[styles.gridImageWrapper, height ? { height, aspectRatio: undefined } : {}, width ? { width } : {}]}>
          {showImage ? (
            <Image
              source={{ uri: logo }}
              style={styles.gridImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <Text style={styles.gridFallback}>{name.substring(0, 3).toUpperCase()}</Text>
          )}

          <Pressable
            isTVSelectable={isTV}
            focusable={isTV}
            android_tv_focusable={isTV}
            onFocus={isTV ? () => setFavoriteFocused(true) : undefined}
            onBlur={isTV ? () => setFavoriteFocused(false) : undefined}
            style={[
              styles.gridFavoriteButton,
              isFavorite && styles.gridFavoriteButtonActive,
              isTV && favoriteFocused && styles.favoriteFocused
            ]}
            onPress={handleFavoritePress}
          >
            <Text style={[styles.gridFavoriteIcon, isFavorite && styles.gridFavoriteIconActive]}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.gridName} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>
    );
  }


  return (
    <Pressable
      focusable={true}
      style={({ pressed, focused }) => [
        styles.listCard,
        focused && TV_FOCUS_STYLE
      ]}
      onPress={handleCardPress}
    >
      <View style={styles.listLogoWrapper}>
        {showImage ? (
          <Image
            source={{ uri: logo }}
            style={styles.listImage}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <Text style={styles.listFallback}>{name.substring(0, 3).toUpperCase()}</Text>
        )}
      </View>

      <View style={styles.listContent}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {name}
          </Text>
          <Pressable
            focusable={true}
            style={({ pressed, focused }) => [
              styles.listFavoriteButton,
              focused && {
                borderColor: '#00E5FF',
                borderWidth: 2,
                transform: [{ scale: 1.1 }],
              }
            ]}
            onPress={handleFavoritePress}
          >
            <Text style={[styles.listStar, isFavorite && styles.listStarActive]}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.listSubtitle}>{subscribers}</Text>

        <View style={styles.listBadges}>
          {quality.map((q, index) => (
            <View key={index} style={styles.listBadge}>
              <Text style={styles.listBadgeText}>{q}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
};

const sharedShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 6,
};

const styles = StyleSheet.create({
  gridCard: {
    backgroundColor: 'rgba(13, 27, 42, 0.6)',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(30, 144, 255, 0.18)',
    gap: 10,
    ...sharedShadow,
  },
  cardFocused: {
    borderColor: '#00E5FF',
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  favoriteFocused: {
    borderColor: '#00E5FF',
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  gridImageWrapper: {
    width: '100%',
    aspectRatio: 1.0,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 46, 91, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  gridFallback: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  gridFavoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gridFavoriteButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8',
  },
  gridFavoriteIcon: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: fonts.semibold,
  },
  gridFavoriteIconActive: {
    color: '#0b1120',
  },
  gridName: {
    color: '#f8fafc',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: fonts.semibold,
  },

  listCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 27, 42, 0.6)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: 'rgba(30, 144, 255, 0.2)',
    marginBottom: 16,
    ...sharedShadow,
  },
  listLogoWrapper: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
    overflow: 'hidden',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listFallback: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: fonts.bold,
  },
  listContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listTitle: {
    color: '#ffffff',
    fontSize: 18,
    flex: 1,
    fontFamily: fonts.semibold,
  },
  listFavoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  listStar: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  listStarActive: {
    color: '#1e90ff',
  },
  listSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 6,
    fontFamily: fonts.regular,
  },
  listBadges: {
    flexDirection: 'row',
    marginTop: 12,
  },
  listBadge: {
    backgroundColor: '#1e90ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  listBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fonts.semibold,
  },
});

export default ChannelCard;
