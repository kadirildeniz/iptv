import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';

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
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  const isMobile = Platform.OS !== 'web';

  if (isMobile && !isMobileMenuOpen) {
    return (
      <TouchableOpacity style={styles.mobileMenuButton} onPress={onToggleMobileMenu}>
        <View style={styles.hamburger}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, isMobile && styles.mobileContainer]}>
      <Text style={styles.title}>CANLI TV</Text>
      <Text style={styles.subtitle}>KATEGORİLER</Text>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              selectedCategory === category.id && styles.selectedCategory,
            ]}
            onPress={() => {
              onCategorySelect(category.id);
              if (isMobile) {
                onToggleMobileMenu?.();
              }
            }}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: 'rgba(13, 27, 42, 0.8)',
    padding: 24,
    borderRadius: 20,
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  mobileContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    marginRight: 0,
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  scrollView: {
    flex: 1,
  },
  categoryItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 8,
  },
  selectedCategory: {
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.4)',
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  selectedCategoryText: {
    fontWeight: '600',
    color: '#1e90ff',
  },
});

export default CategoryList;
