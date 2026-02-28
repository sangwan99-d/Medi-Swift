import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { router } from "expo-router";

export default function RiderWalletScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [riderId, setRiderId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("rider_session").then((s) => {
      if (s) setRiderId(JSON.parse(s).id);
      else router.replace("/rider" as any);
    });
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/rider", riderId, "wallet"],
    enabled: !!riderId,
  });

  const rider = (data as any)?.rider;
  const txs: any[] = (data as any)?.transactions || [];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <FlatList
        data={txs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#4D96FF" />}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 84 : 100 }]}
        ListHeaderComponent={
          <>
            {/* Wallet Card */}
            <LinearGradient
              colors={["#4D96FF33", "#4D96FF11"]}
              style={styles.walletCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.walletLabel}>Available Balance</Text>
              <Text style={styles.walletBalance}>₹{(rider?.walletBalance || 0).toLocaleString()}</Text>
              <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.85}>
                <Ionicons name="arrow-down-circle-outline" size={18} color="#fff" />
                <Text style={styles.withdrawBtnText}>Withdraw to Bank</Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>₹{(rider?.totalEarnings || 0).toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{txs.length}</Text>
                <Text style={styles.statLabel}>Deliveries</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statCard}>
                <Text style={styles.statValue}>10%</Text>
                <Text style={styles.statLabel}>Per Order</Text>
              </View>
            </View>

            {/* Split info */}
            <View style={styles.splitCard}>
              <Text style={styles.splitTitle}>Earnings Breakdown</Text>
              <View style={styles.splitRow}>
                <View style={styles.splitBar}>
                  <View style={[styles.splitSegment, { flex: 8, backgroundColor: "#6BCB77" }]} />
                  <View style={[styles.splitSegment, { flex: 1, backgroundColor: "#4D96FF" }]} />
                  <View style={[styles.splitSegment, { flex: 1, backgroundColor: Colors.textMuted }]} />
                </View>
              </View>
              {[
                { label: "Pharmacy", pct: "80%", color: "#6BCB77" },
                { label: "You (Rider)", pct: "10%", color: "#4D96FF" },
                { label: "Platform", pct: "10%", color: Colors.textMuted },
              ].map((item) => (
                <View key={item.label} style={styles.splitItem}>
                  <View style={[styles.splitDot, { backgroundColor: item.color }]} />
                  <Text style={styles.splitLabel}>{item.label}</Text>
                  <Text style={[styles.splitPct, { color: item.color }]}>{item.pct}</Text>
                </View>
              ))}
            </View>

            {txs.length > 0 && <Text style={styles.txHeader}>Transaction History</Text>}
          </>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <View style={styles.txCard}>
              <View style={[styles.txIcon, { backgroundColor: item.type === "credit" ? Colors.success + "22" : Colors.danger + "22" }]}>
                <Ionicons
                  name={item.type === "credit" ? "arrow-down-circle" : "arrow-up-circle"}
                  size={22}
                  color={item.type === "credit" ? Colors.success : Colors.danger}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txDesc}>{item.description}</Text>
                <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</Text>
              </View>
              <Text style={[styles.txAmount, { color: item.type === "credit" ? Colors.success : Colors.danger }]}>
                {item.type === "credit" ? "+" : "-"}₹{item.amount}
              </Text>
            </View>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyText}>Complete deliveries to see your earnings here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  content: { paddingHorizontal: 20, gap: 16 },
  walletCard: { borderRadius: 24, padding: 24, gap: 8, borderWidth: 1, borderColor: "#4D96FF44" },
  walletLabel: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textSecondary },
  walletBalance: { fontFamily: "DMSans_700Bold", fontSize: 44, color: "#4D96FF" },
  withdrawBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#4D96FF", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignSelf: "flex-start", marginTop: 8 },
  withdrawBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#fff" },
  statsRow: { flexDirection: "row", backgroundColor: Colors.card, borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  statCard: { flex: 1, alignItems: "center", gap: 4 },
  statSep: { width: 1, height: 36, backgroundColor: Colors.border },
  statValue: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.text },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary },
  splitCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.border },
  splitTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.text },
  splitRow: { marginBottom: 4 },
  splitBar: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", gap: 1 },
  splitSegment: { height: "100%" },
  splitItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  splitDot: { width: 10, height: 10, borderRadius: 5 },
  splitLabel: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textSecondary, flex: 1 },
  splitPct: { fontFamily: "DMSans_700Bold", fontSize: 14 },
  txHeader: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text, marginTop: 4 },
  txCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.border },
  txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txDesc: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.text },
  txDate: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  txAmount: { fontFamily: "DMSans_700Bold", fontSize: 16 },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.textSecondary },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
});
