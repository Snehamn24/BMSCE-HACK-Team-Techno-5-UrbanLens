import { View, Text, StyleSheet } from "react-native";

export default function IssueCard({ issue }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{issue.title}</Text>
      <Text>{issue.location}</Text>
      <Text>Status: {issue.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    marginVertical: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
});