import { Platform, useWindowDimensions } from "react-native";
import {
  Canvas,
  useImage,
  Image,
  Group,
  Text,
  matchFont,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  interpolate,
  Extrapolation,
  useFrameCallback,
  cancelAnimation,
  runOnJS,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

const GRAVITY = 1000;
const JUMP_FORCE = -500;

const App = () => {
  const { width, height } = useWindowDimensions();

  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const bg = useImage(require("./assets/sprites/background-day.png"));
  const bird = useImage(require("./assets/sprites/yellowbird-upflap.png"));
  const pipeBottom = useImage(require("./assets/sprites/pipe-green.png"));
  const pipeTop = useImage(require("./assets/sprites/pipe-green-top.png"));
  const base = useImage(require("./assets/sprites/base.png"));
  const message = useImage(require("./assets/sprites/message.png"));

  const pipeWidth = 104;
  const pipeHeight = 640;
  const birdWidth = 64;
  const birdHeight = 48;
  const baseHeight = 150;

  const gameOver = useSharedValue(false);
  const birdY = useSharedValue(height / 3);
  const birdYVelocity = useSharedValue(0);
  const birdX = width / 4;

  const pipeOffset = useSharedValue(0);
  const topPipeY = useDerivedValue(() => pipeOffset.value - 320);
  const bottomPipeY = useDerivedValue(() => height - 320 + pipeOffset.value);
  const pipeX = useSharedValue(width);

  const pipesSpeed = useDerivedValue(() => {
    return interpolate(score, [0, 20], [1, 2]);
  });

  const obstacles = useDerivedValue(() => [
    {
      x: pipeX.value,
      y: bottomPipeY.value,
      h: pipeHeight,
      w: pipeWidth,
    },
    {
      x: pipeX.value,
      y: topPipeY.value,
      h: pipeHeight,
      w: pipeWidth,
    },
  ]);

  useEffect(() => {
    if (gameStarted) {
      moveTheMap();
    }
  }, [gameStarted]);

  const moveTheMap = () => {
    pipeX.value = withTiming(
      -pipeWidth,
      {
        duration: 3000 / pipesSpeed.value,
        easing: Easing.linear,
      },
      () => {
        pipeX.value = width;
        pipeOffset.value = Math.random() * 400 - 200;
        runOnJS(setScore)((score) => score + 1);
        if (!gameOver.value) moveTheMap();
      }
    );
  };

  const isPointCollidingWithRect = (point, rect) => {
    "worklet";
    return (
      point.x >= rect.x - birdHeight / 2 &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y - birdHeight / 2 &&
      point.y <= rect.y + rect.h + birdHeight / 3
    );
  };

  useAnimatedReaction(
    () => birdY.value,
    (currentValue) => {
      const center = {
        x: birdX + birdWidth / 2,
        y: birdY.value + birdHeight / 2,
      };

      if (
        currentValue > height - baseHeight + birdHeight / 2 ||
        currentValue < 0 ||
        obstacles.value.some((rect) => isPointCollidingWithRect(center, rect))
      ) {
        gameOver.value = true;
      }
    }
  );

  useFrameCallback(({ timeSincePreviousFrame: dt }) => {
    if (!dt || gameOver.value || !gameStarted) {
      return;
    }
    birdY.value += (birdYVelocity.value * dt) / 1000;
    birdYVelocity.value += (GRAVITY * dt) / 1000;
  });

  const restartGame = () => {
    birdY.value = height / 3;
    birdYVelocity.value = 0;
    gameOver.value = false;
    pipeX.value = width;
    setScore(0);
    moveTheMap();
  };

  const startGame = () => {
    setGameStarted(true);
    birdYVelocity.value = JUMP_FORCE;
    moveTheMap();
  };

  const gesture = Gesture.Tap().onStart(() => {
    if (gameOver.value) {
      restartGame();
    } else if (!gameStarted) {
      startGame();
    } else {
      birdYVelocity.value = JUMP_FORCE;
    }
  });

  const birdTransform = useDerivedValue(() => {
    return [
      {
        rotate: interpolate(
          birdYVelocity.value,
          [-500, 500],
          [-0.5, 0.5],
          Extrapolation.CLAMP
        ),
      },
    ];
  });

  const birdOrigin = useDerivedValue(() => {
    return {
      x: birdX + birdWidth / 2,
      y: birdY.value + birdHeight / 2,
    };
  });

  const fontFamily = Platform.select({ ios: "Helvetica", default: "serif" });
  const fontStyle = {
    fontFamily,
    fontSize: 40,
    fontWeight: "bold",
  };
  const font = matchFont(fontStyle);

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ width, height }}>
          {/* Background */}
          <Image image={bg} width={width} height={height} fit={"cover"} />

          {/* Opening message */}
          {!gameStarted && (
            <Image
              image={message}
              width={300}
              height={200}
              x={width / 2 - 150}
              y={height / 2 - 100}
            />
          )}

          {/* Pipes */}
          {gameStarted && (
            <>
              <Image
                image={pipeTop}
                y={topPipeY}
                x={pipeX}
                width={pipeWidth}
                height={pipeHeight}
              />
              <Image
                image={pipeBottom}
                y={bottomPipeY}
                x={pipeX}
                width={pipeWidth}
                height={pipeHeight}
              />
            </>
          )}

          {/* Base */}
          <Image
            image={base}
            y={height - 75}
            x={0}
            width={width}
            height={baseHeight}
            fit={"cover"}
          />

          {/* Bird */}
          {gameStarted && (
            <Group transform={birdTransform} origin={birdOrigin}>
              <Image
                image={bird}
                x={birdX}
                y={birdY}
                width={birdWidth}
                height={birdHeight}
              />
            </Group>
          )}

          {/* Score */}
          {gameStarted && (
            <Text
              x={width / 2 - 30}
              y={100}
              text={score.toString()}
              font={font}
            />
          )}
        </Canvas>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};
export default App;
