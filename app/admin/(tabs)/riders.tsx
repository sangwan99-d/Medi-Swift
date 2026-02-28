import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, RefreshControl, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";

type Filter = "ALL" | "PENDING_ADMIN_APPROVAL" | "APPROVED" | "REJECTED";

export default function AdminRidersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [filter, setFilter] = useState<Filter>("ALL");
  const qc = useQueryClient();

  const { data: riders = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/riders"],
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/riders/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/riders"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/riders/${id}/reject`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/riders"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); },
  });

  const filtered = (riders as any[]).filter((r) => filter === "ALL" || r.status === filter);
  const pendingCount = (riders as any[]).filter((r) => r.status === "PENDING_ADMIN_APPROVAL").length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "PENDING_ADMIN_APPROVAL", label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
  ];

  const STATUS_COLOR: Record<string, string> = {
    PENDING_ADMIN_APPROVAL: Colors.warning,
    APPROVED: Colors.success,
    REJECTED: Colors.danger,
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Riders</Text>
        <Text style={styles.headerSub}>{(riders as any[]).length} registered</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => { setFilter(f.key); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#FFB547" />}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 84 : 100 }]}
        renderItem={({ item, index }: { item: any; index: number }) => {
          const color = STATUS_COLOR[item.status] || Colors.textMuted;
          return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="bicycle" size={24} color="#4D96FF" />
                    {item.isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardEmail}>{item.email}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
                    <Text style={[styles.statusText, { color }]}>
                      {item.status === "PENDING_ADMIN_APPROVAL" ? "Pending" : item.status === "APPROVED" ? "Active" : "Rejected"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  {[
                    { icon: "id-card-outline", label: "License", value: item.licenseNumber },
                    { icon: "bicycle-outline", label: "Vehicle", value: item.vehicleType },
                    { icon: "wallet-outline", label: "Earned", value: `₹${(item.totalEarnings || 0).toLocaleString()}` },
                    { icon: "radio-outline", label: "Online", value: item.isOnline ? "Yes" : "No" },
                  ].map((d) => (
                    <View key={d.label} style={styles.detailRow}>
                      <Ionicons name={d.icon as any} size={14} color={Colors.textMuted} />
                      <Text style={styles.detailLabel}>{d.label}:</Text>
                      <Text style={styles.detailValue}>{d.value}</Text>
                    </View>
                  ))}
                </View>

                {item.status === "PENDING_ADMIN_APPROVAL" && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => Alert.alert("Reject Rider?", `Reject application from ${item.name}?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Reject", style: "destructive", onPress: () => rejectMutation.mutate(item.id) },
                      ])}
                    >
                      <Ionicons name="close" size={16} color={Colors.danger} />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); approveMutation.mutate(item.id); }}
                      disabled={approveMutation.isPending}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>{approveMutation.isPending ? "Approving..." : "Approve"}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === "APPROVED" && (
                  <View style={styles.approvedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.approvedText}>
                      Verified — {item.isOnline ? "Online & active" : "Currently offline"}
                      {item.currentOrderId ? " · On delivery" : ""}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bicycle-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No riders found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  headerSub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textMuted },
  filterRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 12, flexWrap: "wrap" },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: "#FFB54722", borderColor: "#FFB54788" },
  filterBtnText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.textSecondary },
  filterBtnTextActive: { color: "#FFB547" },
  list: { paddingHorizontal: 20, gap: 14 },
  card: { backgroundColor: Colors.card, borderRadius: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#4D96FF22", alignItems: "center", justifyContent: "center", position: "relative" },
  onlineDot: { position: "absolute", top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success, borderWidth: 1, borderColor: Colors.card },
  cardName: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.text },
  cardEmail: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  statusText: { fontFamily: "DMSans_700Bold", fontSize: 11 },
  cardDetails: { gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted },
  detailValue: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  actionRow: { flexDirection: "row", gap: 10 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.danger + "11", borderWidth: 1, borderColor: Colors.danger + "44", borderRadius: 12, paddingVertical: 12 },
  rejectBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.danger },
  approveBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#4D96FF", borderRadius: 12, paddingVertical: 12 },
  approveBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#fff" },
  approvedRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.success + "11", padding: 10, borderRadius: 10 },
  approvedText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.success },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.textSecondary },
});
