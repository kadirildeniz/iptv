import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import CategorySidebar from '@/app/components/CategorySidebar';
import MovieCard from '@/app/components/MovieCard';
import SearchBar from '@/app/components/SearchBar';

interface Movie {
  id: string;
  title: string;
  year: string;
  image: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
}

const Movies: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('comedy');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: Category[] = [
    { id: 'action', name: 'Aksiyon' },
    { id: 'comedy', name: 'Komedi' },
    { id: 'drama', name: 'Dram' },
    { id: 'scifi', name: 'Bilim Kurgu' },
    { id: 'horror', name: 'Korku' },
    { id: 'romance', name: 'Romantik' },
  ];

  const movies: Movie[] = [
    {
      id: '1',
      title: 'The Godfather',
      year: '1972',
      image: 'https://via.placeholder.com/300x200/2c3e50/ffffff?text=The+Godfather',
      category: 'drama',
    },
    {
      id: '2',
      title: 'The Shawshank Redemption',
      year: '1994',
      image: 'https://via.placeholder.com/300x200/34495e/ffffff?text=Shawshank',
      category: 'drama',
    },
    {
      id: '3',
      title: 'The Dark Knight',
      year: '2008',
      image: 'https://via.placeholder.com/300x200/2c3e50/ffffff?text=Dark+Knight',
      category: 'action',
    },
    {
      id: '4',
      title: 'Forrest Gump',
      year: '1994',
      image: 'https://via.placeholder.com/300x200/3498db/ffffff?text=Forrest+Gump',
      category: 'drama',
    },
    {
      id: '5',
      title: 'Pulp Fiction',
      year: '1994',
      image: 'https://via.placeholder.com/300x200/e74c3c/ffffff?text=Pulp+Fiction',
      category: 'action',
    },
    {
      id: '6',
      title: 'Inception',
      year: '2010',
      image: 'https://via.placeholder.com/300x200/9b59b6/ffffff?text=Inception',
      category: 'scifi',
    },
    {
      id: '7',
      title: 'Interstellar',
      year: '2014',
      image: 'https://via.placeholder.com/300x200/34495e/ffffff?text=Interstellar',
      category: 'scifi',
    },
    {
      id: '8',
      title: 'The Lord of the Rings',
      year: '2003',
      image: 'https://via.placeholder.com/300x200/27ae60/ffffff?text=LOTR',
      category: 'action',
    },
    {
      id: '9',
      title: 'The Hangover',
      year: '2009',
      image: 'https://via.placeholder.com/300x200/f39c12/ffffff?text=Hangover',
      category: 'comedy',
    },
    {
      id: '10',
      title: 'Superbad',
      year: '2007',
      image: 'https://via.placeholder.com/300x200/e67e22/ffffff?text=Superbad',
      category: 'comedy',
    },
    {
      id: '11',
      title: 'Titanic',
      year: '1997',
      image: 'https://via.placeholder.com/300x200/3498db/ffffff?text=Titanic',
      category: 'romance',
    },
    {
      id: '12',
      title: 'The Exorcist',
      year: '1973',
      image: 'https://via.placeholder.com/300x200/2c3e50/ffffff?text=Exorcist',
      category: 'horror',
    },
  ];

  const filteredMovies = useMemo(() => {
    let filtered = movies;

    // Kategori filtresi
    if (selectedCategory) {
      filtered = filtered.filter(movie => movie.category === selectedCategory);
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      filtered = filtered.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [movies, selectedCategory, searchQuery]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filmler</Text>
        <SearchBar onSearch={handleSearch} />
      </View>

      <View style={styles.content}>
        {/* Left Panel - Categories */}
        <CategorySidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
        />

        {/* Right Panel - Movies Grid */}
        <ScrollView 
          style={styles.moviesContainer}
          contentContainerStyle={styles.moviesGrid}
          showsVerticalScrollIndicator={false}
        >
          {filteredMovies.map((movie) => (
            <View key={movie.id} style={styles.movieCardWrapper}>
              <MovieCard
                id={movie.id}
                title={movie.title}
                year={movie.year}
                image={movie.image}
                category={movie.category}
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
  moviesContainer: {
    flex: 1,
  },
  moviesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  movieCardWrapper: {
    width: Platform.OS === 'web' ? '23%' : '48%',
    marginBottom: 16,
  },
});

export default Movies;