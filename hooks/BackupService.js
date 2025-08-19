// BackupService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import * as Device from 'expo-device';
import * as MediaLibrary from 'expo-media-library';

const API_BASE_URL = 'http://192.168.43.128:3000/api'; // Replace with your actual server URL
// For development: 'http://localhost:3000/api' or 'http://your-ip:3000/api'

class BackupService {
  constructor() {
    this.deviceToken = null;
    this.isInitialized = false;
  }

  // Initialize the service and register device
  async initialize() {
    try {
      // Try to get existing device token
      this.deviceToken = await AsyncStorage.getItem('deviceToken');
      
      if (!this.deviceToken) {
        await this.registerDevice();
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize BackupService:', error);
      return false;
    }
  }

  // Register device with the server
  async registerDevice() {
    try {
      const deviceInfo = {
        deviceId: Device.deviceId || Device.osBuildId || 'unknown',
        deviceName: Device.deviceName || Device.modelName || 'Unknown Device',
        platform: Device.osName || 'unknown',
        appVersion: '1.0.0' // You can get this from app.json or package.json
      };
      console.log(deviceInfo);
      console.log(`${API_BASE_URL}/device/register`);
      const response = await fetch(`${API_BASE_URL}/device/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(deviceInfo),
      });
      if (!response.ok) {
        throw new Error(`Failed to register device: ${response.status}`);
      }

      const data = await response.json();
      this.deviceToken = data.deviceToken;
      await AsyncStorage.setItem('deviceToken', this.deviceToken);
      return data;
    } catch (error) {
      console.error('Failed to register device:', error);
      throw error;
    }
  }

  // Perform full backup
  async performFullBackup(onProgress, onStatusUpdate) {
    try {
      onStatusUpdate?.('Initializing backup...');
      
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get current stats for session initialization
      const [contactsResult, photosResult, videosResult] = await Promise.all([
        this.getLocalContactsCount(),
        this.getLocalMediaCount('photo'),
        this.getLocalMediaCount('video')
      ]);

      const stats = {
        totalContacts: contactsResult,
        totalPhotos: photosResult,
        totalVideos: videosResult
      };

      // Start backup session
      onStatusUpdate?.('Starting backup session...');
      const sessionId = await this.startBackupSession(stats);

      try {
        // Backup contacts
        onStatusUpdate?.('Backing up contacts...');
        await this.backupContacts(sessionId, (type, processed) => {
          onProgress?.({ type, processed, total: stats.totalContacts });
        });

        // Backup photos
        if (stats.totalPhotos > 0) {
          onStatusUpdate?.('Backing up photos...');
          await this.backupMedia(sessionId, 'photos', (type, processed, total) => {
            onProgress?.({ type, processed, total });
          });
        }

        // Backup videos
        if (stats.totalVideos > 0) {
          onStatusUpdate?.('Backing up videos...');
          await this.backupMedia(sessionId, 'videos', (type, processed, total) => {
            onProgress?.({ type, processed, total });
          });
        }

        // Complete backup session
        onStatusUpdate?.('Completing backup...');
        const result = await this.completeBackupSession(sessionId);

        onStatusUpdate?.('Backup completed successfully!');
        return result;

      } catch (error) {
        // Mark session as failed
        try {
          await fetch(`${API_BASE_URL}/backup/complete`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ 
              sessionId, 
              status: 'failed',
              error: error.message 
            }),
          });
        } catch (completeError) {
          console.error('Failed to mark session as failed:', completeError);
        }
        throw error;
      }

    } catch (error) {
      onStatusUpdate?.(`Backup failed: ${error.message}`);
      throw error;
    }
  }

  // Helper method to get local contacts count
  async getLocalContactsCount() {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') return 0;

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name],
      });
      return data.length;
    } catch (error) {
      console.error('Failed to get contacts count:', error);
      return 0;
    }
  }

  // Helper method to get local media count
  async getLocalMediaCount(type) {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return 0;

      const result = await MediaLibrary.getAssetsAsync({
        mediaType: type,
        first: 1,
      });
      return result.totalCount;
    } catch (error) {
      console.error(`Failed to get ${type} count:`, error);
      return 0;
    }
  }
  // Get API headers with device token
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Device-Token': this.deviceToken,
    };
  }

  // Start a backup session
  async startBackupSession(stats) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
    //   /api/backup/start
console.log(`${API_BASE_URL}/backup/start`)
      const response = await fetch(`${API_BASE_URL}/backup/start`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          type: 'full',
          totalContacts: stats.totalContacts || 0,
          totalPhotos: stats.totalPhotos || 0,
          totalVideos: stats.totalVideos || 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start backup session:AA ${response.status}`);
      }

      const data = await response.json();
      return data.sessionId;
    } catch (error) {
      console.error('Failed to start backup session:w', error);
      throw error;
    }
  }

