import CardComponent from '@/app/components/card-component';
import { useRouter } from 'expo-router';
import { ImageBackground, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
export default function HomeScreen() {
  const router = useRouter();
  return (
    <ImageBackground 
      source={require('@/assets/images/bg-home.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.text}>IPTV+ Watch</Text>
          <Text style={styles.textDescription}>
          +39842 Dizi, +1000 Film ve izleyebileceğiniz yüzlerce içerik ile sizlerleyiz.
          </Text>
          <View style={styles.cardContainer}>
            <TouchableOpacity onPress={() => router.push('/live-tv')}>
              <CardComponent title="Canlı TV" description="3000 Kanal" image={require('@/assets/images/tv.png')} style={[styles.card, {height: Platform.OS === 'web' ? 500 : 300}]} /> 
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/movies')}>
              <CardComponent title="Filmler" description="1000 Film" image={require('@/assets/images/film-rulo.png')} style={[styles.card, {height: Platform.OS === 'web' ? 400 : 200}]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/series')}>
              <CardComponent title="Diziler" description="39842 Dizi" image={require('@/assets/images/tv-start.png')} style={[styles.card, {height: Platform.OS === 'web' ? 400 : 200}]} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: Platform.OS === 'web' ? '100%' : '100%',
    height: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 100 : 0,
  },
  card: {
    width: Platform.OS === 'web' ? '33%' : '100%',
    height: Platform.OS === 'web' ? 500 : 200,
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    marginHorizontal: 0,
    marginTop: 100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  text: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'semibold',
    letterSpacing: 1.5,

  },
  textDescription: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'normal',
    marginTop: 10,
    marginBottom: 30,
  },
  cardContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    width: Platform.OS === 'web' ? '100%' : '100%',
  },
}); 