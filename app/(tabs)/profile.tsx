import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { router } from "expo-router";
import { useCart } from "@/context/CartContext";

const APP_SWITCHER = [
  { id: "partner", label: "Partner App", sub: "Pharmacy / Store", icon: "medical", color: "#6BCB77" },
  { id: "rider", label: "Rider App", sub: "Delivery Partner", icon: "bicycle", color: "#4D96FF" },
  { id: "admin", label: "Admin Dashboard", sub: "Platform Control", icon: "settings", color: "#FFB547" },
];

const DEFAULT_ADDRESSES = [
  { id: "1", label: "Home", address: "42, MG Road, Sector 18, Noida, UP 201301", icon: "home-outline" },
  { id: "2", label: "Office", address: "Tower B, Cyber City, Gurugram, HR 122002", icon: "business-outline" },
];

const SAVED_PRESCRIPTIONS = [
  { id: "1", date: "15 Feb 2026", doctor: "Dr. Sharma", condition: "Fever & Cold" },
  { id: "2", date: "28 Jan 2026", doctor: "Dr. Gupta", condition: "Vitamin Deficiency" },
];

const ICON_OPTIONS: string[] = ["home-outline", "business-outline", "location-outline", "heart-outline", "star-outline"];

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  icon: string;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { clearCart } = useCart();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Profile state - persisted in AsyncStorage
  const [userName, setUserName] = useState("Rahul Sharma");
  const [userEmail, setUserEmail] = useState("rahul.sharma@email.com");
  const [userPhone, setUserPhone] = useState("+91 98765 43210");

  // Addresses state - persisted in AsyncStorage
  const [addresses, setAddresses] = useState<SavedAddress[]>(DEFAULT_ADDRESSES);

  // Modal states
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [addressesVisible, setAddressesVisible] = useState(false);
  const [prescriptionsVisible, setPrescriptionsVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [signOutVisible, setSignOutVisible] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [editPhone, setEditPhone] = useState(userPhone);

  // Address form state
  const [addressFormVisible, setAddressFormVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState("");
  const [addressText, setAddressText] = useState("");
  const [addressIcon, setAddressIcon] = useState("home-outline");

  // Load saved profile & addresses from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem("profile").then((val) => {
      if (val) {
        const profile = JSON.parse(val);
        setUserName(profile.name || "Rahul Sharma");
        setUserEmail(profile.email || "rahul.sharma@email.com");
        setUserPhone(profile.phone || "+91 98765 43210");
      }
    });
    AsyncStorage.getItem("addresses").then((val) => {
      if (val) {
        const saved = JSON.parse(val);
        if (Array.isArray(saved) && saved.length > 0) {
          setAddresses(saved);
        }
      }
    });
  }, []);

  const saveProfile = useCallback((name: string, email: string, phone: string) => {
    AsyncStorage.setItem("profile", JSON.stringify({ name, email, phone }));
  }, []);

  const saveAddresses = useCallback((addrs: SavedAddress[]) => {
    AsyncStorage.setItem("addresses", JSON.stringify(addrs));
  }, []);

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditName(userName);
    setEditEmail(userEmail);
    setEditPhone(userPhone);
    setEditProfileVisible(true);
  };

  const handleSaveProfile = () => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    const trimmedPhone = editPhone.trim();
    if (!trimmedName || !trimmedEmail || !trimmedPhone) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUserName(trimmedName);
    setUserEmail(trimmedEmail);
    setUserPhone(trimmedPhone);
    saveProfile(trimmedName, trimmedEmail, trimmedPhone);
    setEditProfileVisible(false);
  };

  // --- Address handlers ---
  const handleAddNewAddress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingAddressId(null);
    setAddressLabel("");
    setAddressText("");
    setAddressIcon("home-outline");
    setAddressFormVisible(true);
  };

  const handleEditAddress = (addr: SavedAddress) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingAddressId(addr.id);
    setAddressLabel(addr.label);
    setAddressText(addr.address);
    setAddressIcon(addr.icon);
    setAddressFormVisible(true);
  };

  const handleSaveAddress = () => {
    const trimmedLabel = addressLabel.trim();
    const trimmedAddress = addressText.trim();
    if (!trimmedLabel || !trimmedAddress) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let updated: SavedAddress[];
    if (editingAddressId) {
      updated = addresses.map((a) =>
        a.id === editingAddressId
          ? { ...a, label: trimmedLabel, address: trimmedAddress, icon: addressIcon }
          : a
      );
    } else {
      const newAddr: SavedAddress = {
        id: Date.now().toString(),
        label: trimmedLabel,
        address: trimmedAddress,
        icon: addressIcon,
      };
      updated = [...addresses, newAddr];
    }
    setAddresses(updated);
    saveAddresses(updated);
    setAddressFormVisible(false);
  };

  const handleDeleteAddress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);
    saveAddresses(updated);
  };

  // --- Sign out handler using custom modal instead of Alert.alert ---
  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSignOutVisible(true);
  };

  const confirmSignOut = () => {
    clearCart();
    // Reset profile to defaults
    setUserName("Rahul Sharma");
    setUserEmail("rahul.sharma@email.com");
    setUserPhone("+91 98765 43210");
    setAddresses(DEFAULT_ADDRESSES);
    // Clear persisted data
    AsyncStorage.multiRemove(["profile", "addresses", "cart", "orders"]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSignOutVisible(false);
    router.replace("/(tabs)");
  };

  const SETTINGS_ITEMS = [
    { label: "Saved Addresses", icon: "location-outline", onPress: () => { Haptics.selectionAsync(); setAddressesVisible(true); } },
    { label: "My Prescriptions", icon: "document-text-outline", onPress: () => { Haptics.selectionAsync(); setPrescriptionsVisible(true); } },
    { label: "Payment Methods", icon: "card-outline", onPress: () => { Haptics.selectionAsync(); setPaymentVisible(true); } },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <LinearGradient colors={["#162844", "#1E3555"]} style={styles.userCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={[Colors.teal, Colors.tealLight]} style={styles.avatar}>
              <Ionicons name="person" size={32} color="#fff" />
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>
            <Text style={styles.userPhone}>{userPhone}</Text>
            <View style={styles.userVerified}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
              <Text style={styles.userVerifiedText}>Verified Account</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
            <Ionicons name="pencil-outline" size={16} color={Colors.teal} />
          </TouchableOpacity>
        </LinearGradient>

        {/* App Switcher */}
        <Text style={styles.switcherTitle}>Switch App</Text>
        <View style={styles.switcherGrid}>
          {APP_SWITCHER.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={styles.switcherCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/${app.id}` as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.switcherIcon, { backgroundColor: app.color + "22" }]}>
                <Ionicons name={app.icon as any} size={26} color={app.color} />
              </View>
              <Text style={styles.switcherLabel}>{app.label}</Text>
              <Text style={styles.switcherSub}>{app.sub}</Text>
              <Ionicons name="arrow-forward-circle" size={18} color={app.color} style={{ marginTop: 4 }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.settingsList}>
          {SETTINGS_ITEMS.map((item, idx, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingsRow, idx < arr.length - 1 && styles.settingsRowBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIcon}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.teal} />
                </View>
                <Text style={styles.settingsLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>MedSwift v1.0.0 · 10-minute delivery</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editProfileVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholderTextColor={Colors.textMuted}
                  placeholder="Enter your name"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  placeholderTextColor={Colors.textMuted}
                  placeholder="Enter your email"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.textMuted}
                  placeholder="Enter your phone"
                />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Saved Addresses Modal */}
      <Modal visible={addressesVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Addresses</Text>
              <TouchableOpacity onPress={() => setAddressesVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {addresses.map((addr) => (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={styles.addressIconWrap}>
                    <Ionicons name={addr.icon as any} size={20} color={Colors.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLabel}>{addr.label}</Text>
                    <Text style={styles.addressText}>{addr.address}</Text>
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity onPress={() => handleEditAddress(addr)} style={styles.addressActionBtn}>
                      <Ionicons name="create-outline" size={18} color={Colors.teal} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteAddress(addr.id)} style={styles.addressActionBtn}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {addresses.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="location-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyStateText}>No saved addresses yet</Text>
                </View>
              )}
              <TouchableOpacity style={styles.addNewBtn} onPress={handleAddNewAddress}>
                <Ionicons name="add-circle-outline" size={20} color={Colors.teal} />
                <Text style={styles.addNewText}>Add New Address</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Address Form Modal (Add / Edit) */}
      <Modal visible={addressFormVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAddressId ? "Edit Address" : "Add Address"}</Text>
              <TouchableOpacity onPress={() => setAddressFormVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Label</Text>
                <TextInput
                  style={styles.input}
                  value={addressLabel}
                  onChangeText={setAddressLabel}
                  placeholderTextColor={Colors.textMuted}
                  placeholder="e.g. Home, Office, Gym"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Address</Text>
                <TextInput
                  style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
                  value={addressText}
                  onChangeText={setAddressText}
                  placeholderTextColor={Colors.textMuted}
                  placeholder="Enter full address with pincode"
                  multiline
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Icon</Text>
                <View style={styles.iconPicker}>
                  {ICON_OPTIONS.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        addressIcon === icon && styles.iconOptionActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setAddressIcon(icon);
                      }}
                    >
                      <Ionicons name={icon as any} size={22} color={addressIcon === icon ? Colors.teal : Colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
                <Text style={styles.saveBtnText}>{editingAddressId ? "Update Address" : "Save Address"}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Prescriptions Modal */}
      <Modal visible={prescriptionsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Prescriptions</Text>
              <TouchableOpacity onPress={() => setPrescriptionsVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {SAVED_PRESCRIPTIONS.map((rx) => (
              <View key={rx.id} style={styles.prescriptionCard}>
                <View style={styles.rxIcon}>
                  <Ionicons name="document-text" size={20} color={Colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rxDoctor}>{rx.doctor}</Text>
                  <Text style={styles.rxCondition}>{rx.condition}</Text>
                  <Text style={styles.rxDate}>{rx.date}</Text>
                </View>
                <TouchableOpacity onPress={() => Haptics.selectionAsync()}>
                  <Ionicons name="eye-outline" size={18} color={Colors.teal} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addNewBtn} onPress={() => Haptics.selectionAsync()}>
              <Ionicons name="camera-outline" size={20} color={Colors.teal} />
              <Text style={styles.addNewText}>Upload New Prescription</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Methods Modal */}
      <Modal visible={paymentVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Methods</Text>
              <TouchableOpacity onPress={() => setPaymentVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.paymentCard}>
              <View style={[styles.paymentIcon, { backgroundColor: "#4D96FF22" }]}>
                <Text style={{ fontSize: 20 }}>🏦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentLabel}>UPI</Text>
                <Text style={styles.paymentDetail}>rahul@upi</Text>
              </View>
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            </View>
            <View style={styles.paymentCard}>
              <View style={[styles.paymentIcon, { backgroundColor: "#FF6B6B22" }]}>
                <Text style={{ fontSize: 20 }}>💳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentLabel}>Credit Card</Text>
                <Text style={styles.paymentDetail}>**** **** **** 4242</Text>
              </View>
            </View>
            <View style={styles.paymentCard}>
              <View style={[styles.paymentIcon, { backgroundColor: "#00C86F22" }]}>
                <Text style={{ fontSize: 20 }}>💰</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentLabel}>Cash on Delivery</Text>
                <Text style={styles.paymentDetail}>Pay when you receive</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addNewBtn} onPress={() => Haptics.selectionAsync()}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.teal} />
              <Text style={styles.addNewText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal (cross-platform replacement for Alert.alert) */}
      <Modal visible={signOutVisible} animationType="fade" transparent>
        <View style={styles.signOutOverlay}>
          <View style={styles.signOutCard}>
            <View style={styles.signOutIconWrap}>
              <Ionicons name="log-out-outline" size={32} color={Colors.danger} />
            </View>
            <Text style={styles.signOutTitle}>Sign Out</Text>
            <Text style={styles.signOutMessage}>
              Are you sure you want to sign out? Your cart and saved data will be cleared.
            </Text>
            <View style={styles.signOutActions}>
              <TouchableOpacity
                style={styles.signOutCancelBtn}
                onPress={() => setSignOutVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.signOutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.signOutConfirmBtn}
                onPress={confirmSignOut}
                activeOpacity={0.8}
              >
                <Text style={styles.signOutConfirmText}>Sign Out</Text>
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
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.text },
  userCard: { marginHorizontal: 20, borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 24 },
  avatarWrap: { borderRadius: 24, overflow: "hidden" },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  userName: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text },
  userEmail: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  userPhone: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  userVerified: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  userVerifiedText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.success },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.teal + "22", alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  switcherTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.text, paddingHorizontal: 20, marginBottom: 12 },
  switcherGrid: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  switcherCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 14, gap: 4, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  switcherIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  switcherLabel: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.text, textAlign: "center" },
  switcherSub: { fontFamily: "DMSans_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  sectionLabel: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, paddingHorizontal: 20 },
  settingsList: { backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", marginHorizontal: 20, marginBottom: 20 },
  settingsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingsRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.teal + "22", alignItems: "center", justifyContent: "center" },
  settingsLabel: { fontFamily: "DMSans_500Medium", fontSize: 15, color: Colors.text },
  logoutBtn: { marginHorizontal: 20, backgroundColor: Colors.danger + "22", borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.danger + "44", marginBottom: 16 },
  logoutText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.danger },
  version: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted, textAlign: "center", paddingBottom: 8 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Colors.navy, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "80%", borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontFamily: "DMSans_700Bold", fontSize: 22, color: Colors.text },

  // Edit profile form
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontFamily: "DMSans_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  saveBtn: { backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#fff" },

  // Address card
  addressCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  addressIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.teal + "22", alignItems: "center", justifyContent: "center" },
  addressLabel: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.text },
  addressText: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  addressActions: { flexDirection: "column", gap: 8 },
  addressActionBtn: { padding: 4 },

  // Empty state
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 24, gap: 8 },
  emptyStateText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textMuted },

  // Icon picker
  iconPicker: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  iconOption: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  iconOptionActive: { borderColor: Colors.teal, backgroundColor: Colors.teal + "22" },

  // Prescription card
  prescriptionCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  rxIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.warning + "22", alignItems: "center", justifyContent: "center" },
  rxDoctor: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.text },
  rxCondition: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  rxDate: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Payment card
  paymentCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  paymentIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  paymentLabel: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.text },
  paymentDetail: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  defaultBadge: { backgroundColor: Colors.teal + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  defaultBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 10, color: Colors.teal },

  // Add new button
  addNewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.teal + "44", borderStyle: "dashed", marginTop: 4 },
  addNewText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.teal },

  // Sign out confirmation modal
  signOutOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  signOutCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 28, alignItems: "center", borderWidth: 1, borderColor: Colors.border, width: "100%", maxWidth: 340 },
  signOutIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.danger + "22", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  signOutTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.text, marginBottom: 8 },
  signOutMessage: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  signOutActions: { flexDirection: "row", gap: 12, width: "100%" },
  signOutCancelBtn: { flex: 1, backgroundColor: Colors.cardElevated, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  signOutCancelText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.text },
  signOutConfirmBtn: { flex: 1, backgroundColor: Colors.danger, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  signOutConfirmText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" },
});
