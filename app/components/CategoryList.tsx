import React, { useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, Platform, ViewStyle, StyleProp, FlatList } from 'react-native';
import { fonts } from '@/theme/fonts';

interface Category {
  id: string;
  name: string;
}

interface CategoryListProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  layoutMode?: 'sidebar' | 'chips';
  containerStyle?: StyleProp<ViewStyle>;
  title?: string;
  subtitle?: string;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
  layoutMode,
  containerStyle,
  title = 'KATEGORİLER',
  subtitle,
}) => {
  const isMobile = Platform.OS !== 'web';
  const mode: 'sidebar' | 'chips' = layoutMode || (isMobile ? 'chips' : 'sidebar');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const containerStyles = [
    styles.container,
    mode === 'chips' && styles.chipsContainer,
    mode === 'sidebar' && isMobile && styles.sidebarMobile,
    containerStyle,
  ];

  const renderSidebarItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory === item.id;
    const isHovered = hoveredId === item.id;
    return (
      <Pressable
        style={[
          styles.categoryItem,
          (isSelected || isHovered) && styles.categoryItemActive,
        ]}
        onPress={() => onCategorySelect(item.id)}
        onHoverIn={() => setHoveredId(item.id)}
        onHoverOut={() => setHoveredId(null)}
        android_ripple={{ color: 'rgba(0, 51, 171, 0.25)', borderless: false }}
      >
        <Text
          style={[
            styles.categoryText,
            (isSelected || isHovered) && styles.categoryTextActive,
          ]}
        >
          {item.name}
        </Text>
      </Pressable>
    );
  };

  const renderChipItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.chip,
          isSelected && styles.chipSelected,
        ]}
        onPress={() => onCategorySelect(item.id)}
      >
        <Text
          style={[
            styles.chipText,
            isSelected && styles.chipTextSelected,
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={containerStyles}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {mode === 'chips' ? (
        <FlatList
          data={categories}
          renderItem={renderChipItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileChipsRow}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>Kategori bulunamadı</Text>
          )}
        />
      ) : (
        <FlatList
          data={categories}
          renderItem={renderSidebarItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
          style={styles.scrollView}
          ItemSeparatorComponent={() => <View style={styles.sidebarSeparator} />}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>Kategori bulunamadı</Text>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: 1,
    borderRadius: 16,
    borderWidth: 0,
    flex: 1,
    flexShrink: 0,
    minWidth: 100,
    alignSelf: 'stretch',
    gap: 4,
  },
  chipsContainer: {
    width: '100%',
    marginRight: 0,
    borderRadius: 16,
  },
  sidebarMobile: {
    width: '100%',
    marginRight: 0,
  },
  mobileMenuButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1001,
    width: 50,
    height: 50,
    backgroundColor: 'rgba(13, 27, 42, 0.9)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  title: {
    color: '#f87171',
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#f87171',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  mobileChipsRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(13, 27, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
    borderColor: 'rgba(30, 144, 255, 0.6)',
  },
  chipText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  chipTextSelected: {
    color: '#93c5fd',
    fontFamily: fonts.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 16,
    gap: 4,
  },
  sidebarSeparator: {
    height: 6,
  },
  categoryItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  categoryItemActive: {
    backgroundColor: '#0033ab',
    borderColor: '#0033ab',
  },
  categoryText: {
    color: '#f1f5f9',
    fontSize: 12.5,
    letterSpacing: 0.15,
    fontFamily: fonts.medium,
  },
  categoryTextActive: {
    color: '#e0f2fe',
    fontFamily: fonts.semibold,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default CategoryList;
