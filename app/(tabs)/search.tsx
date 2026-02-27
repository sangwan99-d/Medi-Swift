import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { MEDICINES, CATEGORIES } from "@/data/medicines";
import { useCart } from "@/context/CartContext";
import { Medicine } from "@/context/CartContext";

function MedicineListCard({ medicine }: { medicine: Medicine }) {
  const { addItem, updateQuantity, items } = useCart();
  const cartItem = items.find((i) => i.id === medicine.id);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem(medicine);
    scale.value = withSpring(0.95, {}, () => { scale.value = withSpring(1); });
  };

  const discount = medicine.originalPrice
    ? Math.round(((medicine.originalPrice - medicine.price) / medicine.originalPrice) * 100)
    : 0;

  return (
    <Animated.View style={[styles.medicineCard, animStyle]}>
      <View style={styles.medicineIconWrap}>
        <Text style={styles.medicineEmoji}>{medicine.imageEmoji}</Text>
        {medicine.requiresColdChain && (
          <View style={styles.coldChainDot}>
            <Ionicons name="snow" size={10} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.medicineInfo}>
        <View style={styles.medicineNameRow}>
          <Text style={styles.medicineName} numberOfLines={1}>{medicine.name}</Text>
          {medicine.isPrescriptionRequired && (
            <View style={styles.rxPill}>
              <Text style={styles.rxPillText}>Rx</Text>
            </View>
          )}
          {medicine.isScheduleX && (
            <View style={[styles.rxPill, styles.schedXPill]}>
              <Ionicons name="warning" size={9} color={Colors.rxRed} />
              <Text style={[styles.rxPillText, { color: Colors.rxRed }]}>Sched X</Text>
            </View>
          )}
        </View>
        <Text style={styles.medicineGeneric}>{medicine.genericName}</Text>
        <Text style={styles.medicineUnit}>{medicine.unit}</Text>
        <Text style={styles.pharmacyLabel}>{medicine.pharmacyName}</Text>
        <View style={styles.medicineBottom}>
          <View style={styles.priceRow}>
            <Text style={styles.medicinePrice}>₹{medicine.price}</Text>
            {medicine.originalPrice && (
              <Text style={styles.originalPrice}>₹{medicine.originalPrice}</Text>
            )}
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discount}% off</Text>
              </View>
            )}
          </View>
          {medicine.isScheduleX ? (
            <View style={styles.idVerifyBadge}>
              <Ionicons name="id-card-outline" size={12} color={Colors.rxRed} />
              <Text style={styles.idVerifyText}>ID at delivery</Text>
            </View>
          ) : cartItem ? (
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  updateQuantity(medicine.id, (cartItem?.quantity ?? 1) - 1);
                }}
              >
                <Ionicons name="remove" size={14} color={Colors.teal} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{cartItem.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={handleAdd}
              >
                <Ionicons name="add" size={14} color={Colors.teal} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addToCartBtn} onPress={handleAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={styles.addToCartText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string; pharmacyId?: string }>();
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState(params.category || "all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    let result = MEDICINES;
    if (activeCategory !== "all") {
      result = result.filter((m) => m.category === activeCategory);
    }
    if (params.pharmacyId) {
      result = result.filter((m) => m.pharmacyId === params.pharmacyId);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [searchText, activeCategory, params.pharmacyId]);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse Medicines</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines, generics..."
          placeholderTextColor={Colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              activeCategory === item.id && styles.categoryChipActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveCategory(item.id);
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.categoryChipText,
                activeCategory === item.id && styles.categoryChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Results Count */}
      <Text style={styles.resultsCount}>{filtered.length} medicines found</Text>

      {/* Medicine List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MedicineListCard medicine={item} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 84 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No medicines found</Text>
            <Text style={styles.emptyText}>Try a different name or category</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  searchContainer: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.text,
    height: "100%",
  },
  categoryList: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.teal + "22",
    borderColor: Colors.teal,
  },
  categoryChipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.teal,
  },
  resultsCount: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  medicineCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  medicineIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.cardElevated,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  medicineEmoji: {
    fontSize: 28,
  },
  coldChainDot: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#4D96FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.card,
  },
  medicineInfo: {
    flex: 1,
    gap: 4,
  },
  medicineNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  medicineName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  rxPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.warning + "22",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warning + "55",
  },
  rxPillText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
    color: Colors.warning,
  },
  schedXPill: {
    backgroundColor: Colors.rxRed + "22",
    borderColor: Colors.rxRed + "55",
  },
  medicineGeneric: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  medicineUnit: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  pharmacyLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: Colors.teal,
  },
  medicineBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  medicinePrice: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: Colors.teal,
  },
  originalPrice: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: Colors.success + "22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
    color: Colors.success,
  },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.teal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addToCartText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#fff",
  },
  idVerifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.rxRed + "22",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.rxRed + "55",
  },
  idVerifyText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: Colors.rxRed,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: Colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
});
