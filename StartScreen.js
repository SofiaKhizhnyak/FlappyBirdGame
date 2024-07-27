import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useImage, Image, Canvas } from "@shopify/react-native-skia";

const StartScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const message = useImage(require("./assets/sprites/message.png"));
  const bg = useImage(require("./assets/sprites/background-day.png"));

  const startGame = () => {
    navigation.navigate("Game");
  };

  return (
    <TouchableOpacity style={styles.container} onPress={startGame}>
      <Canvas style={{ width, height }}>
        <Image image={bg} width={width} height={height} fit={"cover"} />
        <Image
          image={message}
          width={400}
          height={300}
          x={width / 2 - 200}
          y={height / 2 - 200}
        />
      </Canvas>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default StartScreen;
