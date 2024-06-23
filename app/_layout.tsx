import React, { useEffect, useState } from "react";
import { Canvas, useImage, Image, Group, Text, matchFont, Circle } from "@shopify/react-native-skia";
import { useWindowDimensions, StatusBar, Platform, Dimensions, Alert } from "react-native";
import { useSharedValue, withTiming, Easing, withSequence, withRepeat, useFrameCallback, useDerivedValue, interpolate, useAnimatedReaction, runOnJS, cancelAnimation } from "react-native-reanimated";
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';

const GRAVITY = 1000;
const JUMP_FORCE = -500;

const App = () => {
  const pipeOffset = useSharedValue(0);


  
  const width = Dimensions.get('window').width;
  const height = Dimensions.get('screen').height
  const bg = useImage(require("../assets/sprites/background-day.png"));
  const bgNight = useImage(require("../assets/sprites/background-night.png"));

  const bird = useImage(require("../assets/sprites/yellowbird-upflap.png"))
  const pipeBottom = useImage(require("../assets/sprites/pipe-green.png"))
  const pipeTop = useImage(require("../assets/sprites/pipe-green-top.png"))
  const base = useImage(require("../assets/sprites/base.png"))
  
  const firstBase = useSharedValue(0)
  const secondBase = useSharedValue(width)

  const digitImages = {
    0: useImage(require("../assets/sprites/0.png")),
    1: useImage(require("../assets/sprites/1.png")),
    2: useImage(require("../assets/sprites/2.png")),
    3: useImage(require("../assets/sprites/3.png")),
    4: useImage(require("../assets/sprites/4.png")),
    5: useImage(require("../assets/sprites/5.png")),
    6: useImage(require("../assets/sprites/6.png")),
    7: useImage(require("../assets/sprites/7.png")),
    8: useImage(require("../assets/sprites/8.png")),
    9: useImage(require("../assets/sprites/9.png"))
  }

  const [score, setScore] = useState(0)
  const [digits, setDigits] = useState(["0"])

  const topPipeY = useDerivedValue(() => pipeOffset.value - 320)
  const bottomPipeY = useDerivedValue(() => height - 320 + pipeOffset.value)

  useEffect(() => {
    console.log(score)
    setDigits(score.toString().split(''))
    if (score % 3 === 0 && score !== 0) {
      if (nightOpacity.value === 0) {
        nightOpacity.value = withTiming(1, { duration: 850, easing: Easing.linear })
        dayOpacity.value = withTiming(0, { duration: 850, easing: Easing.linear })
      } else {
        nightOpacity.value = withTiming(0, { duration: 850, easing: Easing.linear })
        dayOpacity.value = withTiming(1, { duration: 850, easing: Easing.linear })
      }
    }
  }, [score])


  const birdX = width / 4;

  const nightOpacity = useSharedValue(0)
  const dayOpacity = useSharedValue(1)

  const gameOver = useSharedValue(false)

  const pipeX = useSharedValue(width);

  const birdY = useSharedValue(height / 3)
  const birdYVelocity = useSharedValue(0)
  const pipeSpeed = useDerivedValue(() => {
    return interpolate(score, [0, 20], [1, 2])
  })

  const birdTransform = useDerivedValue(() => {
    return [{ rotate: interpolate(birdYVelocity.value, [-500, 500], [-0.5, 0.5]) }];
  })

  const birdOrigin = useDerivedValue(() => {
    return { x: (width / 4) + 32, y: birdY.value + 24 }
  })



  const obstacles = useDerivedValue(() => [
    // Bottom pipe
    {
      x: pipeX.value,
      y: height - 320 + pipeOffset.value,
      h: 640,
      w: 104
    },
    // Top pipe
    {
      x: pipeX.value,
      y: pipeOffset.value - 320,
      h: 640,
      w: 104
    }
  ])

  const moveTheBase = () => {
    firstBase.value = withRepeat(
      withSequence(
        withTiming(-width, { duration: 3000 / pipeSpeed.value, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
      ), -1)

    secondBase.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 3000 / pipeSpeed.value, easing: Easing.linear }),
        withTiming(width, { duration: 0 }),
      ), -1)
  }
  
  const moveTheMap = () => {
    pipeX.value = withSequence(
        withTiming(width, { duration: 0 }),
        withTiming(-120, { duration: 3000 / pipeSpeed.value, easing: Easing.linear }),
        withTiming(width, { duration: 0 }),
      )
  }

  useAnimatedReaction(
    () => pipeX.value,
    (currentValue, previousValue) => {
      const middle = birdX;

      if(previousValue && currentValue < -100 && previousValue > -100) {
        pipeOffset.value = Math.random() * 400 - 200;
        cancelAnimation(pipeX)
        runOnJS(moveTheMap)();
      }

      if (currentValue !== previousValue && previousValue && currentValue <= middle && previousValue > middle) {
        runOnJS(setScore)(score + 1)
      }
    }
  )


  const isPointCollidingWithRect = (point, rect) => {
    "worklet";
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    )
  }

  useAnimatedReaction(
    () => birdY.value,
    (currentValue, previousValue) => {

      const center = {
        x: birdX + 32,
        y: birdY.value + 24
      }

      if (currentValue > height - 115 || currentValue < 0) {
        console.log("Game over")
        gameOver.value = true;
      }

      const isColliding = obstacles.value.some((rect) => isPointCollidingWithRect(center, rect))
      
      if(isColliding) {
        gameOver.value = true;
      }
    
    }
  )

  useAnimatedReaction(
    () => gameOver.value,
    (currentValue, previousValue) => {
      if (currentValue && !previousValue) {
        cancelAnimation(pipeX);
        cancelAnimation(firstBase)
        cancelAnimation(secondBase)
      }
    }
  )

  useFrameCallback(({ timeSincePreviousFrame: dt }) => {
    if (!dt || gameOver.value) {
      return
    }
    birdY.value = birdY.value + (birdYVelocity.value * dt) / 1000;
    birdYVelocity.value = birdYVelocity.value + (GRAVITY * dt) / 1000
  });

  useEffect(() => {
    moveTheMap()
    moveTheBase()
  }, [])





  const restartGame = () => {
    'worklet';
    birdY.value = height / 3;
    birdYVelocity.value = 0;
    gameOver.value = false;
    pipeX.value = width;
    runOnJS(moveTheMap)();
    runOnJS(moveTheBase)();
    runOnJS(setScore)(0);
  }

  const gesture = Gesture.Tap().onStart(() => {
    if (gameOver.value) {
      restartGame();
    } else {
      birdYVelocity.value = JUMP_FORCE;
    }
  })


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ width, height }}>
          <StatusBar />
          {/* Background */}
          <Image image={bg} opacity={dayOpacity} width={width} height={height} fit={"cover"} />
          <Image image={bgNight} opacity={nightOpacity} width={width} height={height} fit={"cover"} />


          {/*Pipes*/}
          <Image image={pipeTop} y={topPipeY} x={pipeX} width={104} height={640} />
          <Image image={pipeBottom} y={bottomPipeY} x={pipeX} width={104} height={640} />


          {/* Base */}
          <Image image={base} width={width} height={150} x={firstBase} y={height - 75} fit={"contain"} />
          <Image image={base} width={width} height={150} x={secondBase} y={height - 75} fit={"contain"} />


          {/* Bird */}
          <Group origin={birdOrigin} transform={birdTransform}>
            <Image image={bird} y={birdY} x={birdX} width={64} height={48} />
          </Group>


          <Group>
            {/* Score */}
            {digits.map((digit, index) => {
              const x = index * 30
              return <Image key={index} image={digitImages[digit]} y={60} x={x + width / 2 - (digits.length === 1 ? 26 : 48)} width={64} height={48} />
            })}
          </Group>
          {/* Text 
          <Text x={width / 2} y={100} text={score.toString()} font={font} />*/}
        </Canvas>
      </GestureDetector>
    </GestureHandlerRootView>

  );
};

export default App;