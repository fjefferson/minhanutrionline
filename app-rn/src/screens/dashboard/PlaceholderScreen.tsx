import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="construct-outline" size={48} color="#d1d5db" />
      <Text style={styles.title}>Em breve</Text>
      <Text style={styles.sub}>Esta tela está sendo construída.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#6b7280" },
  sub: { fontSize: 14, color: "#9ca3af" },
});
