import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TV_BUTTON_FOCUS_STYLE } from '@/constants/tvStyles';
import { fonts } from '@/theme/fonts';

// Android için LayoutAnimation'ı etkinleştir
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface SearchHeaderProps {
  title: string;
  onSearch: (text: string) => void;
  placeholder?: string;
  itemCount?: number;
  itemLabel?: string;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  title,
  onSearch,
  placeholder = 'Ara...',
  itemCount,
  itemLabel = 'içerik',
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchButtonFocused, setSearchButtonFocused] = useState(false);
  const [cancelButtonFocused, setCancelButtonFocused] = useState(false);
  const [clearButtonFocused, setClearButtonFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Arama metni değiştiğinde (Debounce ile)
  const handleTextChange = (text: string) => {
    setSearchText(text);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      // Minimum 3 karakter kontrolü
      if (text.trim().length >= 3 || text.trim().length === 0) {
        onSearch(text);
      }
    }, 300);
  };

  // Arama modunu aç
  const openSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchActive(true);
    // Input'a odaklanmak için kısa bir gecikme (animasyonun başlaması için)
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Arama modunu kapat
  const closeSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchActive(false);
    setSearchText('');
    onSearch(''); // Aramayı sıfırla
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      {!isSearchActive ? (
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {itemCount !== undefined && (
              <Text style={styles.itemCount}> ({itemCount} {itemLabel})</Text>
            )}
          </View>
          <Pressable
            isTVSelectable={true}
            focusable={true}
            android_tv_focusable={true}
            onFocus={() => setSearchButtonFocused(true)}
            onBlur={() => setSearchButtonFocused(false)}
            onPress={openSearch}
            style={[
              styles.iconButton,
              searchButtonFocused && styles.buttonFocused
            ]}
          >
            <Ionicons name="search" size={24} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.searchContent}>
          <View style={styles.inputWrapper}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={searchText}
              onChangeText={handleTextChange}
              placeholder={searchText.length > 0 && searchText.length < 3 ? `En az 3 karakter yazın (${searchText.length}/3)` : placeholder}
              placeholderTextColor="#94a3b8"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <Pressable
                isTVSelectable={true}
                focusable={true}
                android_tv_focusable={true}
                onFocus={() => setClearButtonFocused(true)}
                onBlur={() => setClearButtonFocused(false)}
                onPress={() => handleTextChange('')}
                style={[
                  styles.clearButton,
                  clearButtonFocused && styles.clearButtonFocused
                ]}
              >
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </Pressable>
            )}
          </View>
          <Pressable
            isTVSelectable={true}
            focusable={true}
            android_tv_focusable={true}
            onFocus={() => setCancelButtonFocused(true)}
            onBlur={() => setCancelButtonFocused(false)}
            onPress={closeSearch}
            style={[
              styles.cancelButton,
              cancelButtonFocused && styles.cancelButtonFocused
            ]}
          >
            <Text style={styles.cancelText}>Vazgeç</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },
  itemCount: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: 'rgba(148, 163, 184, 0.9)',
    marginLeft: 4,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    maxWidth: '75%',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.regular,
    height: '100%',
  },
  clearButton: {
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  clearButtonFocused: {
    borderColor: '#00E5FF',
    transform: [{ scale: 1.1 }],
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
  },
  cancelButtonFocused: {
    borderColor: '#00E5FF',
    transform: [{ scale: 1.05 }],
  },
  buttonFocused: {
    borderColor: '#00E5FF',
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.medium,
  },
});

export default SearchHeader;

