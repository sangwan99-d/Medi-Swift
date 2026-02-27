import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView, Alert, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";

export default function PartnerRegisterScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [form, setForm] = useState({ name: "", email: "", password: "", storeName: "", gstNumber: "" });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.storeName || !form.gstNumber) {
      Alert.alert("Error", "Please fill all fields"); return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiRequest("POST", "/api/partner/register", form);
      Alert.alert("Application Submitted", "Your pharmacy registration is pending admin approval. You will be notified once approved.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "name", label: "Contact Person Name", placeholder: "Full name" },
    { key: "storeName", label: "Pharmacy / Store Name", placeholder: "Apollo Pharmacy, Sector 18" },
    { key: "gstNumber", label: "GST Number", placeholder: "22AAAAA0000A1Z5" },
    { key: "email", label: "Email Address", placeholder: "pharmacy@email.com", keyboardType: "email-address" as const, autoCapitalize: "none" as const },
    { key: "password", label: "Password", placeholder: "Choose a strong password", secure: true },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Pharmacy</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={18} color={Colors.warning} />
            <Text style={styles.infoText}>Registration requires admin approval. Please keep your Drug License and GST certificate ready.</Text>
          </View>

          <View style={styles.form}>
            {fields.map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[f.key]}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={f.secure}
                  keyboardType={f.keyboardType || "default"}
                  autoCapitalize={f.autoCapitalize || "words"}
                  autoCorrect={false}
                />
              </View>
            ))}

            <View style={styles.uploadPlaceholder}>
              <Ionicons name="document-text-outline" size={24} color={Colors.textMuted} />
              <Text style={styles.uploadPlaceholderText}>Pharmacy License Upload</Text>
              <Text style={styles.uploadPlaceholderSub}>Feature available in full build</Text>
            </View>

            <View style={styles.uploadPlaceholder}>
              <Ionicons name="location-outline" size={24} color={Colors.textMuted} />
              <Text style={styles.uploadPlaceholderText}>GPS Location</Text>
              <Text style={styles.uploadPlaceholderSub}>Auto-detected from device</Text>
            </View>

            <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
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
  uploadPlaceholder: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed" },
  uploadPlaceholderText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.textSecondary },
  uploadPlaceholderSub: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.textMuted },
  submitBtn: { backgroundColor: "#6BCB77", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  submitBtnText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#fff" },
});
