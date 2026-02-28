import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Platform, ScrollView, Alert, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert("Error", "Enter credentials"); return; }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await apiRequest("POST", "/api/admin/login", { email, password });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await AsyncStorage.setItem("admin_session", JSON.stringify(data));
      router.replace("/admin/(tabs)/dashboard" as any);
    } catch (e: any) {
      Alert.alert("Login Failed", e.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <LinearGradient colors={["#FFB54722", "#FFB54744"]} style={styles.iconBg}>
            <Ionicons name="shield-checkmark" size={40} color="#FFB547" />
          </LinearGradient>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.sub}>Platform control & monitoring</Text>

          <View style={styles.demoCard}>
            <Ionicons name="information-circle" size={16} color={Colors.teal} />
            <Text style={styles.demoText}>Demo: admin@demo.com / admin123</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="admin@medswift.com" placeholderTextColor={Colors.textMuted} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={Colors.textMuted} secureTextEntry />
            </View>
            <TouchableOpacity style={[styles.loginBtn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.loginBtnText}>{loading ? "Signing in..." : "Access Dashboard"}</Text>
              {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  backBtn: { position: "absolute", top: Platform.OS === "web" ? 67 : 60, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, gap: 20, alignItems: "center" },
  iconBg: { width: 88, height: 88, borderRadius: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFB54744" },
  title: { fontFamily: "DMSans_700Bold", fontSize: 32, color: Colors.text, textAlign: "center" },
  sub: { fontFamily: "DMSans_400Regular", fontSize: 16, color: Colors.textSecondary, textAlign: "center" },
  demoCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.teal + "22", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.teal + "44", alignSelf: "stretch" },
  demoText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.teal, flex: 1 },
  form: { gap: 16, width: "100%" },
  field: { gap: 6 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.textSecondary },
  input: { backgroundColor: Colors.card, borderRadius: 14, height: 52, paddingHorizontal: 16, fontFamily: "DMSans_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  loginBtn: { backgroundColor: "#FFB547", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  loginBtnText: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#0A1628" },
});
