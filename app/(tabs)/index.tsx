import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackupService from "../../hooks/BackupService"; // Import our backup service

interface DashboardStats {
  totalContacts: number;
  totalPhotos: number;
  totalVideos: number;
  lastBackup: string | null;
}

interface BackupProgress {
  type: string;
  processed: number;
  total: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalPhotos: 0,
    totalVideos: 0,
    lastBackup: null,
  });
  const [loading, setLoading] = useState(true);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(
    null
  );
  const [backupStatus, setBackupStatus] = useState("");
  const [showProgressModal, setShowProgressModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Try to load stats from API first
      try {
        const apiStats = await BackupService.getDashboardStats();
        setStats({
          totalContacts: apiStats.totalContacts,
          totalPhotos: apiStats.totalPhotos,
          totalVideos: apiStats.totalVideos,
          lastBackup: apiStats.lastBackup,
        });
      } catch (apiError) {
        console.warn(
          "Failed to load from API, falling back to local:",
          apiError
        );

        // Fallback to local data counting
        await loadLocalStats();
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStats = async () => {
    try {
      // Initialize BackupService to get local counts
      await BackupService.initialize();

      const [contactsCount, photosCount, videosCount] = await Promise.all([
        BackupService.getLocalContactsCount(),
        BackupService.getLocalMediaCount("photo"),
        BackupService.getLocalMediaCount("video"),
      ]);

      setStats({
        totalContacts: contactsCount,
        totalPhotos: photosCount,
        totalVideos: videosCount,
        lastBackup: null, // Will be loaded from AsyncStorage if available
      });
    } catch (error) {
      console.error("Error loading local stats:", error);
    }
  };

  const performFullBackup = async () => {
    try {
      setBackupInProgress(true);
      setShowProgressModal(true);
      setBackupProgress(null);

      await BackupService.performFullBackup(
        // Progress callback
        (progress: BackupProgress) => {
          setBackupProgress(progress);
        },
        // Status callback
        (status: string) => {
          setBackupStatus(status);
        }
      );

      setShowProgressModal(false);
      Alert.alert("Success", "Full backup completed successfully!");

      // Refresh dashboard data
      await loadDashboardData();
    } catch (error: any) {
      setShowProgressModal(false);
      console.error("Backup error:", error);
      Alert.alert("Error", `Backup failed: ${error.message}`);
    } finally {
      setBackupInProgress(false);
      setBackupProgress(null);
      setBackupStatus("");
    }
  };

  const getProgressPercentage = () => {
    if (!backupProgress || backupProgress.total === 0) return 0;
    const value = backupProgress.processed / backupProgress.total;
    return Math.max(0, Math.min(1, value)); // clamp between 0 and 1
  };

  const StatCard = ({
    icon,
    title,
    count,
    color,
  }: {
    icon: string;
    title: string;
    count: number;
    color: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statCount}>
        {loading ? "..." : count.toLocaleString()}
      </Text>
    </View>
  );

  const ProgressModal = () => (
    <Modal visible={showProgressModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Backup in Progress</Text>

          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.statusText}>{backupStatus}</Text>
          </View>

          {backupProgress && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>
                {backupProgress.type}: {backupProgress.processed} /{" "}
                {backupProgress.total}
              </Text>
              <Text style={styles.progressPercentage}>
                {Math.round(getProgressPercentage() * 100)}%
              </Text>
            </View>
          )}

          <Text style={styles.modalNote}>
            Please keep the app open during backup
          </Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Backup Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Monitor and manage your data backups
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            icon="people"
            title="Contacts"
            count={stats.totalContacts}
            color="#007AFF"
          />
          <StatCard
            icon="images"
            title="Photos"
            count={stats.totalPhotos}
            color="#34C759"
          />
          <StatCard
            icon="videocam"
            title="Videos"
            count={stats.totalVideos}
            color="#FF9500"
          />
        </View>

        <View style={styles.backupSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={[
              styles.backupButton,
              { opacity: backupInProgress ? 0.6 : 1 },
            ]}
            onPress={performFullBackup}
            disabled={backupInProgress}
          >
            <Ionicons
              name={backupInProgress ? "cloud-upload" : "cloud-upload"}
              size={24}
              color="white"
            />
            <Text style={styles.backupButtonText}>
              {backupInProgress ? "Backup in Progress..." : "Start Full Backup"}
            </Text>
          </TouchableOpacity>

          {stats.lastBackup && (
            <View style={styles.lastBackupCard}>
              <Ionicons name="time" size={20} color="#8E8E93" />
              <Text style={styles.lastBackupText}>
                Last backup: {new Date(stats.lastBackup).toLocaleDateString()}{" "}
                at {new Date(stats.lastBackup).toLocaleTimeString()}
              </Text>
            </View>
          )}

          {/* Backup History Button */}
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => {
              // Navigate to backup history screen
              Alert.alert("Info", "Backup history feature coming soon!");
            }}
          >
            <Ionicons name="list" size={20} color="#007AFF" />
            <Text style={styles.historyButtonText}>View Backup History</Text>
          </TouchableOpacity>
        </View>

        {/* Server Status */}
        <View style={styles.serverStatusSection}>
          <Text style={styles.sectionTitle}>Server Status</Text>
          <View style={styles.serverStatusCard}>
            <View style={styles.serverStatusIndicator}>
              <View
                style={[styles.statusDot, { backgroundColor: "#34C759" }]}
              />
              <Text style={styles.serverStatusText}>Connected</Text>
            </View>
            <Text style={styles.serverStatusSubtext}>
              All services operational
            </Text>
          </View>
        </View>
      </ScrollView>

      <ProgressModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  statsContainer: {
    padding: 20,
  },
  statCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
    color: "#000",
  },
  statCount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  backupSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#000",
  },
  backupButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
  },
  backupButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  lastBackupCard: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  lastBackupText: {
    marginLeft: 10,
    color: "#8E8E93",
    fontSize: 14,
  },
  historyButton: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  historyButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  serverStatusSection: {
    padding: 20,
  },
  serverStatusCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
  },
  serverStatusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  serverStatusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  serverStatusSubtext: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    margin: 20,
    alignItems: "center",
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  statusText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  progressBar: {
    width: "100%",
    height: 4,
    marginBottom: 8,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
  },
  modalNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
});
