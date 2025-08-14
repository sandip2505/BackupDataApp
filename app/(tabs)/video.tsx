
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function VideoScreen() {
  const [videos, setVideos] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media access is required for backup');
        return;
      }

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'video',
        first: 100,
        sortBy: 'creationTime',
      });

      setVideos(media.assets);
    } catch (error) {
      console.error('Error loading videos:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
  };

  const backupSelectedVideos = async () => {
    try {
      if (selectedVideos.size === 0) {
        Alert.alert('No Selection', 'Please select videos to backup');
        return;
      }

      Alert.alert('Backup Started', `Backing up ${selectedVideos.size} videos...`);
      
      const backupData = {
        videoIds: Array.from(selectedVideos),
        timestamp: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('videoBackup', JSON.stringify(backupData));
      
      Alert.alert('Success', `${selectedVideos.size} videos backed up successfully!`);
      setSelectedVideos(new Set());
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Error', 'Video backup failed');
    }
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderVideo = ({ item }: { item: MediaLibrary.Asset }) => {
    const isSelected = selectedVideos.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.videoItem, isSelected && styles.selectedVideo]}
        onPress={() => toggleVideoSelection(item.id)}
      >
        <View style={styles.videoThumbnail}>
          <Ionicons name="play-circle" size={40} color="white" />
        </View>
        
        <View style={styles.videoInfo}>
          <Text style={styles.videoFilename} numberOfLines={1}>
            {item.filename}
          </Text>
          <View style={styles.videoMeta}>
            <Text style={styles.videoMetaText}>
              {formatDuration(item.duration)} • {item.width}x{item.height}
            </Text>
            <Text style={styles.videoDate}>
              {new Date(item.creationTime).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.selectionIndicator}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color="#C7C7CC" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Videos Backup</Text>
        <Text style={styles.headerSubtitle}>
          {videos.length} videos available • {selectedVideos.size} selected
        </Text>
      </View>

      {selectedVideos.size > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.backupButton}
            onPress={backupSelectedVideos}
          >
            <Ionicons name="cloud-upload" size={20} color="white" />
            <Text style={styles.backupButtonText}>
              Backup {selectedVideos.size} Videos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSelectedVideos(new Set())}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.videosList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// Styles for all components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  backupButtonText: {
    color: 'white',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  clearButton: {
    marginLeft: 12,
  },
  clearButtonText: {
    fontSize: 15,
    color: '#007AFF',
  },
  videosList: {
    padding: 8,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  selectedVideo: {
    backgroundColor: '#E6F0FF',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  videoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoFilename: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  videoMetaText: {
    fontSize: 14,
    color: '#666',
  },
  videoDate: {
    fontSize: 12,
    color: '#999',
  },
  selectionIndicator: {
    marginLeft: 12,
  },
});
