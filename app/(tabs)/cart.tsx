import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useCart } from "@/context/CartContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, totalPrice, totalItems, requiresPrescription, hasColdChainItems, hasScheduleXItems, prescriptionUri, setPrescription, updateQuantity, removeItem, clearCart, customerId } = useCart();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const canPlaceOrder = !requiresPrescription || !!prescriptionUri;

  const pickPrescription = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPrescription(result.assets[0].uri);
  };

  const handlePlaceOrder = async () => {
    if (!canPlaceOrder) return;
    if (hasScheduleXItems) {
      Alert.alert(
        "ID Verification Required",
        "Your order contains Schedule X controlled substances. You must present a valid government-issued ID to the delivery person.",
        [{ text: "Cancel", style: "cancel" }, { text: "I Understand, Proceed", onPress: confirmOrder }]
      );
      return;
    }
    confirmOrder();
  };

  const confirmOrder = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsPlacingOrder(true);
    try {
      const pharmacyId = items[0]?.pharmacyId || "ph1";
      const pharmacyName = items[0]?.pharmacyName || "Pharmacy";
      const orderItems = items.map((i) => ({
        id: i.id, name: i.name, genericName: i.genericName, price: i.price, quantity: i.quantity,
        unit: i.unit, isPrescriptionRequired: i.isPrescriptionRequired, requiresColdChain: i.requiresColdChain,
        pharmacyId: i.pharmacyId, pharmacyName: i.pharmacyName, imageEmoji: i.imageEmoji,
      }));
      const res = await apiRequest("POST", "/api/orders", {
        customerId,
        pharmacyId,
        pharmacyName,
        items: orderItems,
        totalPrice,
        prescriptionUri: prescriptionUri || undefined,
        address: "42, MG Road, Sector 18, Noida",
        hasColdChain: hasColdChainItems,
      });
      const order = await res.json();
      clearCart();
      router.push({ pathname: "/(tabs)/orders", params: { newOrderId: order.id } });
    } catch (e) {
      Alert.alert("Error", "Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={72} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Cart is empty</Text>
          <Text style={styles.emptyText}>Add medicines from Browse to get started</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push("/(tabs)/search")}>
            <Text style={styles.browseBtnText}>Browse Medicines</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); clearCart(); }}>
          <Text style={styles.clearBtn}>Clear all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 200 + bottomPad }}>
        {hasColdChainItems && (
          <Animated.View entering={FadeIn} style={styles.alertBanner}>
            <Ionicons name="snow" size={18} color="#4D96FF" />
            <Text style={styles.alertText}>Cold chain items will be delivered in temperature-controlled packaging.</Text>
          </Animated.View>
        )}
        {hasScheduleXItems && (
          <Animated.View entering={FadeIn} style={[styles.alertBanner, styles.alertDanger]}>
            <Ionicons name="warning" size={18} color={Colors.rxRed} />
            <Text style={[styles.alertText, { color: Colors.rxRed }]}>Contains Schedule X substances. Valid ID required at delivery.</Text>
          </Animated.View>
        )}

        {items.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <View style={styles.cartItemIcon}>
              <Text style={styles.cartItemEmoji}>{item.imageEmoji}</Text>
            </View>
            <View style={styles.cartItemInfo}>
              <Text style={styles.cartItemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.cartItemUnit}>{item.unit}</Text>
              {item.isPrescriptionRequired && (
                <View style={styles.rxSmall}><Text style={styles.rxSmallText}>Prescription required</Text></View>
              )}
              {item.requiresColdChain && (
                <View style={[styles.rxSmall, { backgroundColor: "#4D96FF22", borderColor: "#4D96FF55" }]}>
                  <Ionicons name="snow" size={9} color="#4D96FF" />
                  <Text style={[styles.rxSmallText, { color: "#4D96FF" }]}>Cold Chain</Text>
                </View>
              )}
              <View style={styles.cartItemBottom}>
                <Text style={styles.cartItemPrice}>₹{item.price * item.quantity}</Text>
                <View style={styles.qtyControls}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => { Haptics.selectionAsync(); updateQuantity(item.id, item.quantity - 1); }}>
                    <Ionicons name="remove" size={16} color={Colors.teal} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => { Haptics.selectionAsync(); updateQuantity(item.id, item.quantity + 1); }}>
                    <Ionicons name="add" size={16} color={Colors.teal} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); removeItem(item.id); }}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {requiresPrescription && (
          <View style={styles.prescriptionSection}>
            <View style={styles.prescriptionHeader}>
              <Ionicons name="document-text" size={20} color={Colors.warning} />
              <Text style={styles.prescriptionTitle}>Prescription Required</Text>
            </View>
            <Text style={styles.prescriptionSub}>One or more items require a valid doctor's prescription.</Text>
            {prescriptionUri ? (
              <View style={styles.prescriptionUploaded}>
                <Image source={{ uri: prescriptionUri }} style={styles.prescriptionThumb} />
                <View style={{ flex: 1 }}>
                  <View style={styles.uploadedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.uploadedText}>Prescription uploaded</Text>
                  </View>
                  <TouchableOpacity onPress={pickPrescription}>
                    <Text style={styles.changeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBtn} onPress={pickPrescription} activeOpacity={0.85}>
                <Ionicons name="camera-outline" size={20} color={Colors.warning} />
                <Text style={styles.uploadBtnText}>Upload Prescription</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
            <Text style={styles.summaryValue}>₹{totalPrice}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery fee</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>FREE</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform fee (10%)</Text>
            <Text style={styles.summaryValue}>₹{Math.round(totalPrice * 0.1)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{totalPrice}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomPad + 16 }]}>
        <View style={styles.deliveryInfo}>
          <Ionicons name="flash" size={16} color={Colors.teal} />
          <Text style={styles.deliveryText}>Estimated delivery in ~10 minutes</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderBtn, !canPlaceOrder && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={!canPlaceOrder || isPlacingOrder}
          activeOpacity={0.85}
        >
          <Text style={styles.placeOrderText}>
            {isPlacingOrder ? "Placing Order..." : !canPlaceOrder ? "Upload Prescription to Continue" : `Place Order · ₹${totalPrice}`}
          </Text>
          {canPlaceOrder && !isPlacingOrder && <Ionicons name="arrow-forward" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  clearBtn: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.danger },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 22, color: Colors.textSecondary },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  browseBtn: { backgroundColor: Colors.teal, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  browseBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
  alertBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#4D96FF22", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#4D96FF44" },
  alertDanger: { backgroundColor: Colors.rxRed + "22", borderColor: Colors.rxRed + "44" },
  alertText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: "#4D96FF", flex: 1, lineHeight: 19 },
  cartItem: { backgroundColor: Colors.card, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, borderWidth: 1, borderColor: Colors.border },
  cartItemIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.cardElevated, alignItems: "center", justifyContent: "center" },
  cartItemEmoji: { fontSize: 26 },
  cartItemInfo: { flex: 1, gap: 3 },
  cartItemName: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.text, lineHeight: 20 },
  cartItemUnit: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.textMuted },
  rxSmall: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.warning + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", borderWidth: 1, borderColor: Colors.warning + "55" },
  rxSmallText: { fontFamily: "DMSans_500Medium", fontSize: 9, color: Colors.warning },
  cartItemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  cartItemPrice: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.teal },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.cardElevated, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  qtyBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  qtyText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.text, minWidth: 22, textAlign: "center" },
  deleteBtn: { padding: 6, alignSelf: "flex-start" },
  prescriptionSection: { backgroundColor: Colors.warning + "11", borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.warning + "44" },
  prescriptionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  prescriptionTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.warning },
  prescriptionSub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  uploadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: Colors.warning + "22", borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: Colors.warning + "66", borderStyle: "dashed" },
  uploadBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.warning },
  prescriptionUploaded: { flexDirection: "row", gap: 12, alignItems: "center" },
  prescriptionThumb: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  uploadedBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  uploadedText: { fontFamily: "DMSans_700Bold", fontSize: 13, color: Colors.success },
  changeText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.teal },
  summaryCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  summaryTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.text, marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.text },
  summaryTotal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.text },
  totalValue: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.teal },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: Colors.navy, borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  deliveryInfo: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  deliveryText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.textSecondary },
  placeOrderBtn: { backgroundColor: Colors.teal, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  placeOrderBtnDisabled: { backgroundColor: Colors.cardElevated },
  placeOrderText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#fff" },
});
