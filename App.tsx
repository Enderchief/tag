import { View, Text, StyleSheet } from "react-native";
import Index from "./app/index";

export default function App() {
  return (
    <View style={styles.container}>
      <Index />
      {/* <Text>hello world!</Text> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
