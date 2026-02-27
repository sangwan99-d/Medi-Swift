import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { router } from "expo-router";

export default function PartnerProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    AsyncStorage.getItem("partner_session").then((s) => {
      if (s) setPartnerId(JSON.parse(s).id);
    });
  }, []);

  const { data: partner } = useQuery({
    queryKey: ["/api/partner", partnerId],
    enabled: !!partnerId,
  });

  const toggleMutation = useMutation({
    mutationFn: (isOpen: boolean) => apiRequest("PATCH", `/api/partner/${partnerId}/status`, { isOpen }),
    onSuccess: (res) => { res.json().then(() => qc.invalidateQueries({ queryKey: ["/api/partner", partnerId] })); },
  });

  const handleLogout = async () => {
    await AsyncStorage.removeItem("partner_session");
    router.replace("/partner" as any);
  };

  const p = partner as any;
  const statusColor = p?.status === "APPROVED" ? Colors.success : p?.status === "REJECTED" ? Colors.danger : Colors.warning;
  const statusLabel = p?.status === "APPROVED" ? "Approved" : p?.status === "REJECTED" ? "Rejected" : "Pending Approval";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Store Profile</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(tabs)/profile" as any)}>
            <Ionicons name="home-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {p && (
          <>
            <LinearGradient colors={["#162844", "#1E3555"]} style={styles.storeCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.storeIconWrap}>
                <Ionicons name="medical" size={32} color="#6BCB77" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{p.storeName}</Text>
                <Text style={styles.storeGST}>GST: {p.gstNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + "22", borderColor: statusColor + "55" }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
            </LinearGradient>

            {p.status === "APPROVED" && (
              <View style={styles.toggleCard}>
                <View style={{ gap: 4 }}>
                  <Text style={styles.toggleTitle}>Store Status</Text>
                  <Text style={styles.toggleSub}>{p.isOpen ? "Accepting orders" : "Not accepting orders"}</Text>
                </View>
                <Switch
                  value={p.isOpen}
                  onValueChange={(v) => { Haptics.selectionAsync(); toggleMutation.mutate(v); }}
                  trackColor={{ false: Colors.danger + "55", true: Colors.success + "88" }}
                  thumbColor={p.isOpen ? Colors.success : Colors.danger}
                />
              </View>
            )}

            <View style={styles.walletCard}>
              <View style={styles.walletRow}>
                <View>
                  <Text style={styles.walletLabel}>Wallet Balance</Text>
                  <Text style={styles.walletAmount}>₹{p.walletBalance?.toLocaleString()}</Text>
                </View>
                <View style={styles.walletSep} />
                <View>
                  <Text style={styles.walletLabel}>Total Earnings</Text>
                  <Text style={styles.walletTotal}>₹{p.totalEarnings?.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.splitInfo}>
                <Ionicons name="pie-chart-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.splitInfoTxt}>You receive 80% of each order (10% rider, 10% platform)</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Store Information</Text>
              {[
                { label: "Contact Name", value: p.name },
                { label: "Email", value: p.email },
                { label: "Pharmacy ID", value: p.pharmacyId },
                { label: "Location", value: `${p.location?.lat?.toFixed(4)}, ${p.location?.lng?.toFixed(4)}` },
                { label: "Member Since", value: new Date(p.createdAt).toLocaleDateString() },
              ].map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card, alignItems: "center", justifyContent: "center" },
  storeCard: { marginHorizontal: 20, borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  storeIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: "#6BCB7722", alignItems: "center", justifyContent: "center" },
  storeName: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text },
  storeGST: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start", marginTop: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontFamily: "DMSans_700Bold", fontSize: 11 },
  toggleCard: { marginHorizontal: 20, backgroundColor: Colors.card, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  toggleTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.text },
  toggleSub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary },
  walletCard: { marginHorizontal: 20, backgroundColor: Colors.teal + "11", borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.teal + "33", marginBottom: 16 },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  walletLabel: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary },
  walletAmount: { fontFamily: "DMSans_700Bold", fontSize: 26, color: Colors.teal },
  walletSep: { width: 1, height: 40, backgroundColor: Colors.border },
  walletTotal: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.text },
  splitInfo: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  splitInfoTxt: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted, flex: 1 },
  infoCard: { marginHorizontal: 20, backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  infoTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.text, marginBottom: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.text, textAlign: "right", flex: 1, paddingLeft: 16 },
  logoutBtn: { marginHorizontal: 20, backgroundColor: Colors.danger + "22", borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.danger + "44" },
  logoutText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.danger },
});