  // Get backup history
  async getBackupHistory(page = 1, limit = 10) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const response = await fetch(`${API_BASE_URL}/backup/history?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get backup history: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get backup history:', error);
      throw error;
    }
  }

  // Implement backupContacts method
async backupContacts(sessionId, onProgress) {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Contacts permission not granted');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
    });

    // Option 1: Send all contacts in one batch (RECOMMENDED for best performance)
    const response = await fetch(`${API_BASE_URL}/backup/contacts`, { // Note: plural "contacts"
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        sessionId,
        contacts: data, // Send all contacts at once
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to backup contacts: ${response.status}`);
    }

    // Update progress once
    onProgress?.('contacts', data.length);
    return true;

  } catch (error) {
    console.error('Failed to backup contacts:', error);
    throw error;
  }
}

    // Backup media (photos/videos)
// Updated Frontend Media Backup Method - Supports all file types
async backupMedia(sessionId, type, onProgress) {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error(`Media library permission not granted`);
    }

    // Get all media assets (not just photos/videos)
    const mediaTypes = ['photo', 'video']; // MediaLibrary mainly supports these
    let allAssets = [];
    let totalCount = 0;

    // Fetch assets by type
    for (const mediaType of mediaTypes) {
      if (type === 'all' || type === mediaType || 
          (type === 'photos' && mediaType === 'photo') ||
          (type === 'videos' && mediaType === 'video')) {
        
        const result = await MediaLibrary.getAssetsAsync({
          mediaType: mediaType,
          first: 10000, // Adjust based on your needs
        });
        
        allAssets = allAssets.concat(result.assets);
        totalCount += result.totalCount;
      }
    }

    console.log(`Found ${allAssets.length} media files to backup`);

    if (allAssets.length === 0) {
      onProgress?.(type, 0, 0);
      return true;
    }

    // Process in batches to avoid memory issues
    const BATCH_SIZE = 10; // Smaller batches for large files
    let processed = 0;

    for (let i = 0; i < allAssets.length; i += BATCH_SIZE) {
      const batch = allAssets.slice(i, i + BATCH_SIZE);
      
      // Process batch with error handling
      const batchPromises = batch.map(async (asset) => {
        try {
          return await this.uploadSingleMediaFile(sessionId, asset);
        } catch (error) {
          console.error(`Failed to upload ${asset.filename}:`, error);
          return false; // Mark as failed but continue with others
        }
      });

      const results = await Promise.all(batchPromises);
      const successCount = results.filter(Boolean).length;
      
      processed += successCount;
      onProgress?.(type, processed, allAssets.length);
      
      // Small delay between batches to prevent overwhelming the server
      if (i + BATCH_SIZE < allAssets.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Media backup completed: ${processed}/${allAssets.length} files`);
    return true;

  } catch (error) {
    console.error(`Failed to backup media:`, error);
    throw error;
  }
}

// Helper method to upload a single media file
async uploadSingleMediaFile(sessionId, asset) {
  try {
    // Get file info from asset
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
    
    // Determine file extension and type
    let fileName = asset.filename || `${asset.id}`;
    let mimeType = 'application/octet-stream';
    
    if (asset.mediaType === 'photo') {
      mimeType = 'image/jpeg';
      if (!fileName.includes('.')) fileName += '.jpg';
    } else if (asset.mediaType === 'video') {
      mimeType = 'video/mp4';
      if (!fileName.includes('.')) fileName += '.mp4';
    }

    // Create FormData
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('media', {
      uri: assetInfo.localUri || asset.uri,
      name: fileName,
      type: mimeType,
    });

    // Upload to server
    const response = await fetch(`${API_BASE_URL}/backup/media`, {
      method: 'POST',
      headers: {
        'X-Device-Token': this.deviceToken,
        // Don't set Content-Type - let FormData handle it
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error uploading single file:', error);
    throw error;
  }
}

// Enhanced backup method that supports different file categories
async performCategorizedBackup(sessionId, onProgress, onStatusUpdate) {
  try {
    const categories = ['photos', 'videos']; // Can be extended
    
    for (const category of categories) {
      onStatusUpdate?.(`Backing up ${category}...`);
      
      await this.backupMedia(sessionId, category, (type, processed, total) => {
        onProgress?.({ 
          type: category, 
          processed, 
          total,
          category: category 
        });
      });
    }
    
    return true;
  } catch (error) {
    console.error('Categorized backup failed:', error);
    throw error;
  }
}

// Alternative method using DocumentPicker for all file types (optional)
async backupDocuments(sessionId, onProgress) {
  try {
    // This would require expo-document-picker
    // import * as DocumentPicker from 'expo-document-picker';
    
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // All file types
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.type === 'cancel') {
      return false;
    }

    const files = Array.isArray(result.assets) ? result.assets : [result];
    let processed = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('sessionId', sessionId);
        formData.append('media', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        });

        await fetch(`${API_BASE_URL}/backup/media`, {
          method: 'POST',
          headers: {
            'X-Device-Token': this.deviceToken,
          },
          body: formData,
        });

        processed++;
        onProgress?.('documents', processed, files.length);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    return true;
  } catch (error) {
    console.error('Document backup failed:', error);
    throw error;
  }
}

}



// Export singleton instance
export default new BackupService();

// NOTE: If you use a ProgressBar in your UI, ensure its value is always a valid number and never null or undefined.
// Example fix in your component (not in this file, but in your UI code):
// <ProgressBar progress={progress ?? 0} />