
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: { number: string }[];
}

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Contacts access is required for backup');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      setContacts(data as Contact[]);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  const backupSelectedContacts = async () => {
    try {
      if (selectedContacts.size === 0) {
        Alert.alert('No Selection', 'Please select contacts to backup');
        return;
      }

      Alert.alert('Backup Started', `Backing up ${selectedContacts.size} contacts...`);
      
      const selectedContactsData = contacts.filter(contact => 
        selectedContacts.has(contact.id)
      );
      
      const backupData = {
        contacts: selectedContactsData,
        timestamp: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('contactsBackup', JSON.stringify(backupData));
      
      Alert.alert('Success', `${selectedContacts.size} contacts backed up successfully!`);
      setSelectedContacts(new Set());
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Error', 'Contacts backup failed');
    }
  };

  const selectAllContacts = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(contact => contact.id)));
    }
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const isSelected = selectedContacts.has(item.id);
    const phoneNumber = item.phoneNumbers?.[0]?.number || 'No phone number';
    
    return (
      <TouchableOpacity
        style={[styles.contactItem, isSelected && styles.selectedContact]}
        onPress={() => toggleContactSelection(item.id)}
      >
        <View style={styles.contactAvatar}>
          <Text style={styles.contactInitial}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name || 'Unknown'}</Text>
          <Text style={styles.contactPhone}>{phoneNumber}</Text>
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
        <Text style={styles.headerTitle}>Contacts Backup</Text>
        <Text style={styles.headerSubtitle}>
          {contacts.length} contacts available • {selectedContacts.size} selected
        </Text>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={selectAllContacts}
        >
          <Text style={styles.selectAllText}>
            {selectedContacts.size === contacts.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>

        {selectedContacts.size > 0 && (
          <TouchableOpacity
            style={styles.backupButton}
            onPress={backupSelectedContacts}
          >
            <Ionicons name="cloud-upload" size={20} color="white" />
            <Text style={styles.backupButtonText}>
              Backup {selectedContacts.size}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.contactsList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    marginRight: 12,
  },
  selectAllText: {
    fontSize: 15,
    color: '#222',
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
  contactsList: {
    padding: 8,
  },
  contactItem: {
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
  selectedContact: {
    backgroundColor: '#E6F0FF',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInitial: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectionIndicator: {
    marginLeft: 12,
  },
});
