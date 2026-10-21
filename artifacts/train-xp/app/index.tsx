import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAppState } from "@/context/AppState";

/**
 * Root Entrypoint Gateway
 * Directs traffic between Onboarding and Main Tabs based on persisted hydration status.
 */
export default function RootIndexGate() {
  const { hydrated, hasOnboarded } = useAppState();

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#090D16",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#38BDF8" />
      </View>
    );
  }

  if (hasOnboarded) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
