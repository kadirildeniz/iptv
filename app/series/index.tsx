import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import CategorySidebar from '@/app/components/CategorySidebar';
import SeriesCard from '@/app/components/SeriesCard';
import SearchBar from '@/app/components/SearchBar';

interface Series {
  id: string;
  title: string;
  year: string;
  image: string;
  category: string;
  seasons: number;
}

interface Category {
  id: string;
  name: string;
}

const Series: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('drama');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: Category[] = [
    { id: 'action', name: 'Aksiyon' },
    { id: 'comedy', name: 'Komedi' },
    { id: 'drama', name: 'Dram' },
    { id: 'scifi', name: 'Bilim Kurgu' },
    { id: 'horror', name: 'Korku' },
    { id: 'romance', name: 'Romantik' },
    { id: 'thriller', name: 'Gerilim' },
    { id: 'fantasy', name: 'Fantastik' },
  ];

  const series: Series[] = [
    {
      id: '1',
      title: 'Breaking Bad',
      year: '2008-2013',
      image: 'https://via.placeholder.com/300x200/2c3e50/ffffff?text=Breaking+Bad',
      category: 'drama',
      seasons: 5,
    },
    {
      id: '2',
      title: 'Game of Thrones',
      year: '2011-2019',
      image: 'https://via.placeholder.com/300x200/8e44ad/ffffff?text=Game+of+Thrones',
      category: 'fantasy',
      seasons: 8,
    },
    {
      id: '3',
      title: 'The Office',
      year: '2005-2013',
      image: 'https://via.placeholder.com/300x200/3498db/ffffff?text=The+Office',
      category: 'comedy',
      seasons: 9,
    },
    {
      id: '4',
      title: 'Stranger Things',
      year: '2016-2024',
      image: 'https://via.placeholder.com/300x200/e74c3c/ffffff?text=Stranger+Things',
      category: 'scifi',
      seasons: 5,
    },
    {
      id: '5',
      title: 'The Walking Dead',
      year: '2010-2022',
      image: 'https://via.placeholder.com/300x200/34495e/ffffff?text=Walking+Dead',
      category: 'horror',
      seasons: 11,
    },
    {
      id: '6',
      title: 'Friends',
      year: '1994-2004',
      image: 'https://via.placeholder.com/300x200/f39c12/ffffff?text=Friends',
      category: 'comedy',
      seasons: 10,
    },
    {
      id: '7',
      title: 'House of Cards',
      year: '2013-2018',
      image: 'https://via.placeholder.com/300x200/2c3e50/ffffff?text=House+of+Cards',
      category: 'drama',
      seasons: 6,
    },
    {
      id: '8',
      title: 'The Crown',
      year: '2016-2023',
      image: 'https://via.placeholder.com/300x200/27ae60/ffffff?text=The+Crown',
      category: 'drama',
      seasons: 6,
    },
    {
      id: '9',
      title: 'Black Mirror',
      year: '2011-2023',
      image: 'https://via.placeholder.com/300x200/9b59b6/ffffff?text=Black+Mirror',
      category: 'scifi',
      seasons: 6,
    },
    {
      id: '10',
      title: 'Money Heist',
      year: '2017-2021',
      image: 'https://via.placeholder.com/300x200/e67e22/ffffff?text=Money+Heist',
      category: 'thriller',
      seasons: 5,
    },
    {
      id: '11',
      title: 'The Witcher',
      year: '2019-2023',
      image: 'https://via.placeholder.com/300x200/16a085/ffffff?text=The+Witcher',
      category: 'fantasy',
      seasons: 3,
    },
    {
      id: '12',
      title: 'Ozark',
      year: '2017-2022',
      image: 'https://via.placeholder.com/300x200/2980b9/ffffff?text=Ozark',
      category: 'thriller',
      seasons: 4,
    },
  ];

  const filteredSeries = useMemo(() => {
    let filtered = series;

    // Kategori filtresi
    if (selectedCategory) {
      filtered = filtered.filter(serie => serie.category === selectedCategory);
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      filtered = filtered.filter(serie =>
        serie.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [series, selectedCategory, searchQuery]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Diziler</Text>
        <SearchBar onSearch={handleSearch} placeholder="Diziler ara" />
      </View>

      <View style={styles.content}>
        {/* Left Panel - Categories */}
        <CategorySidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
        />

        {/* Right Panel - Series Grid */}
        <ScrollView 
          style={styles.seriesContainer}
          contentContainerStyle={styles.seriesGrid}
          showsVerticalScrollIndicator={false}
        >
          {filteredSeries.map((serie) => (
            <View key={serie.id} style={styles.seriesCardWrapper}>
              <SeriesCard
                id={serie.id}
                title={serie.title}
                year={serie.year}
                image={serie.image}
                category={serie.category}
                seasons={serie.seasons}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  content: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    padding: 20,
    gap: 20,
  },
  seriesContainer: {
    flex: 1,
  },
  seriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  seriesCardWrapper: {
    width: Platform.OS === 'web' ? '23%' : '48%',
    marginBottom: 16,
  },
});

export default Series;
