import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Colors } from "@/constants/colors";
import { PHARMACIES, MEDICINES } from "@/data/medicines";
import { useCart } from "@/context/CartContext";
import { Medicine } from "@/context/CartContext";

const QUICK_CATEGORIES = [
  { id: "fever", label: "Fever & Pain", icon: "thermometer-outline" as const, color: "#FF6B6B" },
  { id: "vitamins", label: "Vitamins", icon: "sunny-outline" as const, color: "#FFD93D" },
  { id: "antibiotics", label: "Antibiotics", icon: "shield-outline" as const, color: "#6BCB77" },
  { id: "diabetes", label: "Diabetes", icon: "water-outline" as const, color: "#4D96FF" },
  { id: "heart", label: "Cardiac", icon: "heart-outline" as const, color: "#FF4757" },
  { id: "cold", label: "Cold & Flu", icon: "cloud-outline" as const, color: "#00B4A0" },
];

function PharmacyCard({ pharmacy }: { pharmacy: typeof PHARMACIES[0] }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={styles.pharmacyCard}
        onPressIn={() => { scale.value = withSpring(0.96); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/(tabs)/search", params: { pharmacyId: pharmacy.id } });
        }}
        activeOpacity={1}
      >
        <LinearGradient
          colors={["#162844", "#1E3555"]}
          style={styles.pharmacyCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.pharmacyHeader}>
            <View style={styles.pharmacyIconWrap}>
              <Ionicons name="medical" size={22} color={Colors.teal} />
            </View>
            <View style={[styles.openBadge, { backgroundColor: pharmacy.isOpen ? "#00C86F22" : "#FF525222" }]}>
              <View style={[styles.openDot, { backgroundColor: pharmacy.isOpen ? Colors.success : Colors.danger }]} />
              <Text style={[styles.openText, { color: pharmacy.isOpen ? Colors.success : Colors.danger }]}>
                {pharmacy.isOpen ? "Open" : "Closed"}
              </Text>
            </View>
          </View>
          <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
          <View style={styles.pharmacyMeta}>
            <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.pharmacyMetaText}>{pharmacy.distance}</Text>
            <View style={styles.dot} />
            <Ionicons name="star" size={12} color="#FFB547" />
            <Text style={styles.pharmacyMetaText}>{pharmacy.rating}</Text>
            <View style={styles.dot} />
            <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.pharmacyMetaText}>{pharmacy.deliveryTime}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MiniMedicineCard({ medicine }: { medicine: Medicine }) {
  const { addItem } = useCart();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem(medicine);
    scale.value = withSpring(0.9, {}, () => { scale.value = withSpring(1); });
  };

  return (
    <Animated.View style={[styles.miniCard, animStyle]}>
      <View style={styles.miniCardIconWrap}>
        <Text style={styles.miniCardEmoji}>{medicine.imageEmoji}</Text>
      </View>
      {medicine.isPrescriptionRequired && (
        <View style={styles.rxBadge}>
          <Text style={styles.rxBadgeText}>Rx</Text>
        </View>
      )}
      {medicine.isScheduleX && (
        <View style={[styles.rxBadge, { backgroundColor: Colors.rxRed + "33", borderColor: Colors.rxRed }]}>
          <Ionicons name="warning" size={8} color={Colors.rxRed} />
          <Text style={[styles.rxBadgeText, { color: Colors.rxRed }]}>X</Text>
        </View>
      )}
      <Text style={styles.miniCardName} numberOfLines={2}>{medicine.name}</Text>
      <Text style={styles.miniCardUnit}>{medicine.unit}</Text>
      {medicine.requiresColdChain && (
        <View style={styles.coldChainBadge}>
          <Ionicons name="snow" size={10} color="#4D96FF" />
          <Text style={styles.coldChainText}>Cold Chain</Text>
        </View>
      )}
      <View style={styles.miniCardBottom}>
        <Text style={styles.miniCardPrice}>₹{medicine.price}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [locationText, setLocationText] = useState("Fetching location...");
  const [locationLoading, setLocationLoading] = useState(true);
  const featuredMedicines = MEDICINES.slice(0, 6);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationText("Location permission denied");
          setLocationLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode.length > 0) {
          const addr = geocode[0];
          const parts = [
            addr.subregion || addr.district,
            addr.city || addr.region,
          ].filter(Boolean);
          setLocationText(parts.join(", ") || "Location found");
        } else {
          setLocationText("Location found");
        }
      } catch {
        setLocationText("Sector 18, Noida");
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={Colors.teal} />
              {locationLoading ? (
                <ActivityIndicator size="small" color={Colors.teal} style={{ marginHorizontal: 4 }} />
              ) : null}
              <Text style={styles.locationText}>{locationText}</Text>
              <Ionicons name="chevron-down" size={14} color={Colors.teal} />
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/(tabs)/search")}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <Text style={styles.searchPlaceholder}>Search medicines, vitamins...</Text>
        </TouchableOpacity>

        {/* Hero Banner */}
        <LinearGradient
          colors={["#00B4A022", "#00B4A044"]}
          style={styles.heroBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.heroBannerContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="flash" size={12} color={Colors.teal} />
              <Text style={styles.heroBadgeText}>10-min delivery</Text>
            </View>
            <Text style={styles.heroTitle}>Medicines at{"\n"}your doorstep</Text>
            <Text style={styles.heroSub}>Upload prescription & order in seconds</Text>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => router.push("/(tabs)/search")}
            >
              <Text style={styles.heroBtnText}>Order Now</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.heroIllustration}>
            <Text style={{ fontSize: 64 }}>💊</Text>
          </View>
        </LinearGradient>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {QUICK_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryPill}
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/(tabs)/search", params: { category: cat.id } });
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.catIconWrap, { backgroundColor: cat.color + "22" }]}>
                <Ionicons name={cat.icon} size={20} color={cat.color} />
              </View>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Nearby Pharmacies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Pharmacies</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {PHARMACIES.map((ph) => (
            <PharmacyCard key={ph.id} pharmacy={ph} />
          ))}
        </ScrollView>

        {/* Featured Medicines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Medicines</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/search")}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {featuredMedicines.map((med) => (
            <MiniMedicineCard key={med.id} medicine={med} />
          ))}
        </ScrollView>

        {/* Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why MedSwift?</Text>
        </View>
        <View style={styles.infoCardsRow}>
          <View style={styles.infoCard}>
            <Ionicons name="flash" size={24} color={Colors.teal} />
            <Text style={styles.infoCardTitle}>10-min</Text>
            <Text style={styles.infoCardSub}>Lightning delivery</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.success} />
            <Text style={styles.infoCardTitle}>Verified</Text>
            <Text style={styles.infoCardSub}>Licensed pharmacies</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="snow" size={24} color="#4D96FF" />
            <Text style={styles.infoCardTitle}>Cold Chain</Text>
            <Text style={styles.infoCardSub}>For insulin & more</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.card,
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchPlaceholder: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  heroBanner: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.teal + "33",
    marginBottom: 24,
    overflow: "hidden",
  },
  heroBannerContent: {
    flex: 1,
    gap: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.teal + "22",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  heroBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: Colors.teal,
  },
  heroTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: Colors.text,
    lineHeight: 28,
  },
  heroSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.teal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  heroBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#fff",
  },
  heroIllustration: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  seeAll: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: Colors.teal,
  },
  categoriesRow: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 24,
  },
  categoryPill: {
    alignItems: "center",
    gap: 8,
    width: 72,
  },
  catIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  pharmacyCard: {
    width: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  pharmacyCardGradient: {
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
  },
  pharmacyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pharmacyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.teal + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  openDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  openText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
  },
  pharmacyName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: Colors.text,
  },
  pharmacyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  pharmacyMetaText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  miniCard: {
    width: 140,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  miniCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.cardElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  miniCardEmoji: {
    fontSize: 24,
  },
  rxBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.warning + "22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.warning + "55",
  },
  rxBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
    color: Colors.warning,
  },
  coldChainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#4D96FF22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  coldChainText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    color: "#4D96FF",
  },
  miniCardName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  miniCardUnit: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
  },
  miniCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  miniCardPrice: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: Colors.teal,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  infoCardSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
