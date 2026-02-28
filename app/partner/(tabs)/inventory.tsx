import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform,
  TextInput, Switch, Modal, Alert, RefreshControl, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { router } from "expo-router";

const UNITS = ["Strip of 10", "Strip of 5", "Strip of 4", "Strip of 15", "1 Vial", "1 Bottle", "1 Tube", "Per Tablet", "Per Capsule", "100ml", "200ml"];

function AddMedicineModal({ visible, onClose, partnerId }: { visible: boolean; onClose: () => void; partnerId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", genericName: "", price: "", unit: "Strip of 10", suggestedSubstitute: "" });
  const [unitDropdown, setUnitDropdown] = useState(false);

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/partner/${partnerId}/inventory`, {
      name: form.name,
      genericName: form.genericName,
      price: Number(form.price),
      unit: form.unit,
      suggestedSubstitute: form.suggestedSubstitute || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/partner", partnerId, "inventory"] });
      setForm({ name: "", genericName: "", price: "", unit: "Strip of 10", suggestedSubstitute: "" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: any) => Alert.alert("Error", e.message || "Failed to add medicine"),
  });

  const canSubmit = form.name.trim() && form.genericName.trim() && form.price && Number(form.price) > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Medicine</Text>
                <Text style={styles.modalSub}>Add a new item to your inventory</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Medicine Name */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Medicine Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  placeholder="e.g. Paracetamol 500mg"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
              </View>

              {/* Generic Name */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Generic / Active Ingredient</Text>
                <TextInput
                  style={styles.input}
                  value={form.genericName}
                  onChangeText={(v) => setForm((p) => ({ ...p, genericName: v }))}
                  placeholder="e.g. Acetaminophen"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
              </View>

              {/* Price */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>MRP Price (₹)</Text>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={form.price}
                    onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Unit selector */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Unit / Pack Size</Text>
                <TouchableOpacity
                  style={styles.unitSelector}
                  onPress={() => { setUnitDropdown(!unitDropdown); Haptics.selectionAsync(); }}
                >
                  <Text style={styles.unitSelectorText}>{form.unit}</Text>
                  <Ionicons name={unitDropdown ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
                </TouchableOpacity>
                {unitDropdown && (
                  <Animated.View entering={FadeIn.duration(150)} style={styles.unitDropdown}>
                    {UNITS.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unitOption, form.unit === u && styles.unitOptionActive]}
                        onPress={() => { setForm((p) => ({ ...p, unit: u })); setUnitDropdown(false); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.unitOptionText, form.unit === u && styles.unitOptionTextActive]}>{u}</Text>
                        {form.unit === u && <Ionicons name="checkmark" size={16} color="#6BCB77" />}
                      </TouchableOpacity>
                    ))}
                  </Animated.View>
                )}
              </View>

              {/* Optional substitute */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>
                  Generic Substitute <Text style={styles.optionalTag}>(optional)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={form.suggestedSubstitute}
                  onChangeText={(v) => setForm((p) => ({ ...p, suggestedSubstitute: v }))}
                  placeholder="e.g. Generic Paracetamol 500mg"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
              </View>

              {/* Preview */}
              {form.name && form.price ? (
                <Animated.View entering={FadeIn.duration(200)} style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Preview</Text>
                  <View style={styles.previewContent}>
                    <View style={styles.previewIcon}>
                      <Ionicons name="medical" size={24} color="#6BCB77" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewName}>{form.name || "Medicine Name"}</Text>
                      <Text style={styles.previewGeneric}>{form.genericName}</Text>
                      <Text style={styles.previewUnit}>{form.unit}</Text>
                    </View>
                    <Text style={styles.previewPrice}>₹{form.price}</Text>
                  </View>
                </Animated.View>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addBtn, !canSubmit && styles.addBtnDisabled]}
                  onPress={() => canSubmit && addMutation.mutate()}
                  disabled={!canSubmit || addMutation.isPending}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addBtnText}>{addMutation.isPending ? "Adding..." : "Add to Inventory"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SubstituteModal({ item, visible, onClose, partnerId }: { item: any; visible: boolean; onClose: () => void; partnerId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState(item?.suggestedSubstitute || "");

  useEffect(() => { setText(item?.suggestedSubstitute || ""); }, [item]);

  const mutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/inventory/${item.id}`, { suggestedSubstitute: text }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/partner", partnerId, "inventory"] }); onClose(); },
  });

  if (!item) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.subModalOverlay}>
        <View style={styles.subModalContainer}>
          <Text style={styles.subModalTitle}>Suggest Generic Substitute</Text>
          <Text style={styles.subModalItem}>{item.name}</Text>
          <Text style={styles.subModalLabel}>Generic equivalent or alternative:</Text>
          <TextInput style={styles.subModalInput} value={text} onChangeText={setText} placeholder="e.g. Generic Azithromycin 500mg" placeholderTextColor={Colors.textMuted} autoFocus />
          <View style={styles.subModalActions}>
            <TouchableOpacity style={styles.subModalCancel} onPress={onClose}>
              <Text style={styles.subModalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.subModalSave} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
              <Text style={styles.subModalSaveTxt}>{mutation.isPending ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PartnerInventoryScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [substituteModal, setSubstituteModal] = useState<any>(null);
  const qc = useQueryClient();

  useEffect(() => {
    AsyncStorage.getItem("partner_session").then((s) => {
      if (s) setPartnerId(JSON.parse(s).id);
      else router.replace("/partner" as any);
    });
  }, []);

  const { data: inventory = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/partner", partnerId, "inventory"],
    enabled: !!partnerId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isInStock }: { id: string; isInStock: boolean }) =>
      apiRequest("PATCH", `/api/inventory/${id}`, { isInStock }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/partner", partnerId, "inventory"] }),
  });

  const filtered = (inventory as any[]).filter((i) =>
    search.trim() === "" ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.genericName.toLowerCase().includes(search.toLowerCase())
  );

  const inStockCount = filtered.filter((i) => i.isInStock).length;
  const outOfStockCount = filtered.filter((i) => !i.isInStock).length;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inventory</Text>
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.statTxt}>{inStockCount} In Stock</Text>
            </View>
            <View style={styles.statPill}>
              <View style={[styles.statDot, { backgroundColor: Colors.danger }]} />
              <Text style={styles.statTxt}>{outOfStockCount} Out</Text>
            </View>
          </View>
        </View>
        {/* ADD MEDICINE BUTTON */}
        <TouchableOpacity
          style={styles.addMedBtn}
          onPress={() => { setShowAddModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addMedBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search medicines..."
          placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6BCB77" />}
        contentContainerStyle={[styles.list, { paddingBottom: (Platform.OS === "web" ? 84 : 100) + bottomPad }]}
        renderItem={({ item, index }: { item: any; index: number }) => (
          <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
            <View style={[styles.itemCard, !item.isInStock && styles.itemCardOOS]}>
              <View style={styles.itemIconWrap}>
                <Ionicons name="medical" size={20} color={item.isInStock ? "#6BCB77" : Colors.danger} />
              </View>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemGeneric}>{item.genericName}</Text>
                <Text style={styles.itemUnit}>{item.unit} · ₹{item.price}</Text>
                {!item.isInStock && item.suggestedSubstitute && (
                  <View style={styles.substituteBadge}>
                    <Ionicons name="swap-horizontal" size={10} color={Colors.teal} />
                    <Text style={styles.substituteTxt} numberOfLines={1}>Sub: {item.suggestedSubstitute}</Text>
                  </View>
                )}
              </View>
              <View style={styles.itemRight}>
                <Switch
                  value={item.isInStock}
                  onValueChange={(v) => { Haptics.selectionAsync(); toggleMutation.mutate({ id: item.id, isInStock: v }); }}
                  trackColor={{ false: Colors.danger + "44", true: Colors.success + "77" }}
                  thumbColor={item.isInStock ? Colors.success : Colors.danger}
                />
                {!item.isInStock && (
                  <TouchableOpacity
                    style={styles.subBtn}
                    onPress={() => { setSubstituteModal(item); Haptics.selectionAsync(); }}
                  >
                    <Ionicons name="swap-horizontal" size={13} color={Colors.teal} />
                    <Text style={styles.subBtnTxt}>Sub</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="medical-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No medicines found</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#6BCB77" />
              <Text style={styles.emptyAddBtnText}>Add your first medicine</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB for Add Medicine */}
      <TouchableOpacity
        style={[styles.fab, { bottom: (Platform.OS === "web" ? 84 : 100) + bottomPad + 16 }]}
        onPress={() => { setShowAddModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {partnerId && (
        <AddMedicineModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          partnerId={partnerId}
        />
      )}

      <SubstituteModal
        item={substituteModal}
        visible={!!substituteModal}
        onClose={() => setSubstituteModal(null)}
        partnerId={partnerId || ""}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.card, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statTxt: { fontFamily: "DMSans_500Medium", fontSize: 11, color: Colors.text },
  addMedBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#6BCB77", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  addMedBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#fff" },
  searchBar: { marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.card, borderRadius: 14, height: 46, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.text, height: "100%" },
  list: { paddingHorizontal: 20, gap: 10 },
  itemCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.border },
  itemCardOOS: { borderColor: Colors.danger + "44", backgroundColor: Colors.danger + "06" },
  itemIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.cardElevated, alignItems: "center", justifyContent: "center" },
  itemLeft: { flex: 1, gap: 2 },
  itemName: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.text },
  itemGeneric: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary, fontStyle: "italic" },
  itemUnit: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.textMuted },
  substituteBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.teal + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start", marginTop: 4 },
  substituteTxt: { fontFamily: "DMSans_500Medium", fontSize: 10, color: Colors.teal, maxWidth: 140 },
  itemRight: { alignItems: "center", gap: 8 },
  subBtn: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.teal + "22", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  subBtnTxt: { fontFamily: "DMSans_500Medium", fontSize: 11, color: Colors.teal },
  empty: { alignItems: "center", paddingTop: 80, gap: 16 },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.textSecondary },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#6BCB7722", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "#6BCB7744" },
  emptyAddBtnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#6BCB77" },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: "#6BCB77", alignItems: "center", justifyContent: "center", shadowColor: "#6BCB77", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  // Add Medicine Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontFamily: "DMSans_700Bold", fontSize: 22, color: Colors.text },
  modalSub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  modalClose: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.cardElevated, alignItems: "center", justifyContent: "center" },
  modalScroll: { paddingHorizontal: 24, paddingTop: 16, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: "DMSans_700Bold", fontSize: 13, color: Colors.textSecondary },
  optionalTag: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted, fontStyle: "italic" },
  input: { backgroundColor: Colors.cardElevated, borderRadius: 14, height: 52, paddingHorizontal: 16, fontFamily: "DMSans_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  priceInputWrap: { flexDirection: "row", alignItems: "center", gap: 0 },
  currencySymbol: { position: "absolute", left: 16, zIndex: 1, fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.teal },
  priceInput: { flex: 1, paddingLeft: 36 },
  unitSelector: { backgroundColor: Colors.cardElevated, borderRadius: 14, height: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: Colors.border },
  unitSelectorText: { fontFamily: "DMSans_400Regular", fontSize: 15, color: Colors.text },
  unitDropdown: { backgroundColor: Colors.cardElevated, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  unitOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  unitOptionActive: { backgroundColor: "#6BCB7711" },
  unitOptionText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textSecondary },
  unitOptionTextActive: { fontFamily: "DMSans_700Bold", color: "#6BCB77" },
  previewCard: { backgroundColor: Colors.navy, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#6BCB7744" },
  previewLabel: { fontFamily: "DMSans_700Bold", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  previewContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#6BCB7722", alignItems: "center", justifyContent: "center" },
  previewName: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.text },
  previewGeneric: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary, fontStyle: "italic" },
  previewUnit: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.textMuted },
  previewPrice: { fontFamily: "DMSans_700Bold", fontSize: 20, color: "#6BCB77" },
  modalActions: { flexDirection: "row", gap: 12, paddingTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.textSecondary },
  addBtn: { flex: 2, backgroundColor: "#6BCB77", borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addBtnDisabled: { backgroundColor: Colors.textMuted },
  addBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
  // Substitute modal
  subModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  subModalContainer: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14, paddingBottom: 40 },
  subModalTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.text },
  subModalItem: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.textSecondary },
  subModalLabel: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textMuted },
  subModalInput: { backgroundColor: Colors.cardElevated, borderRadius: 12, height: 52, paddingHorizontal: 16, fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  subModalActions: { flexDirection: "row", gap: 12 },
  subModalCancel: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  subModalCancelTxt: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.textSecondary },
  subModalSave: { flex: 2, backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  subModalSaveTxt: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
});
