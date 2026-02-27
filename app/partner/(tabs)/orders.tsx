import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl, Alert, Modal, Image, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { router } from "expo-router";

type OrderStatus = "PENDING" | "STORE_ACCEPTED" | "PREPARING" | "RIDER_ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "REJECTED";

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: Colors.warning,
  STORE_ACCEPTED: Colors.teal,
  PREPARING: "#4D96FF",
  RIDER_ASSIGNED: "#9B59B6",
  IN_TRANSIT: "#FF8C00",
  DELIVERED: Colors.success,
  REJECTED: Colors.danger,
};

function AlertRing({ visible }: { visible: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (visible) {
      scale.value = withRepeat(withTiming(1.4, { duration: 700, easing: Easing.out(Easing.ease) }), -1, true);
      opacity.value = withRepeat(withTiming(0.3, { duration: 700 }), -1, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      scale.value = 1;
      opacity.value = 1;
    }
  }, [visible]);
  if (!visible) return null;
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return (
    <Animated.View style={[styles.alertRing, ringStyle]}>
      <View style={styles.alertRingInner} />
    </Animated.View>
  );
}

function OrderDetailModal({ order, visible, onClose, partnerId }: { order: any; visible: boolean; onClose: () => void; partnerId: string }) {
  const qc = useQueryClient();
  const [prescriptionVerified, setPrescriptionVerified] = useState(false);
  const [substituteNote, setSubstituteNote] = useState("");
  const [showSubstitute, setShowSubstitute] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/partner/orders/${order.id}/accept`, { prescriptionVerified }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/partner", partnerId, "orders"] }); onClose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const prepareMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/partner/orders/${order.id}/prepare`, { substituteNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/partner", partnerId, "orders"] }); onClose(); Alert.alert("Ready", "Order is being picked and rider will be assigned shortly."); },
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/partner/orders/${order.id}/reject`, { reason: "Out of stock" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/partner", partnerId, "orders"] }); onClose(); },
  });

  if (!order) return null;
  const hasPrescriptionItems = order.items?.some((i: any) => i.isPrescriptionRequired);
  const canAccept = !hasPrescriptionItems || prescriptionVerified;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Order #{(order.id as string).slice(-6).toUpperCase()}</Text>
              <Text style={styles.modalSub}>{order.address}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={order.items || []}
            keyExtractor={(i: any) => i.id}
            ListHeaderComponent={
              <View style={{ gap: 14, paddingBottom: 16 }}>
                <View style={styles.orderValueRow}>
                  <Text style={styles.orderValueLabel}>Order Value</Text>
                  <Text style={styles.orderValueAmount}>₹{order.totalPrice}</Text>
                </View>
                {order.hasColdChain && (
                  <View style={styles.coldChainAlert}>
                    <Ionicons name="snow" size={16} color="#4D96FF" />
                    <Text style={[styles.alertTxt, { color: "#4D96FF" }]}>Cold chain packaging required</Text>
                  </View>
                )}
                <Text style={styles.itemsHeader}>Items to Pick</Text>
              </View>
            }
            renderItem={({ item }: { item: any }) => (
              <View style={styles.orderItem}>
                <Text style={styles.orderItemEmoji}>{item.imageEmoji || "💊"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  <Text style={styles.orderItemUnit}>{item.unit} × {item.quantity}</Text>
                </View>
                <Text style={styles.orderItemPrice}>₹{item.price * item.quantity}</Text>
              </View>
            )}
            ListFooterComponent={
              <View style={{ gap: 14, paddingTop: 16 }}>
                {hasPrescriptionItems && (
                  <View style={styles.prescSection}>
                    <View style={styles.prescHeader}>
                      <Ionicons name="document-text" size={18} color={Colors.warning} />
                      <Text style={styles.prescTitle}>Prescription Verification</Text>
                    </View>
                    {order.prescriptionUri ? (
                      <View style={styles.prescImageWrap}>
                        <Image source={{ uri: order.prescriptionUri }} style={styles.prescImage} resizeMode="contain" />
                      </View>
                    ) : (
                      <Text style={styles.noPrescText}>No prescription uploaded by customer</Text>
                    )}
                    <TouchableOpacity style={[styles.verifyBtn, prescriptionVerified && styles.verifyBtnDone]} onPress={() => { setPrescriptionVerified(!prescriptionVerified); Haptics.selectionAsync(); }}>
                      <Ionicons name={prescriptionVerified ? "checkmark-circle" : "ellipse-outline"} size={20} color={prescriptionVerified ? Colors.success : Colors.textMuted} />
                      <Text style={[styles.verifyBtnText, prescriptionVerified && { color: Colors.success }]}>{prescriptionVerified ? "Prescription Verified" : "Mark as Verified"}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity onPress={() => setShowSubstitute(!showSubstitute)}>
                  <Text style={styles.substituteToggle}>{showSubstitute ? "- Hide" : "+ Add"} Substitute Note</Text>
                </TouchableOpacity>
                {showSubstitute && (
                  <TextInput style={styles.substituteInput} value={substituteNote} onChangeText={setSubstituteNote} placeholder="e.g. Substituted Azithromycin with Erythromycin 500mg" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />
                )}

                {order.status === "PENDING" && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.rejectBtn]} onPress={() => rejectMutation.mutate()}>
                      <Ionicons name="close" size={18} color={Colors.danger} />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.acceptBtn, !canAccept && styles.acceptBtnDisabled]} onPress={() => canAccept && acceptMutation.mutate()} disabled={!canAccept || acceptMutation.isPending}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.acceptBtnText}>{acceptMutation.isPending ? "Accepting..." : "Accept Order"}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {order.status === "STORE_ACCEPTED" && (
                  <TouchableOpacity style={styles.prepareBtn} onPress={() => prepareMutation.mutate()} disabled={prepareMutation.isPending}>
                    <Ionicons name="bag-check" size={18} color="#fff" />
                    <Text style={styles.prepareBtnText}>{prepareMutation.isPending ? "Marking..." : "Mark as Ready for Pickup"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

export default function PartnerOrdersScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const prevPendingCount = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem("partner_session").then((s) => {
      if (s) setPartnerId(JSON.parse(s).id);
      else router.replace("/partner" as any);
    });
  }, []);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/partner", partnerId, "orders"],
    enabled: !!partnerId,
    refetchInterval: 5000,
  });

  const pendingOrders = (orders as any[]).filter((o) => o.status === "PENDING");
  const hasNewOrder = pendingOrders.length > prevPendingCount.current;
  useEffect(() => {
    if (pendingOrders.length > prevPendingCount.current && prevPendingCount.current >= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    prevPendingCount.current = pendingOrders.length;
  }, [pendingOrders.length]);

  const getStatusColor = (s: string) => STATUS_COLOR[s as OrderStatus] || Colors.textMuted;

  if (!partnerId) return <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}><Text style={{ color: Colors.text }}>Loading...</Text></View>;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Order Inbox</Text>
          {pendingOrders.length > 0 && (
            <View style={styles.pendingAlert}>
              <AlertRing visible={true} />
              <Ionicons name="notifications" size={14} color={Colors.warning} />
              <Text style={styles.pendingAlertText}>{pendingOrders.length} new order{pendingOrders.length > 1 ? "s" : ""} waiting</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.push("/partner/(tabs)/profile" as any)} style={styles.storeBtn}>
          <Ionicons name="business" size={20} color="#6BCB77" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders as any[]}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6BCB77" />}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 84 : 100 }]}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
            <TouchableOpacity style={[styles.orderCard, item.status === "PENDING" && styles.orderCardPending]} onPress={() => { setSelectedOrder(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} activeOpacity={0.85}>
              <View style={styles.orderCardTop}>
                <View style={styles.orderCardLeft}>
                  <Text style={styles.orderCardId}>#{(item.id as string).slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderCardAddr} numberOfLines={1}>{item.address}</Text>
                </View>
                <View style={[styles.orderCardBadge, { backgroundColor: getStatusColor(item.status) + "22", borderColor: getStatusColor(item.status) + "55" }]}>
                  <Text style={[styles.orderCardBadgeText, { color: getStatusColor(item.status) }]}>{item.status.replace(/_/g, " ")}</Text>
                </View>
              </View>
              <View style={styles.orderCardBottom}>
                <Text style={styles.orderCardItems}>{(item.items || []).length} items · {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                <Text style={styles.orderCardValue}>₹{item.totalPrice}</Text>
              </View>
              {item.hasColdChain && <View style={styles.coldTag}><Ionicons name="snow" size={10} color="#4D96FF" /><Text style={styles.coldTagText}>Cold Chain</Text></View>}
              {item.status === "PENDING" && <View style={styles.tapToView}><Ionicons name="hand-right-outline" size={12} color={Colors.warning} /><Text style={styles.tapToViewText}>Tap to review & accept</Text></View>}
            </TouchableOpacity>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>New orders will appear here with an alert</Text>
          </View>
        }
      />

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} visible={!!selectedOrder} onClose={() => setSelectedOrder(null)} partnerId={partnerId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  pendingAlert: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  pendingAlertText: { fontFamily: "DMSans_700Bold", fontSize: 13, color: Colors.warning },
  alertRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.warning, alignItems: "center", justifyContent: "center" },
  alertRingInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.warning },
  storeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#6BCB7722", alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, gap: 12 },
  orderCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  orderCardPending: { borderColor: Colors.warning + "66", backgroundColor: Colors.warning + "08" },
  orderCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderCardLeft: { gap: 2 },
  orderCardId: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.text },
  orderCardAddr: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary },
  orderCardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  orderCardBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 10 },
  orderCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderCardItems: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textMuted },
  orderCardValue: { fontFamily: "DMSans_700Bold", fontSize: 18, color: "#6BCB77" },
  coldTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#4D96FF22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  coldTagText: { fontFamily: "DMSans_500Medium", fontSize: 10, color: "#4D96FF" },
  tapToView: { flexDirection: "row", alignItems: "center", gap: 4 },
  tapToViewText: { fontFamily: "DMSans_500Medium", fontSize: 11, color: Colors.warning },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.textSecondary },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", paddingHorizontal: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.text },
  modalSub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  modalClose: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.cardElevated, alignItems: "center", justifyContent: "center" },
  orderValueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16 },
  orderValueLabel: { fontFamily: "DMSans_500Medium", fontSize: 15, color: Colors.textSecondary },
  orderValueAmount: { fontFamily: "DMSans_700Bold", fontSize: 22, color: "#6BCB77" },
  coldChainAlert: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#4D96FF22", padding: 10, borderRadius: 10 },
  alertTxt: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  itemsHeader: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.text },
  orderItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  orderItemEmoji: { fontSize: 24 },
  orderItemName: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.text },
  orderItemUnit: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted },
  orderItemPrice: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.teal },
  prescSection: { backgroundColor: Colors.warning + "11", borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.warning + "33" },
  prescHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  prescTitle: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.warning },
  prescImageWrap: { height: 150, borderRadius: 12, overflow: "hidden", backgroundColor: Colors.cardElevated },
  prescImage: { width: "100%", height: "100%" },
  noPrescText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textMuted, fontStyle: "italic" },
  verifyBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, backgroundColor: Colors.cardElevated },
  verifyBtnDone: { backgroundColor: Colors.success + "22" },
  verifyBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.textSecondary },
  substituteToggle: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.teal },
  substituteInput: { backgroundColor: Colors.cardElevated, borderRadius: 12, padding: 12, fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.text, borderWidth: 1, borderColor: Colors.border, textAlignVertical: "top", minHeight: 80 },
  actionRow: { flexDirection: "row", gap: 12 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.danger + "55", borderRadius: 14, paddingVertical: 14, backgroundColor: Colors.danger + "11" },
  rejectBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.danger },
  acceptBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#6BCB77", borderRadius: 14, paddingVertical: 14 },
  acceptBtnDisabled: { backgroundColor: Colors.textMuted },
  acceptBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
  prepareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4D96FF", borderRadius: 14, paddingVertical: 16 },
  prepareBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
});
