// Animated mascot for React Native. Needs react-native-svg and react-native-reanimated.
//
// How it is built: every moving body part is its own SVG layer inside an Animated.View, and the Views
// are animated (not the SVG), so all motion runs on the UI thread. All layers share one 512 x 720 canvas;
// a joint rotates around its pivot point given in those canvas units.
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing, ReduceMotion, SharedValue, cancelAnimation, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import * as Art from './art';

export type Reaction = 'correct' | 'wrong' | 'wave';

export type CharacterProps = {
  /** Width in points. Height is size * 1.406. Default 220. */
  size?: number;
  /** While true the mouth moves as if speaking (pair it with your audio). */
  talking?: boolean;
  /** Subtle looping idle motion: breathing, sway, blinking, glances. Default true. */
  idle?: boolean;
  style?: StyleProp<ViewStyle>;
};

export type CharacterHandle = {
  /** Plays a reaction. Resolves when it has finished (or was stopped). */
  play(reaction: Reaction): Promise<void>;
  /** Cancels a running reaction and returns to the resting pose. */
  stop(): void;
  blink(): void;
  /** Raw animation values for custom moves (see README). */
  parts: CharacterParts;
};

// Expression values used by `mouth`, `hand` and `eyes`.
export const MOUTH = { smile: 0, grin: 1, open: 2, mid: 3, sad: 4 } as const;
export const HAND = { relaxed: 0, thumb: 1, open: 2 } as const;
export const EYES = { open: 0, happy: 1, sad: 2 } as const;

// Reaction-controlled values with their resting value. Angles in degrees, distances in canvas units.
const REST = {
  rigY: 0, rigScaleX: 1, rigScaleY: 1, shadowScale: 1, upperY: 0,
  head: 0, headY: 0, hairScaleY: 1, armL: 0, forearmL: 0, armR: 0, forearmR: 0,
  browLY: 0, browRY: 0, browLRot: 0, browRRot: 0, pupilY: 0,
  spark1: 0, spark2: 0, spark3: 0,
  mouth: MOUTH.smile as number, hand: HAND.relaxed as number, eyes: EYES.open as number,
};
export type CharacterParts = { [K in keyof typeof REST]: SharedValue<number> };

const ease = Easing.inOut(Easing.ease);
// Reactions are answer feedback, so they play even with the phone's Reduce Motion setting on.
// The idle loop does respect that setting.
const always = ReduceMotion.Never;
type Row = [offset: number, value: number];

// Keyframe track: rows of [0..1 offset, value] spread over `duration` ms.
function track(sv: SharedValue<number>, duration: number, rows: Row[], delay = 0) {
  sv.value = rows[0][1];
  const steps = rows.slice(1).map(([o, v], i) => withTiming(v, { duration: (o - rows[i][0]) * duration, easing: ease, reduceMotion: always }));
  sv.value = withDelay(delay, withSequence(always, ...steps), always);
}

// Rotate/scale around a canvas point. Layers are full-size, so the View centre is canvas (256, 360).
type Op = { rotate: string } | { scale: number } | { scaleX: number } | { scaleY: number };
function pivot(k: number, px: number, py: number, ops: Op[]) {
  'worklet';
  const dx = (px - 256) * k, dy = (py - 360) * k;
  return [{ translateX: dx }, { translateY: dy }, ...ops, { translateX: -dx }, { translateY: -dy }];
}

const Part = ({ style, children }: { style?: any; children: React.ReactNode }) => (
  <Animated.View style={[StyleSheet.absoluteFill, styles.noTouch, style]}>{children}</Animated.View>
);

// Shows its children only while `value` equals `is` (used for mouth / hand / eye shapes).
const Swap = ({ value, is, not, children }: { value: SharedValue<number>; is?: number; not?: number; children: React.ReactNode }) => {
  const style = useAnimatedStyle(() => ({
    opacity: (is !== undefined ? value.value === is : value.value !== not) ? 1 : 0,
  }));
  return <Part style={style}>{children}</Part>;
};

