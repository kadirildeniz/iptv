import { Image, ImageSourcePropType, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface CardComponentProps {
  title: string;
  description: string;
  image: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}

const CardComponent = ({ title, description, image, style }: CardComponentProps) => {
  return (
    <View style={[styles.cardContainer, style]}>
      <Image source={image} style={styles.cardImage} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    paddingTop: 100,
    padding: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 20,
    width: '100%',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 10,
  },
  cardImage: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  cardDescription: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '400',
    marginTop: 3,
  },
});

export default CardComponent