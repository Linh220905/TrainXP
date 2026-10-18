import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { useColors } from "@/hooks/useColors";
import { ActivityIndicator, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useAppState } from "@/context/AppState";

export default function TabLayout() {
  const { hydrated, hasOnboarded, isAuthenticated } = useAppState();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#080C14",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#38BDF8" />
      </View>
    );
  }

  if (!isAuthenticated || !hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#38BDF8",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#080C14",
          borderTopColor: "#1E293B",
          height: 62 + Math.max(insets.bottom, 12),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 12),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t.tabs.plan,
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t.tabs.workout,
          tabBarIcon: ({ color, size }) => (
            <Feather name="plus-circle" color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t.tabs.stats,
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" color={color} size={size} />
          ),
        }}
      />
      {/* Hidden legacy tab screens */}
      <Tabs.Screen
        name="rank"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
