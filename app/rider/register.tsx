import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Platform, ScrollView, Alert, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";

const VEHICLE_TYPES = ["Bike", "Scooter", "Cycle", "Auto"];

export default function RiderRegisterScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [form, setForm] = useState({ name: "", email: "", password: "", vehicleType: "Bike", licenseNumber: "" });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.licenseNumber) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiRequest("POST", "/api/rider/register", form);
      Alert.alert(
        "Application Submitted",
        "Your rider registration is pending admin approval. You will be notified once approved.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register as Rider</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={18} color={Colors.warning} />
            <Text style={styles.infoText}>
              Registration requires admin approval. Keep your driving license and vehicle documents ready.
            </Text>
          </View>

          <View style={styles.form}>
            {[
              { key: "name", label: "Full Name", placeholder: "Your full name" },
              { key: "email", label: "Email Address", placeholder: "rider@email.com", keyboardType: "email-address" as const, autoCapitalize: "none" as const },
              { key: "licenseNumber", label: "Driving License Number", placeholder: "DL05-2024-XXXXXXX" },
              { key: "password", label: "Password", placeholder: "Choose a strong password", secure: true },
            ].map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[f.key]}
                  onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={f.secure}
                  keyboardType={f.keyboardType || "default"}
                  autoCapitalize={f.autoCapitalize || "words"}
                  autoCorrect={false}
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Vehicle Type</Text>
              <View style={styles.vehicleGrid}>
                {VEHICLE_TYPES.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.vehicleCard, form.vehicleType === v && styles.vehicleCardActive]}
                    onPress={() => { setForm((p) => ({ ...p, vehicleType: v })); Haptics.selectionAsync(); }}
                  >
                    <Ionicons
                      name={v === "Bike" ? "bicycle" : v === "Scooter" ? "bicycle" : v === "Cycle" ? "bicycle" : "car"}
                      size={22}
                      color={form.vehicleType === v ? "#4D96FF" : Colors.textMuted}
                    />
                    <Text style={[styles.vehicleLabel, form.vehicleType === v && styles.vehicleLabelActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>{loading ? "Submitting..." : "Submit Application"}</Text>
              {!loading && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.warning + "22", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.warning + "44" },
  infoText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.warning, flex: 1, lineHeight: 19 },
  form: { gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.textSecondary },
  input: { backgroundColor: Colors.card, borderRadius: 14, height: 52, paddingHorizontal: 16, fontFamily: "DMSans_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  vehicleGrid: { flexDirection: "row", gap: 10 },
  vehicleCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, paddingVertical: 14, alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border },
  vehicleCardActive: { borderColor: "#4D96FF88", backgroundColor: "#4D96FF11" },
  vehicleLabel: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.textMuted },
  vehicleLabelActive: { color: "#4D96FF" },
  submitBtn: { backgroundColor: "#4D96FF", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  submitBtnText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#fff" },
});