const SPARKS = [
  { cx: 92, cy: 262, r: 11 }, { cx: 118, cy: 222, r: 8 }, { cx: 84, cy: 300, r: 7 },
] as const;

const Sparkle = ({ p, k, cx, cy, r }: { p: SharedValue<number>; k: number; cx: number; cy: number; r: number }) => {
  const style = useAnimatedStyle(() => {
    const v = p.value;
    const a = v <= 0 || v >= 1 ? 0 : v < 0.4 ? v / 0.4 : (1 - v) / 0.6;
    return { opacity: a, transform: pivot(k, cx, cy, [{ scale: Math.max(a * 1.2, 0.001) }, { rotate: `${v * 90}deg` }]) as any };
  });
  return <Part style={style}><Art.Sparkle cx={cx} cy={cy} r={r} /></Part>;
};

export const Character = forwardRef<CharacterHandle, CharacterProps>(function Character(
  { size = 220, talking = false, idle = true, style }, ref,
) {
  const k = size / Art.VIEW_W;

  // reaction values (exposed as `parts`)
  const parts: CharacterParts = {
    rigY: useSharedValue(REST.rigY), rigScaleX: useSharedValue(REST.rigScaleX), rigScaleY: useSharedValue(REST.rigScaleY),
    shadowScale: useSharedValue(REST.shadowScale), upperY: useSharedValue(REST.upperY),
    head: useSharedValue(REST.head), headY: useSharedValue(REST.headY), hairScaleY: useSharedValue(REST.hairScaleY),
    armL: useSharedValue(REST.armL), forearmL: useSharedValue(REST.forearmL),
    armR: useSharedValue(REST.armR), forearmR: useSharedValue(REST.forearmR),
    browLY: useSharedValue(REST.browLY), browRY: useSharedValue(REST.browRY),
    browLRot: useSharedValue(REST.browLRot), browRRot: useSharedValue(REST.browRRot),
    pupilY: useSharedValue(REST.pupilY),
    spark1: useSharedValue(REST.spark1), spark2: useSharedValue(REST.spark2), spark3: useSharedValue(REST.spark3),
    mouth: useSharedValue(REST.mouth), hand: useSharedValue(REST.hand), eyes: useSharedValue(REST.eyes),
  };
  const p = parts;

  // idle values, added on top of the reaction values so reactions never make the idle motion jump
  const iUpperY = useSharedValue(0), iHeadY = useSharedValue(0), iHeadRot = useSharedValue(0);
  const iArmL = useSharedValue(0), iRigRot = useSharedValue(0);
  const blinkY = useSharedValue(1), lookX = useSharedValue(0), lookY = useSharedValue(0);

  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finish = useRef<(() => void) | null>(null);

  // ---------- styles ----------
  const sShadow = useAnimatedStyle(() => ({ transform: pivot(k, 257, 686, [{ scale: p.shadowScale.value }]) as any }));
  const sRig = useAnimatedStyle(() => ({
    transform: [{ translateY: p.rigY.value * k },
      ...pivot(k, 257, 684, [{ rotate: `${iRigRot.value}deg` }, { scaleX: p.rigScaleX.value }, { scaleY: p.rigScaleY.value }])] as any,
  }));
  const sUpper = useAnimatedStyle(() => ({ transform: [{ translateY: (iUpperY.value + p.upperY.value) * k }] }));
  const sArmR = useAnimatedStyle(() => ({ transform: pivot(k, 334, 320, [{ rotate: `${p.armR.value}deg` }]) as any }));
  const sForearmR = useAnimatedStyle(() => ({ transform: pivot(k, 374, 378, [{ rotate: `${p.forearmR.value}deg` }]) as any }));
  const sArmL = useAnimatedStyle(() => ({ transform: pivot(k, 190, 320, [{ rotate: `${iArmL.value + p.armL.value}deg` }]) as any }));
  const sForearmL = useAnimatedStyle(() => ({ transform: pivot(k, 170, 386, [{ rotate: `${p.forearmL.value}deg` }]) as any }));
  const sHead = useAnimatedStyle(() => ({
    transform: [{ translateY: (iHeadY.value + p.headY.value) * k },
      ...pivot(k, 255, 268, [{ rotate: `${iHeadRot.value + p.head.value}deg` }])] as any,
  }));
  const sHair = useAnimatedStyle(() => ({ transform: pivot(k, 255, 130, [{ scaleY: p.hairScaleY.value }]) as any }));
  const sEyes = useAnimatedStyle(() => ({ transform: pivot(k, 254, 190, [{ scaleY: blinkY.value }]) as any }));
  const sPupils = useAnimatedStyle(() => ({
    transform: [{ translateX: lookX.value * k }, { translateY: (lookY.value + p.pupilY.value) * k }],
  }));
  const sBrowL = useAnimatedStyle(() => ({
    transform: [{ translateY: p.browLY.value * k }, ...pivot(k, 219, 154, [{ rotate: `${p.browLRot.value}deg` }])] as any,
  }));
  const sBrowR = useAnimatedStyle(() => ({
    transform: [{ translateY: p.browRY.value * k }, ...pivot(k, 289, 154, [{ rotate: `${p.browRRot.value}deg` }])] as any,
  }));

  // ---------- control ----------
  const blink = () => {
    blinkY.value = withSequence(always, withTiming(0.1, { duration: 70, reduceMotion: always }), withTiming(1, { duration: 90, reduceMotion: always }));
  };

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (const key of Object.keys(REST) as (keyof typeof REST)[]) {
      cancelAnimation(p[key]);
      p[key].value = REST[key];
    }
    busy.current = false;
    finish.current?.();
    finish.current = null;
  };

  const play = (reaction: Reaction) => {
    stop();
    busy.current = true;
    const { duration, cues } = REACTIONS[reaction](p);
    const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    cues.forEach(([ms, fn]) => later(ms, fn));
    return new Promise<void>(resolve => {
      finish.current = resolve;
      later(duration, stop);
    });
  };

  useImperativeHandle(ref, () => ({ play, stop, blink, parts }));

  // stop timers when the component goes away
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // ---------- idle loop ----------
  useEffect(() => {
    if (!idle) return;
    const loops: [SharedValue<number>, number, number, number, number][] = [
      [iUpperY, 0, -2, 2400, 0],      // breathing
      [iHeadY, 0, 1.5, 2400, 300],    // head follows the chest a beat later
      [iHeadRot, -0.8, 0.8, 4100, 0], // slow head sway
      [iArmL, 0, 1.6, 2400, 200],     // loose arm swings a little
      [iRigRot, -0.4, 0.4, 5300, 0],  // weight shift
    ];
    for (const [sv, from, to, duration, delay] of loops) {
      sv.value = from;
      sv.value = withDelay(delay, withRepeat(withTiming(to, { duration, easing: ease }), -1, true));
    }
    const t: ReturnType<typeof setTimeout>[] = [];
    const blinkLoop = () => t.push(setTimeout(() => {
      blink();
      if (Math.random() < 0.2) t.push(setTimeout(blink, 260)); // occasional double blink
      blinkLoop();
    }, 2000 + Math.random() * 3500));
    const glanceLoop = () => t.push(setTimeout(() => {
      lookX.value = withTiming((Math.random() * 2 - 1) * 5, { duration: 180 });
      lookY.value = withTiming((Math.random() * 2 - 1) * 2, { duration: 180 });
      t.push(setTimeout(() => {
        lookX.value = withTiming(0, { duration: 180 });
        lookY.value = withTiming(0, { duration: 180 });
      }, 900));
      glanceLoop();
    }, 3000 + Math.random() * 4000));
    blinkLoop();
    glanceLoop();
    return () => {
      t.forEach(clearTimeout);
      for (const [sv] of loops) { cancelAnimation(sv); sv.value = 0; }
    };
  }, [idle]);

  // ---------- talking ----------
  useEffect(() => {
    if (!talking) {
      if (!busy.current) p.mouth.value = MOUTH.smile;
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    let last = -1;
    const shapes = [MOUTH.open, MOUTH.mid, MOUTH.smile];
    const step = () => {
      if (!busy.current) { // a reaction owns the face while it plays
        let s: number;
        do { s = shapes[Math.floor(Math.random() * shapes.length)]; } while (s === last);
        p.mouth.value = last = s;
      }
      t = setTimeout(step, 90 + Math.random() * 90);
    };
    step();
    return () => {
      clearTimeout(t);
      if (!busy.current) p.mouth.value = MOUTH.smile;
    };
  }, [talking]);

  // ---------- drawing (back to front) ----------
  return (
    <View style={[{ width: size, height: size * (Art.VIEW_H / Art.VIEW_W) }, styles.noTouch, style]}>
      <Part style={sShadow}><Art.Shadow /></Part>
      <Part style={sRig}>
        <Art.Legs />
        <Part style={sUpper}>
          <Art.Torso />
          <Part style={sArmR}>
            <Art.ArmRUpper />
            <Part style={sForearmR}><Art.ForearmR /></Part>
          </Part>
          <Part style={sArmL}>
            <Art.ArmLUpper />
            <Part style={sForearmL}>
              <Art.ForearmL />
              <Swap value={p.hand} is={HAND.relaxed}><Art.HandRelaxed /></Swap>
              <Swap value={p.hand} is={HAND.thumb}><Art.HandThumb /></Swap>
              <Swap value={p.hand} is={HAND.open}><Art.HandOpen /></Swap>
              <Art.CuffL />
            </Part>
          </Part>
          <Part style={sHead}>
            <Art.HeadBase />
            <Swap value={p.mouth} is={MOUTH.smile}><Art.MouthSmile /></Swap>
            <Swap value={p.mouth} is={MOUTH.grin}><Art.MouthGrin /></Swap>
            <Swap value={p.mouth} is={MOUTH.open}><Art.MouthOpen /></Swap>
            <Swap value={p.mouth} is={MOUTH.mid}><Art.MouthMid /></Swap>
            <Swap value={p.mouth} is={MOUTH.sad}><Art.MouthSad /></Swap>
            <Swap value={p.eyes} not={EYES.happy}>
              <Part style={sEyes}>
                <Art.EyeWhites />
                <Part style={sPupils}><Art.Pupils /></Part>
                <Swap value={p.eyes} is={EYES.sad}><Art.SadLids /></Swap>
                <Art.EyeOutlines />
              </Part>
            </Swap>
            <Swap value={p.eyes} is={EYES.happy}><Art.EyesHappy /></Swap>
            <Part style={sBrowL}><Art.BrowL /></Part>
            <Part style={sBrowR}><Art.BrowR /></Part>
            <Part style={sHair}><Art.Hair /></Part>
          </Part>
        </Part>
        <Sparkle p={p.spark1} k={k} {...SPARKS[0]} />
        <Sparkle p={p.spark2} k={k} {...SPARKS[1]} />
        <Sparkle p={p.spark3} k={k} {...SPARKS[2]} />
      </Part>
    </View>
  );
});

