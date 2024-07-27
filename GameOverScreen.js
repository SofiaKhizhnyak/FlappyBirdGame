import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import {
  Canvas,
  useImage,
  Image,
  Text,
  matchFont,
} from "@shopify/react-native-skia";

const GameOverScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const gameOverImage = useImage(require("./assets/sprites/gameover.png"));

  const restartGame = () => {
    navigation.navigate("Game");
  };

  const fontFamily = Platform.select({ ios: "Helvetica", default: "serif" });
  const fontStyle = {
    fontFamily,
    fontSize: 40,
    fontWeight: "bold",
  };
  const font = matchFont(fontStyle);

  return (
    <TouchableOpacity style={styles.container} onPress={restartGame}>
      <Canvas style={{ width, height }}>
        {gameOverImage && (
          <Image
            image={gameOverImage}
            width={300}
            height={200}
            x={width / 2 - 150}
            y={height / 2 - 100}
          />
        )}
        <Text
          x={width / 2 - 150}
          y={height / 2 + 120}
          text="Tap to Restart"
          font={font}
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
    backgroundColor: "#fff",
  },
});

export default GameOverScreen;
