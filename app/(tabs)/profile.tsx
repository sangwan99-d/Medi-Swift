import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useOrders } from "@/context/OrdersContext";
import { useCart } from "@/context/CartContext";

const SETTINGS_ROWS = [
  {
    section: "Preferences",
    items: [
      { id: "notifications", label: "Notifications", icon: "notifications-outline", type: "toggle" },
      { id: "coldchain", label: "Cold Chain Alerts", icon: "snow-outline", type: "toggle" },
    ],
  },
  {
    section: "Account",
    items: [
      { id: "address", label: "Saved Addresses", icon: "location-outline", type: "nav" },
      { id: "prescriptions", label: "My Prescriptions", icon: "document-text-outline", type: "nav" },
      { id: "payment", label: "Payment Methods", icon: "card-outline", type: "nav" },
    ],
  },
  {
    section: "Support",
    items: [
      { id: "help", label: "Help & Support", icon: "help-circle-outline", type: "nav" },
      { id: "privacy", label: "Privacy Policy", icon: "shield-outline", type: "nav" },
      { id: "about", label: "About MedSwift", icon: "information-circle-outline", type: "nav" },
    ],
  },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { orders } = useOrders();
  const { totalItems } = useCart();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Card */}
        <LinearGradient
          colors={["#162844", "#1E3555"]}
          style={styles.userCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={[Colors.teal, Colors.tealLight]}
              style={styles.avatar}
            >
              <Ionicons name="person" size={32} color="#fff" />
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>Rahul Sharma</Text>
            <Text style={styles.userEmail}>rahul.sharma@email.com</Text>
            <View style={styles.userVerified}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
              <Text style={styles.userVerifiedText}>Verified Account</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={16} color={Colors.teal} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{orders.length}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Text style={[styles.statNum, { color: Colors.teal }]}>{deliveredOrders}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalItems}</Text>
            <Text style={styles.statLabel}>In Cart</Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Ionicons name="location" size={16} color={Colors.teal} />
            <Text style={styles.addressHeaderText}>Delivery Address</Text>
            <TouchableOpacity style={styles.changeAddressBtn}>
              <Text style={styles.changeAddressText}>Change</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.addressText}>42, MG Road, Sector 18, Noida – 201301</Text>
        </View>

        {/* Settings Sections */}
        {SETTINGS_ROWS.map((section) => (
          <View key={section.section} style={styles.settingsSection}>
            <Text style={styles.sectionLabel}>{section.section}</Text>
            <View style={styles.settingsList}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingsRow,
                    idx < section.items.length - 1 && styles.settingsRowBorder,
                  ]}
                  onPress={() => Haptics.selectionAsync()}
                  activeOpacity={item.type === "toggle" ? 1 : 0.7}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIcon}>
                      <Ionicons name={item.icon as any} size={18} color={Colors.teal} />
                    </View>
                    <Text style={styles.settingsLabel}>{item.label}</Text>
                  </View>
                  {item.type === "toggle" ? (
                    <Switch
                      value={item.id === "notifications"}
                      onValueChange={() => Haptics.selectionAsync()}
                      trackColor={{ false: Colors.border, true: Colors.teal }}
                      thumbColor="#fff"
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>MedSwift v1.0.0 · 10-minute delivery</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  userCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  avatarWrap: {
    borderRadius: 24,
    overflow: "hidden",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  userEmail: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userVerified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  userVerifiedText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: Colors.success,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.teal + "22",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statCardHighlight: {
    borderColor: Colors.teal + "44",
    backgroundColor: Colors.teal + "11",
  },
  statNum: {
    fontFamily: "DMSans_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  addressCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addressHeaderText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  changeAddressBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeAddressText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: Colors.teal,
  },
  addressText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  settingsList: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.teal + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  logoutBtn: {
    marginHorizontal: 20,
    backgroundColor: Colors.danger + "22",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.danger + "44",
    marginBottom: 16,
  },
  logoutText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: Colors.danger,
  },
  version: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    paddingBottom: 8,
  },
});
