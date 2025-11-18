import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, FlatList } from 'react-native';
import { fonts } from '@/theme/fonts';

interface Category {
  id: string;
  name: string;
}

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  layoutMode?: 'sidebar' | 'chips';
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  layoutMode,
}) => {
  const mode: 'sidebar' | 'chips' = layoutMode || (Platform.OS === 'web' ? 'sidebar' : 'chips');

  const renderCategoryItem = useCallback(({ item }: { item: Category }) => {
    const isSelected = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.selectedCategory,
        ]}
        onPress={() => onCategorySelect(item.id)}
      >
        <Text
          style={[
            styles.categoryText,
            isSelected && styles.selectedCategoryText,
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedCategory, onCategorySelect]);

  const renderChipItem = useCallback(({ item }: { item: Category }) => {
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
  }, [selectedCategory, onCategorySelect]);

  const keyExtractor = useCallback((item: Category) => item.id, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kategoriler</Text>
      {mode === 'sidebar' ? (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesList}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          windowSize={10}
        />
      ) : (
        <FlatList
          data={categories}
          renderItem={renderChipItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileChipsRow}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: Platform.OS === 'web' ? 100 : 120,
    backgroundColor: '#ffffff',
    padding: Platform.OS === 'web' ? 12 : 10,
    borderRadius: 12,
    marginRight: Platform.OS === 'web' ? 16 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === 'web' 
      ? { flexShrink: 0, flexGrow: 0 } 
      : { flex: 1 }),
    maxHeight: Platform.OS === 'web' ? '100%' : '100%',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 12 : 10,
    color: '#000000',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    fontFamily: fonts.bold,
  },
  mobileChipsRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  categoriesScroll: {
    flex: 1,
  },
  categoriesList: {
    paddingVertical: 2,
  },
  categoryItem: {
    paddingVertical: Platform.OS === 'web' ? 8 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  selectedCategory: {
    backgroundColor: '#f0f0f0',
  },
  categoryText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#666666',
    fontFamily: fonts.medium,
  },
  selectedCategoryText: {
    color: '#000000',
    fontFamily: fonts.semibold,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#93c5fd',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: fonts.medium,
  },
  chipTextSelected: {
    color: '#1d4ed8',
    fontFamily: fonts.semibold,
  },
});

export default CategorySidebar;