// ---------- reactions ----------
// Each one starts its tracks and returns its total length plus [ms, fn] cues for face / hand swaps.
type Built = { duration: number; cues: [number, () => void][] };

const REACTIONS: Record<Reaction, (p: CharacterParts) => Built> = {
  // Thumbs up with a hop and sparkles.
  correct: p => {
    const d = 2000;
    // squash, jump, land, settle
    track(p.rigY, d, [[0, 0], [0.08, 0], [0.19, -24], [0.3, 0], [1, 0]]);
    track(p.rigScaleX, d, [[0, 1], [0.08, 1.03], [0.19, 0.97], [0.3, 1.04], [0.38, 1], [1, 1]]);
    track(p.rigScaleY, d, [[0, 1], [0.08, 0.95], [0.19, 1.04], [0.3, 0.95], [0.38, 1], [1, 1]]);
    track(p.shadowScale, d, [[0, 1], [0.08, 1.03], [0.19, 0.8], [0.3, 1.04], [0.38, 1], [1, 1]]);
    track(p.hairScaleY, d, [[0, 1], [0.19, 1.03], [0.3, 0.95], [0.4, 1], [1, 1]]);
    // arm swings back a touch, up past the pose, settles, then two small pumps (40 + 130 = forearm upright)
    track(p.armL, d, [[0, 0], [0.08, -6], [0.27, 45], [0.35, 40], [0.8, 40], [1, 0]]);
    track(p.forearmL, d, [[0, 0], [0.08, 0], [0.27, 139], [0.35, 130], [0.45, 122], [0.53, 130], [0.61, 123], [0.69, 130], [0.8, 130], [1, 0]]);
    track(p.head, d, [[0, 0], [0.3, 4], [0.8, 4], [1, 0]]);
    for (const b of [p.browLY, p.browRY]) track(b, d, [[0, 0], [0.2, -5], [0.8, -5], [1, 0]]);
    [p.spark1, p.spark2, p.spark3].forEach((s, i) => track(s, 650, [[0, 0], [1, 1]], 650 + i * 130));
    return {
      duration: d,
      cues: [
        [0, () => { p.mouth.value = MOUTH.grin; }],
        [300, () => { p.hand.value = HAND.thumb; }],
        [420, () => { p.eyes.value = EYES.happy; }],
        [1650, () => { p.eyes.value = EYES.open; }],
        [1800, () => { p.hand.value = HAND.relaxed; }],
      ],
    };
  },

  // Head shake, then a sad droop.
  wrong: p => {
    const d = 1900;
    const hold = (v: number): Row[] => [[0, 0], [0.1, v], [0.85, v], [1, 0]];
    track(p.head, d, [[0, 0], [0.1, -9], [0.22, 9], [0.34, -7], [0.46, 6], [0.56, 0], [1, 0]]);
    track(p.headY, d, [[0, 0], [0.1, 4], [0.46, 4], [0.56, 5], [0.85, 5], [1, 0]]);
    track(p.upperY, d, hold(3));
    track(p.browLY, d, hold(2));
    track(p.browRY, d, hold(2));
    track(p.browLRot, d, hold(-14));
    track(p.browRRot, d, hold(14));
    track(p.pupilY, d, hold(4));
    return {
      duration: d,
      cues: [
        [0, () => { p.mouth.value = MOUTH.sad; }],
        [120, () => { p.eyes.value = EYES.sad; }],
        [1700, () => { p.eyes.value = EYES.open; }],
      ],
    };
  },

  // Friendly hello.
  wave: p => {
    const d = 2100;
    track(p.armL, d, [[0, 0], [0.06, -5], [0.22, 45], [0.82, 45], [1, 0]]);
    track(p.forearmL, d, [[0, 0], [0.06, 0], [0.22, 126], [0.32, 142], [0.42, 112], [0.52, 142], [0.62, 112], [0.72, 140], [0.82, 126], [1, 0]]);
    track(p.head, d, [[0, 0], [0.22, -3], [0.82, -3], [1, 0]]);
    for (const b of [p.browLY, p.browRY]) track(b, d, [[0, 0], [0.2, -4], [0.82, -4], [1, 0]]);
    return {
      duration: d,
      cues: [
        [0, () => { p.mouth.value = MOUTH.grin; }],
        [260, () => { p.hand.value = HAND.open; }],
        [1900, () => { p.hand.value = HAND.relaxed; }],
      ],
    };
  },
};

const styles = StyleSheet.create({ noTouch: { pointerEvents: 'none' } });

export default Character;
