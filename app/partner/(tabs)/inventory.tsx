import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, TextInput, Switch, Modal, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { router } from "expo-router";

export default function PartnerInventoryScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [substituteModal, setSubstituteModal] = useState<any>(null);
  const [substituteText, setSubstituteText] = useState("");
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

  const substituteMutation = useMutation({
    mutationFn: ({ id, sub }: { id: string; sub: string }) =>
      apiRequest("PATCH", `/api/inventory/${id}`, { suggestedSubstitute: sub }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/partner", partnerId, "inventory"] });
      setSubstituteModal(null);
    },
  });

  const filtered = (inventory as any[]).filter((i) =>
    search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.genericName.toLowerCase().includes(search.toLowerCase())
  );

  const inStock = filtered.filter((i) => i.isInStock).length;
  const outOfStock = filtered.filter((i) => !i.isInStock).length;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}><View style={[styles.statDot, { backgroundColor: Colors.success }]} /><Text style={styles.statTxt}>{inStock} In Stock</Text></View>
          <View style={styles.statPill}><View style={[styles.statDot, { backgroundColor: Colors.danger }]} /><Text style={styles.statTxt}>{outOfStock} Out</Text></View>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search medicines..." placeholderTextColor={Colors.textMuted} autoCorrect={false} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity>}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6BCB77" />}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 84 : 100 }]}
        renderItem={({ item }: { item: any }) => (
          <View style={[styles.itemCard, !item.isInStock && styles.itemCardOOS]}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemGeneric}>{item.genericName}</Text>
              <Text style={styles.itemUnit}>{item.unit} · ₹{item.price}</Text>
              {!item.isInStock && item.suggestedSubstitute && (
                <View style={styles.substituteBadge}>
                  <Ionicons name="swap-horizontal" size={10} color={Colors.teal} />
                  <Text style={styles.substituteTxt}>Sub: {item.suggestedSubstitute}</Text>
                </View>
              )}
            </View>
            <View style={styles.itemRight}>
              <Switch
                value={item.isInStock}
                onValueChange={(v) => {
                  Haptics.selectionAsync();
                  toggleMutation.mutate({ id: item.id, isInStock: v });
                }}
                trackColor={{ false: Colors.danger + "55", true: Colors.success + "88" }}
                thumbColor={item.isInStock ? Colors.success : Colors.danger}
              />
              {!item.isInStock && (
                <TouchableOpacity style={styles.subBtn} onPress={() => { setSubstituteModal(item); setSubstituteText(item.suggestedSubstitute || ""); }}>
                  <Ionicons name="swap-horizontal" size={14} color={Colors.teal} />
                  <Text style={styles.subBtnTxt}>Substitute</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="medical-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No medicines</Text>
          </View>
        }
      />

      <Modal visible={!!substituteModal} animationType="slide" transparent onRequestClose={() => setSubstituteModal(null)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalContainer}>
            <Text style={styles.subModalTitle}>Suggest Generic Substitute</Text>
            <Text style={styles.subModalItem}>{substituteModal?.name}</Text>
            <Text style={styles.subModalLabel}>Generic equivalent / alternative:</Text>
            <TextInput style={styles.subModalInput} value={substituteText} onChangeText={setSubstituteText} placeholder="e.g. Generic Azithromycin 500mg" placeholderTextColor={Colors.textMuted} autoFocus />
            <View style={styles.subModalActions}>
              <TouchableOpacity style={styles.subModalCancel} onPress={() => setSubstituteModal(null)}>
                <Text style={styles.subModalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.subModalSave} onPress={() => substituteMutation.mutate({ id: substituteModal.id, sub: substituteText })} disabled={substituteMutation.isPending}>
                <Text style={styles.subModalSaveTxt}>{substituteMutation.isPending ? "Saving..." : "Save Substitute"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  statsRow: { flexDirection: "row", gap: 12 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statTxt: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.text },
  searchBar: { marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.card, borderRadius: 14, height: 46, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.text, height: "100%" },
  list: { paddingHorizontal: 20, gap: 10 },
  itemCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.border },
  itemCardOOS: { borderColor: Colors.danger + "44", backgroundColor: Colors.danger + "08" },
  itemLeft: { flex: 1, gap: 2 },
  itemName: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.text },
  itemGeneric: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary, fontStyle: "italic" },
  itemUnit: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.textMuted },
  substituteBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.teal + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start", marginTop: 4 },
  substituteTxt: { fontFamily: "DMSans_500Medium", fontSize: 10, color: Colors.teal },
  itemRight: { alignItems: "center", gap: 8 },
  subBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.teal + "22", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  subBtnTxt: { fontFamily: "DMSans_500Medium", fontSize: 11, color: Colors.teal },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.textSecondary },
  subModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  subModalContainer: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  subModalTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.text },
  subModalItem: { fontFamily: "DMSans_500Medium", fontSize: 15, color: Colors.textSecondary },
  subModalLabel: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textMuted },
  subModalInput: { backgroundColor: Colors.cardElevated, borderRadius: 12, height: 52, paddingHorizontal: 16, fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  subModalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  subModalCancel: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  subModalCancelTxt: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.textSecondary },
  subModalSave: { flex: 2, backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  subModalSaveTxt: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
});
