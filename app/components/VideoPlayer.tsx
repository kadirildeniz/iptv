import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';

interface VideoPlayerProps {
  channelName: string;
  channelDescription: string;
  channelType: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channelName,
  channelDescription,
  channelType,
}) => {
  return (
    <View style={styles.container}>
      {/* Voice Search */}
      <View style={styles.voiceSearchContainer}>
        <TouchableOpacity style={styles.microphoneButton}>
          <Text style={styles.microphoneIcon}>🎤</Text>
        </TouchableOpacity>
        <Text style={styles.voiceSearchText}>
          Filmler ve diziler arasında ses ile arama yapın
        </Text>
      </View>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        <View style={styles.videoFrame}>
          <Image
            source={{ uri: 'https://via.placeholder.com/500x280/0d1b2a/1e90ff?text=Live+TV+Preview' }}
            style={styles.videoImage}
            resizeMode="cover"
          />
          
          {/* Video Controls */}
          <View style={styles.controlsOverlay}>
            <View style={styles.topControls}>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>🔀</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>💬</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>⋯</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.centerControls}>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>⏮</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playButton}>
                <Text style={styles.playIcon}>⏸</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>⏭</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.bottomControls}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.timeText}>1:48 / 4:32</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.channelName}>{channelName}</Text>
      </View>

      {/* Channel Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionTitle}>CANLI TV</Text>
        <Text style={styles.descriptionSubtitle}>{channelType}</Text>
        <Text style={styles.descriptionText}>
          {channelDescription}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 42, 0.8)',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  voiceSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    justifyContent: 'flex-end',
  },
  microphoneButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  microphoneIcon: {
    fontSize: 20,
  },
  voiceSearchText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    flex: 1,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  videoContainer: {
    marginBottom: 24,
  },
  videoFrame: {
    width: '100%',
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  videoImage: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(13, 27, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(30, 144, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  controlIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  playIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
  },
  progressFill: {
    width: '40%',
    height: '100%',
    backgroundColor: '#1e90ff',
    borderRadius: 3,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  channelName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  descriptionContainer: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  descriptionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  descriptionSubtitle: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
});

export default VideoPlayer;
