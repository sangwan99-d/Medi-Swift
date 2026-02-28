import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";

type OrderStatus = "PENDING" | "STORE_ACCEPTED" | "PREPARING" | "RIDER_ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "REJECTED";
type Filter = "ALL" | "ACTIVE" | "DELIVERED" | "REJECTED";

const STATUS_CONFIG: Record<OrderStatus, { color: string; icon: string }> = {
  PENDING: { color: Colors.warning, icon: "time-outline" },
  STORE_ACCEPTED: { color: Colors.teal, icon: "checkmark-circle-outline" },
  PREPARING: { color: "#4D96FF", icon: "bag-outline" },
  RIDER_ASSIGNED: { color: "#9B59B6", icon: "bicycle-outline" },
  IN_TRANSIT: { color: "#FF8C00", icon: "navigate-outline" },
  DELIVERED: { color: Colors.success, icon: "checkmark-done-circle" },
  REJECTED: { color: Colors.danger, icon: "close-circle-outline" },
};

export default function AdminOrdersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [filter, setFilter] = useState<Filter>("ALL");

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/orders"],
    refetchInterval: 8000,
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "ACTIVE", label: "Active" },
    { key: "DELIVERED", label: "Delivered" },
    { key: "REJECTED", label: "Rejected" },
  ];

  const activeStatuses: OrderStatus[] = ["PENDING", "STORE_ACCEPTED", "PREPARING", "RIDER_ASSIGNED", "IN_TRANSIT"];

  const filtered = (orders as any[]).filter((o) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return activeStatuses.includes(o.status);
    if (filter === "DELIVERED") return o.status === "DELIVERED";
    if (filter === "REJECTED") return o.status === "REJECTED";
    return true;
  });

  const activeCount = (orders as any[]).filter((o) => activeStatuses.includes(o.status)).length;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{activeCount} active</Text>
        </View>
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
          const conf = STATUS_CONFIG[item.status as OrderStatus] || { color: Colors.textMuted, icon: "help-circle" };
          return (
            <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
              <View style={styles.orderCard}>
                <View style={styles.orderCardTop}>
                  <View style={styles.orderLeft}>
                    <Text style={styles.orderId}>#{(item.id as string).slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderPharmacy}>{item.pharmacyName}</Text>
                    <Text style={styles.orderAddr} numberOfLines={1}>{item.address}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: conf.color + "22", borderColor: conf.color + "55" }]}>
                    <Ionicons name={conf.icon as any} size={12} color={conf.color} />
                    <Text style={[styles.statusText, { color: conf.color }]}>{item.status.replace(/_/g, " ")}</Text>
                  </View>
                </View>

                <View style={styles.orderMeta}>
                  <View style={styles.metaChip}>
                    <Ionicons name="bag-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{item.items?.length} items</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                  {item.riderName && (
                    <View style={styles.metaChip}>
                      <Ionicons name="bicycle-outline" size={12} color="#4D96FF" />
                      <Text style={[styles.metaText, { color: "#4D96FF" }]}>{item.riderName}</Text>
                    </View>
                  )}
                  {item.hasColdChain && (
                    <View style={[styles.metaChip, { backgroundColor: "#4D96FF11" }]}>
                      <Ionicons name="snow" size={12} color="#4D96FF" />
                      <Text style={[styles.metaText, { color: "#4D96FF" }]}>Cold Chain</Text>
                    </View>
                  )}
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString([], { day: "numeric", month: "short" })}</Text>
                  <Text style={styles.orderTotal}>₹{item.totalPrice}</Text>
                </View>

                {item.walletSplit && (
                  <View style={styles.splitRow}>
                    <Text style={[styles.splitItem, { color: "#6BCB77" }]}>Pharmacy: ₹{item.walletSplit.pharmacy}</Text>
                    <Text style={[styles.splitItem, { color: "#4D96FF" }]}>Rider: ₹{item.walletSplit.rider}</Text>
                    <Text style={[styles.splitItem, { color: "#FFB547" }]}>Platform: ₹{item.walletSplit.platform}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No orders found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.success + "22", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  liveText: { fontFamily: "DMSans_700Bold", fontSize: 13, color: Colors.success },
  filterRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 12, flexWrap: "wrap" },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: "#FFB54722", borderColor: "#FFB54788" },
  filterBtnText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.textSecondary },
  filterBtnTextActive: { color: "#FFB547" },
  list: { paddingHorizontal: 20, gap: 12 },
  orderCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  orderCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  orderLeft: { flex: 1, gap: 2 },
  orderId: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.text },
  orderPharmacy: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.textSecondary },
  orderAddr: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText: { fontFamily: "DMSans_700Bold", fontSize: 10 },
  orderMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.cardElevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.textMuted },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  orderDate: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted },
  orderTotal: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.teal },
  splitRow: { flexDirection: "row", justifyContent: "space-between" },
  splitItem: { fontFamily: "DMSans_700Bold", fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.textSecondary },
});
