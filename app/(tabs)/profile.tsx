import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { router } from "expo-router";

const APP_SWITCHER = [
  { id: "partner", label: "Partner App", sub: "Pharmacy / Store", icon: "medical", color: "#6BCB77" },
  { id: "rider", label: "Rider App", sub: "Delivery Partner", icon: "bicycle", color: "#4D96FF" },
  { id: "admin", label: "Admin Dashboard", sub: "Platform Control", icon: "settings", color: "#FFB547" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <LinearGradient colors={["#162844", "#1E3555"]} style={styles.userCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={[Colors.teal, Colors.tealLight]} style={styles.avatar}>
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

        {/* App Switcher */}
        <Text style={styles.switcherTitle}>Switch App</Text>
        <View style={styles.switcherGrid}>
          {APP_SWITCHER.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={styles.switcherCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/${app.id}` as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.switcherIcon, { backgroundColor: app.color + "22" }]}>
                <Ionicons name={app.icon as any} size={26} color={app.color} />
              </View>
              <Text style={styles.switcherLabel}>{app.label}</Text>
              <Text style={styles.switcherSub}>{app.sub}</Text>
              <Ionicons name="arrow-forward-circle" size={18} color={app.color} style={{ marginTop: 4 }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.settingsList}>
          {[
            { label: "Saved Addresses", icon: "location-outline" },
            { label: "My Prescriptions", icon: "document-text-outline" },
            { label: "Payment Methods", icon: "card-outline" },
          ].map((item, idx, arr) => (
            <TouchableOpacity key={item.label} style={[styles.settingsRow, idx < arr.length - 1 && styles.settingsRowBorder]} onPress={() => Haptics.selectionAsync()} activeOpacity={0.7}>
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIcon}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.teal} />
                </View>
                <Text style={styles.settingsLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

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
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  userCard: { marginHorizontal: 20, borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 24 },
  avatarWrap: { borderRadius: 24, overflow: "hidden" },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  userName: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text },
  userEmail: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  userVerified: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  userVerifiedText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.success },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.teal + "22", alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  switcherTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text, paddingHorizontal: 20, marginBottom: 12 },
  switcherGrid: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  switcherCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 14, gap: 4, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  switcherIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  switcherLabel: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.text, textAlign: "center" },
  switcherSub: { fontFamily: "DMSans_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  sectionLabel: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, paddingHorizontal: 20 },
  settingsList: { backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", marginHorizontal: 20, marginBottom: 20 },
  settingsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingsRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.teal + "22", alignItems: "center", justifyContent: "center" },
  settingsLabel: { fontFamily: "DMSans_500Medium", fontSize: 15, color: Colors.text },
  logoutBtn: { marginHorizontal: 20, backgroundColor: Colors.danger + "22", borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.danger + "44", marginBottom: 16 },
  logoutText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.danger },
  version: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted, textAlign: "center", paddingBottom: 8 },
});
