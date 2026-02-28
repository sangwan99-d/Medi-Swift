import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, TextInput, Alert, Modal, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { router } from "expo-router";

const STATUS_LABELS: Record<string, string> = {
  RIDER_ASSIGNED: "Head to pharmacy for pickup",
  IN_TRANSIT: "Delivering to customer",
  DELIVERED: "Delivered successfully",
};

function OTPModal({ visible, onClose, onSubmit, loading }: { visible: boolean; onClose: () => void; onSubmit: (otp: string) => void; loading: boolean }) {
  const [otp, setOtp] = useState("");
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Delivery OTP</Text>
          <Text style={styles.modalSub}>Ask the customer for their 4-digit OTP to complete delivery</Text>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            placeholder="0000"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            textAlign="center"
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirm, (!otp || otp.length < 4 || loading) && { opacity: 0.5 }]}
              onPress={() => otp.length === 4 && onSubmit(otp)}
              disabled={otp.length < 4 || loading}
            >
              <Text style={styles.modalConfirmTxt}>{loading ? "Verifying..." : "Confirm"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function RiderDeliveriesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [riderId, setRiderId] = useState<string | null>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
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
    refetchInterval: 5000,
  });

  const { data: currentOrder, refetch: refetchOrder } = useQuery({
    queryKey: ["/api/rider", riderId, "current-order"],
    enabled: !!riderId,
    refetchInterval: 5000,
  });

  const pickupMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest("POST", `/api/rider/${riderId}/pickup/${orderId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/rider", riderId, "current-order"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deliverMutation = useMutation({
    mutationFn: ({ otp, photoUri }: { otp: string; photoUri?: string }) =>
      apiRequest("POST", `/api/rider/${riderId}/deliver/${(currentOrder as any)?.id}`, {
        otp,
        deliveryPhotoUri: photoUri,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/rider", riderId] });
      qc.invalidateQueries({ queryKey: ["/api/rider", riderId, "current-order"] });
      setShowOTPModal(false);
      setDeliveryPhoto(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Delivered!", "Order delivered successfully. Your earnings have been credited.", [{ text: "Great!" }]);
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const pickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets[0]) setDeliveryPhoto(result.assets[0].uri);
  };

  const order = currentOrder as any;
  const r = rider as any;

  if (!riderId) {
    return <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}><Text style={{ color: Colors.text }}>Loading...</Text></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Delivery</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 84 : 100 }]}>
        {!order ? (
          <View style={styles.emptyState}>
            <Ionicons name="navigate-circle-outline" size={80} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Active Delivery</Text>
            <Text style={styles.emptyText}>Accept an order from the Dashboard to start delivering</Text>
            <TouchableOpacity style={styles.goDashBtn} onPress={() => router.push("/rider/(tabs)/dashboard" as any)}>
              <Ionicons name="compass-outline" size={18} color="#4D96FF" />
              <Text style={styles.goDashBtnText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Status */}
            <Animated.View entering={FadeInDown.springify()} style={styles.statusCard}>
              <View style={styles.statusTop}>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusLabel}>{order.status?.replace(/_/g, " ")}</Text>
                </View>
                <Text style={styles.statusEarning}>₹{Math.round(order.totalPrice * 0.1)} earning</Text>
              </View>
              <Text style={styles.statusInstruction}>{STATUS_LABELS[order.status] || order.status}</Text>
            </Animated.View>

            {/* Map placeholder */}
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.mapPlaceholderText}>Live navigation</Text>
              <Text style={styles.mapPlaceholderSub}>Open in Maps for turn-by-turn directions</Text>
              <TouchableOpacity style={styles.openMapsBtn}>
                <Ionicons name="navigate-outline" size={16} color="#fff" />
                <Text style={styles.openMapsBtnText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>

            {/* Order Info */}
            <View style={styles.orderInfoCard}>
              <Text style={styles.orderInfoTitle}>Order #{(order.id as string).slice(-6).toUpperCase()}</Text>
              <View style={styles.orderInfoRow}>
                <Ionicons name="location" size={16} color="#4D96FF" />
                <Text style={styles.orderInfoAddr}>{order.address}</Text>
              </View>
              <View style={styles.orderInfoRow}>
                <Ionicons name="bag-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.orderInfoItems}>{order.items?.length} items · ₹{order.totalPrice}</Text>
              </View>
              {order.hasColdChain && (
                <View style={styles.coldAlert}>
                  <Ionicons name="snow" size={14} color="#4D96FF" />
                  <Text style={styles.coldAlertText}>Cold chain — keep temp-controlled</Text>
                </View>
              )}
            </View>

            {/* Items list */}
            <View style={styles.itemsCard}>
              <Text style={styles.itemsTitle}>Items to Deliver</Text>
              {order.items?.map((item: any) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemEmoji}>{item.imageEmoji || "💊"}</Text>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemQty}>×{item.quantity}</Text>
                </View>
              ))}
            </View>

            {/* Delivery photo (required for high-value) */}
            {order.deliveryPhotoRequired && (
              <View style={styles.photoCard}>
                <View style={styles.photoHeader}>
                  <Ionicons name="camera" size={18} color={Colors.warning} />
                  <Text style={styles.photoTitle}>Doorstep Photo Required</Text>
                </View>
                <Text style={styles.photoSub}>Orders above ₹500 require a photo at delivery</Text>
                {deliveryPhoto ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: deliveryPhoto }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.retakeBtn} onPress={pickPhoto}>
                      <Text style={styles.retakeBtnText}>Retake</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.takePhotoBtn} onPress={pickPhoto} activeOpacity={0.85}>
                    <Ionicons name="camera-outline" size={20} color={Colors.warning} />
                    <Text style={styles.takePhotoBtnText}>Take Doorstep Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Action buttons */}
            {order.status === "RIDER_ASSIGNED" && (
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); pickupMutation.mutate(order.id); }}
                disabled={pickupMutation.isPending}
                activeOpacity={0.85}
              >
                <Ionicons name="bag-check-outline" size={20} color="#fff" />
                <Text style={styles.primaryActionText}>{pickupMutation.isPending ? "Confirming..." : "Confirm Pickup from Pharmacy"}</Text>
              </TouchableOpacity>
            )}

            {order.status === "IN_TRANSIT" && (
              <TouchableOpacity
                style={[styles.primaryAction, styles.deliverAction, (order.deliveryPhotoRequired && !deliveryPhoto) && styles.primaryActionDisabled]}
                onPress={() => {
                  if (order.deliveryPhotoRequired && !deliveryPhoto) {
                    Alert.alert("Photo Required", "Please take a doorstep photo before delivering.");
                    return;
                  }
                  setShowOTPModal(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="key-outline" size={20} color="#fff" />
                <Text style={styles.primaryActionText}>Enter Customer OTP</Text>
              </TouchableOpacity>
            )}

            {order.status === "DELIVERED" && (
              <View style={styles.deliveredBanner}>
                <Ionicons name="checkmark-done-circle" size={32} color={Colors.success} />
                <Text style={styles.deliveredText}>Delivered! ₹{Math.round(order.totalPrice * 0.1)} credited to your wallet.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <OTPModal
        visible={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        loading={deliverMutation.isPending}
        onSubmit={(otp) => deliverMutation.mutate({ otp, photoUri: deliveryPhoto || undefined })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  scroll: { paddingHorizontal: 20, gap: 16 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 14, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 22, color: Colors.textSecondary },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  goDashBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#4D96FF22", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "#4D96FF44", marginTop: 8 },
  goDashBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#4D96FF" },
  statusCard: { backgroundColor: "#4D96FF11", borderRadius: 20, padding: 18, gap: 8, borderWidth: 1, borderColor: "#4D96FF33" },
  statusTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4D96FF" },
  statusLabel: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#4D96FF" },
  statusEarning: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.teal },
  statusInstruction: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.text, lineHeight: 26 },
  mapPlaceholder: { backgroundColor: Colors.card, borderRadius: 20, height: 180, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.border },
  mapPlaceholderText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.textSecondary },
  mapPlaceholderSub: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted },
  openMapsBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#4D96FF", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  openMapsBtnText: { fontFamily: "DMSans_700Bold", fontSize: 13, color: "#fff" },
  orderInfoCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  orderInfoTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.text },
  orderInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  orderInfoAddr: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.text, flex: 1 },
  orderInfoItems: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textSecondary },
  coldAlert: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#4D96FF11", padding: 8, borderRadius: 8 },
  coldAlertText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "#4D96FF" },
  itemsCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  itemsTitle: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.text, marginBottom: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemEmoji: { fontSize: 20 },
  itemName: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  itemQty: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.textMuted },
  photoCard: { backgroundColor: Colors.warning + "11", borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.warning + "44" },
  photoHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  photoTitle: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.warning },
  photoSub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.warning, lineHeight: 19 },
  takePhotoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.warning + "22", borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: Colors.warning + "55", borderStyle: "dashed" },
  takePhotoBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.warning },
  photoPreviewWrap: { borderRadius: 12, overflow: "hidden" },
  photoPreview: { width: "100%", height: 160, borderRadius: 12 },
  retakeBtn: { position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  retakeBtnText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: "#fff" },
  primaryAction: { backgroundColor: "#4D96FF", borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deliverAction: { backgroundColor: Colors.teal },
  primaryActionDisabled: { opacity: 0.5 },
  primaryActionText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#fff" },
  deliveredBanner: { backgroundColor: Colors.success + "22", borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: Colors.success + "44" },
  deliveredText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.success, flex: 1, lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 16 },
  modalTitle: { fontFamily: "DMSans_700Bold", fontSize: 22, color: Colors.text, textAlign: "center" },
  modalSub: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  otpInput: { backgroundColor: Colors.cardElevated, borderRadius: 16, height: 72, fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.text, borderWidth: 2, borderColor: Colors.teal, letterSpacing: 12 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  modalCancelTxt: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.textSecondary },
  modalConfirm: { flex: 2, backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  modalConfirmTxt: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
});
