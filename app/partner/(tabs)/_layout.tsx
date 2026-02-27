import { Tabs } from "expo-router";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Colors } from "@/constants/colors";

function NativePartnerTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="orders">
        <Icon sf={{ default: "list.clipboard", selected: "list.clipboard.fill" }} />
        <Label>Orders</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventory">
        <Icon sf={{ default: "cross.case", selected: "cross.case.fill" }} />
        <Label>Inventory</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "building.2", selected: "building.2.fill" }} />
        <Label>Store</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicPartnerTabs() {
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#6BCB77",
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.navy,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () => isIOS ? <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} /> : isWeb ? <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.navy }]} /> : null,
        tabBarLabelStyle: { fontFamily: "DMSans_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen name="orders" options={{ title: "Orders", tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} /> }} />
      <Tabs.Screen name="inventory" options={{ title: "Inventory", tabBarIcon: ({ color, size }) => <Ionicons name="medical" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Store", tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} /> }} />
    </Tabs>
  );
}

export default function PartnerTabLayout() {
  if (isLiquidGlassAvailable()) return <NativePartnerTabs />;
  return <ClassicPartnerTabs />;
}
