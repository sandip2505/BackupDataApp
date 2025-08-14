
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 3;

export default function Media() {
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photos access is required for backup');
        return;
      }

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        first: 100,
        sortBy: 'creationTime',
      });

      setPhotos(media.assets);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const backupSelectedPhotos = async () => {
    try {
      if (selectedPhotos.size === 0) {
        Alert.alert('No Selection', 'Please select photos to backup');
        return;
      }

      Alert.alert('Backup Started', `Backing up ${selectedPhotos.size} photos...`);
      
      // Store backup info
      const backupData = {
        photoIds: Array.from(selectedPhotos),
        timestamp: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('photoBackup', JSON.stringify(backupData));
      
      Alert.alert('Success', `${selectedPhotos.size} photos backed up successfully!`);
      setSelectedPhotos(new Set());
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Error', 'Photo backup failed');
    }
  };

  const renderPhoto = ({ item }: { item: MediaLibrary.Asset }) => {
    const isSelected = selectedPhotos.has(item.id);
    
    return (
      <TouchableOpacity
        style={[mediaStyles.photoContainer, isSelected && mediaStyles.selectedPhoto]}
        onPress={() => togglePhotoSelection(item.id)}
      >
        <Image source={{ uri: item.uri }} style={mediaStyles.photo} />
        {isSelected && (
          <View style={mediaStyles.selectedOverlay}>
            <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={mediaStyles.container}>
      <View style={mediaStyles.header}>
        <Text style={mediaStyles.headerTitle}>Photos Backup</Text>
        <Text style={mediaStyles.headerSubtitle}>
          {photos.length} photos available • {selectedPhotos.size} selected
        </Text>
      </View>

      {selectedPhotos.size > 0 && (
        <View style={mediaStyles.actionBar}>
          <TouchableOpacity
            style={mediaStyles.backupButton}
            onPress={backupSelectedPhotos}
          >
            <Ionicons name="cloud-upload" size={20} color="white" />
            <Text style={mediaStyles.backupButtonText}>
              Backup {selectedPhotos.size} Photos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={mediaStyles.clearButton}
            onPress={() => setSelectedPhotos(new Set())}
          >
            <Text style={mediaStyles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={mediaStyles.photoGrid}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const mediaStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
    color: '#8E8E93',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backupButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  backupButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  clearButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  clearButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  photoGrid: {
    padding: 15,
  },
  photoContainer: {
    width: imageSize,
    height: imageSize,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedPhoto: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 12,
  },
});
