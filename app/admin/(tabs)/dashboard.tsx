import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { router } from "expo-router";

function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: string; color: string; sub?: string }) {
  return (
    <Animated.View entering={FadeInDown.springify()} style={[styles.statCard, { borderColor: color + "33" }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </Animated.View>
  );
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [adminName, setAdminName] = useState("Admin");
  const qc = useQueryClient();

  useEffect(() => {
    AsyncStorage.getItem("admin_session").then((s) => {
      if (s) setAdminName(JSON.parse(s).name);
      else router.replace("/admin" as any);
    });
  }, []);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 10000,
  });

  const flushMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/midnight-flush", {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); Alert.alert("Midnight Flush", "All rider and store statuses have been reset."); },
  });

  const s = stats as any;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#FFB547" />}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.subGreeting}>Welcome back, {adminName}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await AsyncStorage.removeItem("admin_session"); router.replace("/admin" as any); }}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Approval alerts */}
        {((s?.pendingPartners || 0) > 0 || (s?.pendingRiders || 0) > 0) && (
          <View style={styles.alertCard}>
            <Ionicons name="notifications" size={20} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Pending Approvals</Text>
              <Text style={styles.alertText}>
                {s?.pendingPartners > 0 ? `${s.pendingPartners} pharmacy` : ""}
                {s?.pendingPartners > 0 && s?.pendingRiders > 0 ? " & " : ""}
                {s?.pendingRiders > 0 ? `${s.pendingRiders} rider` : ""}
                {" "}awaiting review
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/admin/(tabs)/partners" as any)}>
              <Text style={styles.alertAction}>Review</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Total Orders" value={s?.totalOrders || 0} icon="receipt" color="#4D96FF" />
          <StatCard label="Active Now" value={s?.activeOrders || 0} icon="flash" color={Colors.warning} />
          <StatCard label="Delivered" value={s?.deliveredOrders || 0} icon="checkmark-done-circle" color={Colors.success} />
          <StatCard label="Online Riders" value={s?.onlineRiders || 0} icon="bicycle" color={Colors.teal} />
        </View>

        {/* Revenue card */}
        <LinearGradient colors={["#FFB54722", "#FFB54711"]} style={styles.revenueCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.revenueLabel}>Platform Revenue</Text>
          <Text style={styles.revenueAmount}>₹{(s?.platformCommission || 0).toLocaleString()}</Text>
          <View style={styles.revenueBreakdown}>
            <View style={styles.revRow}>
              <View style={[styles.revDot, { backgroundColor: "#6BCB77" }]} />
              <Text style={styles.revLabel}>Pharmacy Payouts</Text>
              <Text style={styles.revVal}>₹{(s?.totalPharmacyPayouts || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.revRow}>
              <View style={[styles.revDot, { backgroundColor: "#4D96FF" }]} />
              <Text style={styles.revLabel}>Rider Earnings</Text>
              <Text style={styles.revVal}>₹{(s?.totalRiderEarnings || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.revRow}>
              <View style={[styles.revDot, { backgroundColor: "#FFB547" }]} />
              <Text style={styles.revLabel}>Platform (10%)</Text>
              <Text style={[styles.revVal, { color: "#FFB547" }]}>₹{(s?.platformCommission || 0).toLocaleString()}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: "Approve Partners", icon: "medical", color: "#6BCB77", count: s?.pendingPartners, route: "/admin/(tabs)/partners" },
            { label: "Approve Riders", icon: "bicycle", color: "#4D96FF", count: s?.pendingRiders, route: "/admin/(tabs)/riders" },
            { label: "Live Orders", icon: "navigate", color: Colors.teal, count: s?.activeOrders, route: "/admin/(tabs)/orders" },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(action.route as any); }}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + "22" }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
                {action.count > 0 && (
                  <View style={[styles.actionBadge, { backgroundColor: action.color }]}>
                    <Text style={styles.actionBadgeText}>{action.count}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Midnight flush */}
        <TouchableOpacity
          style={styles.flushBtn}
          onPress={() => Alert.alert("Midnight Flush", "This will log out all offline riders and close all stores. Continue?", [
            { text: "Cancel", style: "cancel" },
            { text: "Execute", style: "destructive", onPress: () => flushMutation.mutate() },
          ])}
          activeOpacity={0.8}
        >
          <Ionicons name="moon" size={18} color={Colors.textMuted} />
          <Text style={styles.flushBtnText}>Trigger Midnight Flush</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  scroll: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 8 },
  greeting: { fontFamily: "DMSans_700Bold", fontSize: 26, color: Colors.text },
  subGreeting: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card, alignItems: "center", justifyContent: "center" },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.warning + "22", padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.warning + "44" },
  alertTitle: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.warning },
  alertText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.warning, marginTop: 2 },
  alertAction: { fontFamily: "DMSans_700Bold", fontSize: 13, color: Colors.warning, textDecorationLine: "underline" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flex: 1, minWidth: "44%", backgroundColor: Colors.card, borderRadius: 16, padding: 14, gap: 4, borderWidth: 1, alignItems: "flex-start" },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statValue: { fontFamily: "DMSans_700Bold", fontSize: 26 },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary },
  statSub: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.textMuted },
  revenueCard: { borderRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: "#FFB54744" },
  revenueLabel: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textSecondary },
  revenueAmount: { fontFamily: "DMSans_700Bold", fontSize: 38, color: "#FFB547" },
  revenueBreakdown: { gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  revRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  revDot: { width: 8, height: 8, borderRadius: 4 },
  revLabel: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  revVal: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.text },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text },
  actionsGrid: { flexDirection: "row", gap: 12 },
  actionCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", position: "relative" },
  actionBadge: { position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 10, color: "#fff" },
  actionLabel: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.text, textAlign: "center" },
  flushBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.card, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border },
  flushBtnText: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.textMuted },
});
