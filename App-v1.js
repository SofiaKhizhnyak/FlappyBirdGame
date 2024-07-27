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
  withSequence,
  useFrameCallback,
  useDerivedValue,
  interpolate,
  Extrapolation,
  useAnimatedReaction,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

// constants to replicate real life physics in the game (motion of a free falling object)
const GRAVITY = 1000;
const JUMP_FORCE = -500;

const App = () => {
  const { width, height } = useWindowDimensions();

  const [score, setScore] = useState(0);

  //image init for each sprite (character / object / game appearance etc..)
  const bg = useImage(require("./assets/sprites/background-day.png"));
  const bird = useImage(require("./assets/sprites/yellowbird-upflap.png"));
  const pipeBottom = useImage(require("./assets/sprites/pipe-green.png"));
  const pipeTop = useImage(require("./assets/sprites/pipe-green-top.png"));
  const base = useImage(require("./assets/sprites/base.png"));

  const pipeWidth = 104;
  const pipeHeight = 640;
  const birdWidth = 64;
  const birdHeight = 48;
  const baseHeight = 150;

  const x = useSharedValue(width);

  const gameOver = useSharedValue(false);

  const birdY = useSharedValue(height / 3);
  const birdYVelocity = useSharedValue(0); //moving accross the y axis to simulate gravity
  const birdX = width / 4;

  const pipeOffset = useSharedValue(0); //determining the vertical position of the pipes in the game
  const topPipeY = useDerivedValue(() => pipeOffset.value - 320);
  const bottomPipeY = useDerivedValue(() => height - 320 + pipeOffset.value);
  const pipeX = useSharedValue(width);

  const pipesSpeed = useDerivedValue(() => {
    return interpolate(score, [0, 20], [1, 2]);
  });

  const obstacles = useDerivedValue(() => [
    // bottom pipe
    {
      x: pipeX.value,
      y: bottomPipeY.value,
      h: pipeHeight,
      w: pipeWidth,
    },
    // top pipe
    {
      x: pipeX.value,
      y: topPipeY.value,
      h: pipeHeight,
      w: pipeWidth,
    },
  ]);

  useEffect(() => {
    moveTheMap();
  }, []);

  //animate the pipes movement (to make it look like the bird is flying)
  const moveTheMap = () => {
    pipeX.value = withSequence(
      withTiming(width, { duration: 0 }),
      withTiming(-150, {
        duration: 3000 / pipesSpeed.value,
        easing: Easing.linear,
      }),
      withTiming(width, { duration: 0 })
    );
  };

  //track the score of the player & move the pipes up/down
  useAnimatedReaction(
    () => pipeX.value,
    (currentValue, previousValue) => {
      const middle = birdX;

      // change offset for the position of the next gap, by changing the offset, the game can dynamically adjust the difficulty
      //(makes the pipes' positions unpredictable)
      if (previousValue && currentValue < -100 && previousValue > -100) {
        pipeOffset.value = Math.random() * 400 - 200;
        cancelAnimation(pipeX);
        runOnJS(moveTheMap)();
      }

      // increase the score when the bird passes the middle of the pipe
      if (
        currentValue !== previousValue &&
        previousValue &&
        currentValue <= middle &&
        previousValue > middle
      ) {
        runOnJS(setScore)(score + 1);
      }
    }
  );

  const isPointCollidingWithRect = (point, rect) => {
    "worklet";
    return (
      point.x >= rect.x - birdHeight / 2 && // right of the left edge AND
      point.x <= rect.x + rect.w && // left of the right edge AND
      point.y >= rect.y - birdHeight / 2 && // below the top AND
      point.y <= rect.y + rect.h + birdHeight / 3 // above the bottom
    );
  };

  //collision detection
  useAnimatedReaction(
    () => birdY.value,
    (currentValue, previousValue) => {
      const center = {
        x: birdX + 32,
        y: birdY.value + 24,
      };

      //collision of the bird with the ground (object with line)
      if (
        currentValue > height - baseHeight + birdHeight / 2 ||
        currentValue < 0
      ) {
        gameOver.value = true;
      }

      //collision of the bird with the pipes (object with object)
      const isColliding = obstacles.value.some((rect) =>
        isPointCollidingWithRect(center, rect)
      );
      if (isColliding) {
        gameOver.value = true;
      }
    }
  );

  //stop the animation when game over
  useAnimatedReaction(
    () => gameOver.value,
    (currentValue, previousValue) => {
      if (currentValue && !previousValue) {
        /* runOnJS(Alert.alert)("Game Over", `Your score is ${score}`); */
        cancelAnimation(pipeX);
      }
    }
  );

  //bird falling and rising animation
  useFrameCallback(({ timeSincePreviousFrame: dt }) => {
    if (!dt || gameOver.value) {
      return;
    }
    birdY.value += (birdYVelocity.value * dt) / 1000;
    birdYVelocity.value += (GRAVITY * dt) / 1000;
  });

  const restartGame = () => {
    "worklet";
    birdY.value = height / 3;
    birdYVelocity.value = 0;
    gameOver.value = false;
    pipeX.value = width;
    runOnJS(moveTheMap)();
    runOnJS(setScore)(0);
  };

  //detect the taps of the user on the screen and make the bird rise (jump..)
  const gesture = Gesture.Tap().onStart(() => {
    if (gameOver.value) {
      //restart
      restartGame();
    } else {
      //rise / jump
      birdYVelocity.value = JUMP_FORCE;
    }
  });

  //bird rotation animation
  const birdTransform = useDerivedValue(() => {
    return [
      {
        rotate: interpolate(
          birdYVelocity.value,
          [-500, 500],
          [-0.5, 0.5],
          Extrapolation.CLAMP //clamp (limit / fasten) the values to the range [-0.5, 0.5] to prevent the bird from rotating too much
        ),
      },
    ];
  });

  const birdOrigin = useDerivedValue(() => {
    //rotate the bird based on the birds center
    return {
      x: width / 4 + birdWidth / 2,
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
          {/* Pipes */}
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
          <Group transform={birdTransform} origin={birdOrigin}>
            <Image
              image={bird}
              x={birdX}
              y={birdY}
              width={birdWidth}
              height={birdHeight}
            />
          </Group>
          {/* Score */}
          <Text
            x={width / 2 - 30}
            y={100}
            text={score.toString()}
            font={font}
          />
        </Canvas>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};
export default App;
