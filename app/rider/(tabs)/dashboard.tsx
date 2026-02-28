import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Switch, RefreshControl, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing, withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { router } from "expo-router";

function PulseRing({ active }: { active: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);
  useEffect(() => {
    if (active) {
      scale.value = withRepeat(withTiming(1.5, { duration: 900, easing: Easing.out(Easing.ease) }), -1, false);
      opacity.value = withRepeat(withTiming(0, { duration: 900 }), -1, false);
    } else {
      scale.value = 1;
      opacity.value = 0;
    }
  }, [active]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  if (!active) return null;
  return (
    <Animated.View style={[styles.pulseRing, style]} />
  );
}

function OrderOfferCard({ order, riderId, onAccept, onDecline }: { order: any; riderId: string; onAccept: () => void; onDecline: () => void }) {
  const [countdown, setCountdown] = useState(60);
  const progress = useSharedValue(1);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    progress.value = withTiming(0, { duration: 60000, easing: Easing.linear });
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); onDecline(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
    backgroundColor: countdown > 20 ? "#4D96FF" : Colors.warning,
  }));

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.offerBadge}>
          <Ionicons name="flash" size={14} color={Colors.warning} />
          <Text style={styles.offerBadgeText}>NEW ORDER</Text>
        </View>
        <View style={styles.countdownPill}>
          <Ionicons name="time-outline" size={14} color={countdown > 20 ? "#4D96FF" : Colors.warning} />
          <Text style={[styles.countdownText, { color: countdown > 20 ? "#4D96FF" : Colors.warning }]}>{countdown}s</Text>
        </View>
      </View>

      <View style={styles.timerBarBg}>
        <Animated.View style={[styles.timerBar, barStyle]} />
      </View>

      <View style={styles.offerDetails}>
        <View style={styles.offerRow}>
          <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.offerAddr}>{order.address}</Text>
        </View>
        <View style={styles.offerRow}>
          <Ionicons name="bag-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.offerItems}>{order.items?.length} item(s)</Text>
        </View>
        {order.hasColdChain && (
          <View style={styles.offerRow}>
            <Ionicons name="snow" size={16} color="#4D96FF" />
            <Text style={[styles.offerItems, { color: "#4D96FF" }]}>Cold chain required</Text>
          </View>
        )}
      </View>

      <View style={styles.offerEarning}>
        <Text style={styles.offerEarningLabel}>Your earnings</Text>
        <Text style={styles.offerEarningAmount}>₹{Math.round(order.totalPrice * 0.1)}</Text>
      </View>

      <View style={styles.offerActions}>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color={Colors.danger} />
          <Text style={styles.declineBtnText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function RiderDashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [riderId, setRiderId] = useState<string | null>(null);
  const [dismissedOrders, setDismissedOrders] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  useEffect(() => {
    AsyncStorage.getItem("rider_session").then((s) => {
      if (s) setRiderId(JSON.parse(s).id);
      else router.replace("/rider" as any);
    });
  }, []);

  const { data: rider, refetch: refetchRider } = useQuery({
    queryKey: ["/api/rider", riderId],
    enabled: !!riderId,
    refetchInterval: 8000,
  });

  const { data: availableOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["/api/rider", riderId, "available-orders"],
    enabled: !!riderId && !!(rider as any)?.isOnline,
    refetchInterval: 5000,
  });

  const toggleOnline = useMutation({
    mutationFn: (isOnline: boolean) => apiRequest("PATCH", `/api/rider/${riderId}/online`, { isOnline }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/rider", riderId] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  });

  const acceptMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest("POST", `/api/rider/${riderId}/accept/${orderId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/rider", riderId] });
      qc.invalidateQueries({ queryKey: ["/api/rider", riderId, "available-orders"] });
      router.push("/rider/(tabs)/deliveries" as any);
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const r = rider as any;
  const pendingOffers = (availableOrders as any[]).filter((o) => !dismissedOrders.has(o.id));
  const currentOffer = pendingOffers[0] || null;

  if (!riderId) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: Colors.text, fontFamily: "DMSans_400Regular" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 84 : 100 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetchRider(); refetchOrders(); }} tintColor="#4D96FF" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {r?.name?.split(" ")[0] || "Rider"}</Text>
            <Text style={styles.subGreeting}>
              {r?.status === "PENDING_ADMIN_APPROVAL"
                ? "Awaiting admin approval"
                : r?.isOnline
                ? "You are online"
                : "You are offline"}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await AsyncStorage.removeItem("rider_session"); router.replace("/rider" as any); }}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Approval banner */}
        {r?.status === "PENDING_ADMIN_APPROVAL" && (
          <Animated.View entering={FadeInDown} style={styles.approvalBanner}>
            <Ionicons name="hourglass-outline" size={24} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.approvalTitle}>Under Review</Text>
              <Text style={styles.approvalText}>Your application is being reviewed by our team. You'll be notified once approved.</Text>
            </View>
          </Animated.View>
        )}

        {/* Online toggle */}
        {r?.status === "APPROVED" && (
          <LinearGradient
            colors={r?.isOnline ? ["#4D96FF22", "#4D96FF11"] : ["#162844", "#162844"]}
            style={styles.onlineCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.onlineLeft}>
              <View style={styles.onlineIndicatorWrap}>
                <PulseRing active={!!r?.isOnline} />
                <View style={[styles.onlineDot, { backgroundColor: r?.isOnline ? Colors.success : Colors.textMuted }]} />
              </View>
              <View>
                <Text style={styles.onlineTitle}>{r?.isOnline ? "Online" : "Offline"}</Text>
                <Text style={styles.onlineSub}>{r?.isOnline ? "Ready to accept orders" : "Go online to receive orders"}</Text>
              </View>
            </View>
            <Switch
              value={!!r?.isOnline}
              onValueChange={(v) => { Haptics.selectionAsync(); toggleOnline.mutate(v); }}
              trackColor={{ false: Colors.textMuted + "55", true: "#4D96FF88" }}
              thumbColor={r?.isOnline ? "#4D96FF" : Colors.textMuted}
              disabled={toggleOnline.isPending}
            />
          </LinearGradient>
        )}

        {/* Stats */}
        {r?.status === "APPROVED" && (
          <View style={styles.statsGrid}>
            {[
              { label: "Wallet Balance", value: `₹${(r?.walletBalance || 0).toLocaleString()}`, icon: "wallet", color: Colors.teal },
              { label: "Total Earned", value: `₹${(r?.totalEarnings || 0).toLocaleString()}`, icon: "trending-up", color: "#6BCB77" },
              { label: "Vehicle", value: r?.vehicleType || "—", icon: "bicycle", color: "#4D96FF" },
              { label: "Status", value: r?.isOnline ? "Online" : "Offline", icon: "radio", color: r?.isOnline ? Colors.success : Colors.textMuted },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + "22" }]}>
                  <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Order offer */}
        {r?.isOnline && r?.status === "APPROVED" && currentOffer && !r?.currentOrderId && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Available</Text>
          </View>
        )}
        {r?.isOnline && r?.status === "APPROVED" && currentOffer && !r?.currentOrderId && (
          <OrderOfferCard
            order={currentOffer}
            riderId={riderId}
            onAccept={() => acceptMutation.mutate(currentOffer.id)}
            onDecline={() => setDismissedOrders((prev) => new Set([...prev, currentOffer.id]))}
          />
        )}

        {/* Active delivery notice */}
        {r?.currentOrderId && (
          <Animated.View entering={FadeInDown.springify()} style={styles.activeDeliveryBanner}>
            <Ionicons name="navigate" size={22} color="#4D96FF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeDeliveryTitle}>Active Delivery</Text>
              <Text style={styles.activeDeliverySub}>You have an ongoing delivery. Tap to view.</Text>
            </View>
            <TouchableOpacity style={styles.viewDeliveryBtn} onPress={() => router.push("/rider/(tabs)/deliveries" as any)}>
              <Text style={styles.viewDeliveryBtnText}>View</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Idle state */}
        {r?.isOnline && !currentOffer && !r?.currentOrderId && r?.status === "APPROVED" && (
          <View style={styles.idleState}>
            <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.idleTitle}>Looking for orders...</Text>
            <Text style={styles.idleText}>New orders will appear here automatically</Text>
          </View>
        )}

        {!r?.isOnline && r?.status === "APPROVED" && (
          <View style={styles.offlineState}>
            <Ionicons name="moon-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.idleTitle}>You're Offline</Text>
            <Text style={styles.idleText}>Toggle online above to start receiving orders</Text>
          </View>
        )}
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
  approvalBanner: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: Colors.warning + "22", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.warning + "44" },
  approvalTitle: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.warning, marginBottom: 4 },
  approvalText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.warning, lineHeight: 19 },
  onlineCard: { borderRadius: 20, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  onlineLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  onlineIndicatorWrap: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.success },
  onlineDot: { width: 14, height: 14, borderRadius: 7 },
  onlineTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text },
  onlineSub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flex: 1, minWidth: "44%", backgroundColor: Colors.card, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: Colors.border, alignItems: "flex-start" },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text },
  offerCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 20, gap: 16, borderWidth: 2, borderColor: "#4D96FF88" },
  offerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  offerBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.warning + "22", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  offerBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.warning },
  countdownPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  countdownText: { fontFamily: "DMSans_700Bold", fontSize: 18 },
  timerBarBg: { height: 5, backgroundColor: Colors.cardElevated, borderRadius: 3, overflow: "hidden" },
  timerBar: { height: 5, borderRadius: 3 },
  offerDetails: { gap: 8 },
  offerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  offerAddr: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.text, flex: 1 },
  offerItems: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary },
  offerEarning: { backgroundColor: Colors.teal + "11", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: Colors.teal + "33" },
  offerEarningLabel: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.textSecondary },
  offerEarningAmount: { fontFamily: "DMSans_700Bold", fontSize: 22, color: Colors.teal },
  offerActions: { flexDirection: "row", gap: 12 },
  declineBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.danger + "11", borderWidth: 1, borderColor: Colors.danger + "44", borderRadius: 14, paddingVertical: 14 },
  declineBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.danger },
  acceptBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#4D96FF", borderRadius: 14, paddingVertical: 14 },
  acceptBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
  activeDeliveryBanner: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#4D96FF22", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#4D96FF44" },
  activeDeliveryTitle: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#4D96FF", marginBottom: 2 },
  activeDeliverySub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary },
  viewDeliveryBtn: { backgroundColor: "#4D96FF", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  viewDeliveryBtnText: { fontFamily: "DMSans_700Bold", fontSize: 13, color: "#fff" },
  idleState: { alignItems: "center", paddingTop: 40, gap: 10 },
  offlineState: { alignItems: "center", paddingTop: 40, gap: 10 },
  idleTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.textSecondary },
  idleText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
});
