import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useCart } from "@/context/CartContext";
import { router } from "expo-router";

type OrderStatus = "PENDING" | "STORE_ACCEPTED" | "PREPARING" | "RIDER_ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "REJECTED";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: string; step: number }> = {
  PENDING: { label: "Order Placed", color: Colors.warning, icon: "time-outline", step: 0 },
  STORE_ACCEPTED: { label: "Pharmacy Confirmed", color: Colors.teal, icon: "checkmark-circle-outline", step: 1 },
  PREPARING: { label: "Being Picked", color: "#4D96FF", icon: "bag-outline", step: 2 },
  RIDER_ASSIGNED: { label: "Rider Assigned", color: "#9B59B6", icon: "bicycle-outline", step: 3 },
  IN_TRANSIT: { label: "Out for Delivery", color: "#FF8C00", icon: "navigate-outline", step: 4 },
  DELIVERED: { label: "Delivered", color: Colors.success, icon: "checkmark-done-circle-outline", step: 5 },
  REJECTED: { label: "Rejected", color: Colors.danger, icon: "close-circle-outline", step: -1 },
};

const STATUS_STEPS: OrderStatus[] = ["PENDING", "STORE_ACCEPTED", "PREPARING", "RIDER_ASSIGNED", "IN_TRANSIT", "DELIVERED"];

function StatusTracker({ status }: { status: OrderStatus }) {
  const currentStep = STATUS_CONFIG[status].step;
  if (status === "REJECTED") return null;
  return (
    <View style={styles.tracker}>
      {STATUS_STEPS.map((s, idx) => {
        const config = STATUS_CONFIG[s];
        const isCompleted = idx <= currentStep;
        return (
          <View key={s} style={styles.trackerStep}>
            <View style={[styles.trackerDot, isCompleted && { backgroundColor: Colors.teal }]}>
              {isCompleted && <Ionicons name="checkmark" size={8} color="#fff" />}
            </View>
            {idx < STATUS_STEPS.length - 1 && (
              <View style={[styles.trackerLine, { backgroundColor: idx < currentStep ? Colors.teal : Colors.border }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function OrderCard({ order, index }: { order: any; index: number }) {
  const statusConf = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.PENDING;
  const date = new Date(order.createdAt);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { day: "numeric", month: "short" });

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <View style={styles.orderCard}>
        <View style={styles.orderCardHeader}>
          <View>
            <Text style={styles.orderPharmacy}>{order.pharmacyName}</Text>
            <Text style={styles.orderId}>#{(order.id as string).slice(-6).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConf.color + "22", borderColor: statusConf.color + "55" }]}>
            <Ionicons name={statusConf.icon as any} size={12} color={statusConf.color} />
            <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
          </View>
        </View>
        <StatusTracker status={order.status} />
        <View style={styles.orderItems}>
          {(order.items || []).slice(0, 2).map((item: any) => (
            <View key={item.id} style={styles.orderItemRow}>
              <Text style={styles.orderItemEmoji}>{item.imageEmoji || "💊"}</Text>
              <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.orderItemQty}>×{item.quantity}</Text>
            </View>
          ))}
          {(order.items || []).length > 2 && (
            <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
          )}
        </View>
        {order.hasColdChain && (
          <View style={styles.orderAlert}>
            <Ionicons name="snow" size={12} color="#4D96FF" />
            <Text style={[styles.orderAlertText, { color: "#4D96FF" }]}>Cold chain delivery active</Text>
          </View>
        )}
        {order.riderName && order.status !== "DELIVERED" && (
          <View style={styles.riderRow}>
            <Ionicons name="bicycle" size={14} color={Colors.teal} />
            <Text style={styles.riderText}>{order.riderName} is your rider</Text>
          </View>
        )}
        {order.status === "DELIVERED" && order.otp && (
          <View style={styles.otpRow}>
            <Ionicons name="key-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.otpText}>OTP used: {order.otp}</Text>
          </View>
        )}
        <View style={styles.orderFooter}>
          <Text style={styles.orderDate}>{dateStr} · {timeStr}</Text>
          <Text style={styles.orderTotal}>₹{order.totalPrice}</Text>
        </View>
        {!["DELIVERED", "REJECTED"].includes(order.status) && (
          <View style={styles.etaRow}>
            <Ionicons name="flash" size={12} color={Colors.teal} />
            <Text style={styles.etaText}>Est. delivery in ~10 min</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { customerId } = useCart();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/orders/customer", customerId],
    refetchInterval: 8000,
  });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Orders</Text>
      </View>
      <FlatList
        data={orders as any[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <OrderCard order={item} index={index} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.teal} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={72} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>Order medicines to see them tracked here</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => router.push("/(tabs)/search")}>
              <Text style={styles.browseBtnText}>Browse Medicines</Text>
            </TouchableOpacity>
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
  listContent: { paddingHorizontal: 20, gap: 16 },
  orderCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 18, gap: 14, borderWidth: 1, borderColor: Colors.border },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderPharmacy: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.text },
  orderId: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText: { fontFamily: "DMSans_700Bold", fontSize: 11 },
  tracker: { flexDirection: "row", alignItems: "center" },
  trackerStep: { flexDirection: "row", alignItems: "center", flex: 1 },
  trackerDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.border, alignItems: "center", justifyContent: "center" },
  trackerLine: { flex: 1, height: 2, borderRadius: 1 },
  orderItems: { gap: 8 },
  orderItemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderItemEmoji: { fontSize: 16 },
  orderItemName: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  orderItemQty: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.textMuted },
  moreItems: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted, marginLeft: 24 },
  orderAlert: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#4D96FF11", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  orderAlertText: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.teal + "11", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  riderText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.teal },
  otpRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  otpText: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  orderDate: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textMuted },
  orderTotal: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.teal },
  etaRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  etaText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.teal },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 100, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 22, color: Colors.textSecondary },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  browseBtn: { backgroundColor: Colors.teal, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  browseBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
});
