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
import * as WomanArt from './art-woman';

export type Reaction = 'correct' | 'wrong' | 'wave';
export type Variant = 'man' | 'woman';

export type CharacterProps = {
  /** Which character to show. Both have the same animations and API. Default 'man'. */
  variant?: Variant;
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

// The drawings for each character. Both files export the same layer names.
const ART: Record<Variant, typeof WomanArt> = { man: Art, woman: WomanArt };

// Joint pivots and sparkle spots for each character, in canvas units.
type XY = [x: number, y: number];
type Rig = {
  shoulderL: XY; elbowL: XY; shoulderR: XY; elbowR: XY; neck: XY; hair: XY; eyes: XY; browL: XY; browR: XY;
  sparks: { cx: number; cy: number; r: number }[];
};
const RIGS: Record<Variant, Rig> = {
  man: {
    shoulderL: [190, 320], elbowL: [170, 386], shoulderR: [334, 320], elbowR: [374, 378],
    neck: [255, 268], hair: [255, 130], eyes: [254, 190], browL: [219, 154], browR: [289, 154],
    sparks: [{ cx: 92, cy: 262, r: 11 }, { cx: 118, cy: 222, r: 8 }, { cx: 84, cy: 300, r: 7 }],
  },
  woman: {
    shoulderL: [196, 350], elbowL: [172, 410], shoulderR: [316, 350], elbowR: [370, 404],
    neck: [256, 318], hair: [256, 150], eyes: [256, 241], browL: [220, 205], browR: [292, 205],
    sparks: [{ cx: 94, cy: 286, r: 11 }, { cx: 120, cy: 246, r: 8 }, { cx: 86, cy: 324, r: 7 }],
  },
};

const Sparkle = ({ p, k, cx, cy, r }: { p: SharedValue<number>; k: number; cx: number; cy: number; r: number }) => {
  const style = useAnimatedStyle(() => {
    const v = p.value;
    const a = v <= 0 || v >= 1 ? 0 : v < 0.4 ? v / 0.4 : (1 - v) / 0.6;
    return { opacity: a, transform: pivot(k, cx, cy, [{ scale: Math.max(a * 1.2, 0.001) }, { rotate: `${v * 90}deg` }]) as any };
  });
  return <Part style={style}><Art.Sparkle cx={cx} cy={cy} r={r} /></Part>;
};

export const Character = forwardRef<CharacterHandle, CharacterProps>(function Character(
  { variant = 'man', size = 220, talking = false, idle = true, style }, ref,
) {
  const k = size / Art.VIEW_W;
  const A = ART[variant];
  const rig = RIGS[variant];

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
  const sArmR = useAnimatedStyle(() => ({ transform: pivot(k, rig.shoulderR[0], rig.shoulderR[1], [{ rotate: `${p.armR.value}deg` }]) as any }));
  const sForearmR = useAnimatedStyle(() => ({ transform: pivot(k, rig.elbowR[0], rig.elbowR[1], [{ rotate: `${p.forearmR.value}deg` }]) as any }));
  const sArmL = useAnimatedStyle(() => ({ transform: pivot(k, rig.shoulderL[0], rig.shoulderL[1], [{ rotate: `${iArmL.value + p.armL.value}deg` }]) as any }));
  const sForearmL = useAnimatedStyle(() => ({ transform: pivot(k, rig.elbowL[0], rig.elbowL[1], [{ rotate: `${p.forearmL.value}deg` }]) as any }));
  const sHead = useAnimatedStyle(() => ({
    transform: [{ translateY: (iHeadY.value + p.headY.value) * k },
      ...pivot(k, rig.neck[0], rig.neck[1], [{ rotate: `${iHeadRot.value + p.head.value}deg` }])] as any,
  }));
  const sHair = useAnimatedStyle(() => ({ transform: pivot(k, rig.hair[0], rig.hair[1], [{ scaleY: p.hairScaleY.value }]) as any }));
  const sEyes = useAnimatedStyle(() => ({ transform: pivot(k, rig.eyes[0], rig.eyes[1], [{ scaleY: blinkY.value }]) as any }));
  const sPupils = useAnimatedStyle(() => ({
    transform: [{ translateX: lookX.value * k }, { translateY: (lookY.value + p.pupilY.value) * k }],
  }));
  const sBrowL = useAnimatedStyle(() => ({
    transform: [{ translateY: p.browLY.value * k }, ...pivot(k, rig.browL[0], rig.browL[1], [{ rotate: `${p.browLRot.value}deg` }])] as any,
  }));
  const sBrowR = useAnimatedStyle(() => ({
    transform: [{ translateY: p.browRY.value * k }, ...pivot(k, rig.browR[0], rig.browR[1], [{ rotate: `${p.browRRot.value}deg` }])] as any,
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
    const { duration, cues } = REACTIONS[variant][reaction](p);
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
        <A.Legs />
        <Part style={sUpper}>
          <A.Torso />
          <Part style={sArmR}>
            <A.ArmRUpper />
            <Part style={sForearmR}><A.ForearmR /></Part>
          </Part>
          <Part style={sHead}>
            <A.HeadBase />
            <Swap value={p.mouth} is={MOUTH.smile}><A.MouthSmile /></Swap>
            <Swap value={p.mouth} is={MOUTH.grin}><A.MouthGrin /></Swap>
            <Swap value={p.mouth} is={MOUTH.open}><A.MouthOpen /></Swap>
            <Swap value={p.mouth} is={MOUTH.mid}><A.MouthMid /></Swap>
            <Swap value={p.mouth} is={MOUTH.sad}><A.MouthSad /></Swap>
            <Swap value={p.eyes} not={EYES.happy}>
              <Part style={sEyes}>
                <A.EyeWhites />
                <Part style={sPupils}><A.Pupils /></Part>
                <Swap value={p.eyes} is={EYES.sad}><A.SadLids /></Swap>
                <A.EyeOutlines />
              </Part>
            </Swap>
            <Swap value={p.eyes} is={EYES.happy}><A.EyesHappy /></Swap>
            <Part style={sBrowL}><A.BrowL /></Part>
            <Part style={sBrowR}><A.BrowR /></Part>
            <Part style={sHair}><A.Hair /></Part>
          </Part>
          {/* the free arm is drawn after the head, so a raised hand passes in front of the face, never behind it */}
          <Part style={sArmL}>
            <A.ArmLUpper />
            <Part style={sForearmL}>
              <A.ForearmL />
              <Swap value={p.hand} is={HAND.relaxed}><A.HandRelaxed /></Swap>
              <Swap value={p.hand} is={HAND.thumb}><A.HandThumb /></Swap>
              <Swap value={p.hand} is={HAND.open}><A.HandOpen /></Swap>
              <A.CuffL />
            </Part>
          </Part>
        </Part>
        <Sparkle p={p.spark1} k={k} {...rig.sparks[0]} />
        <Sparkle p={p.spark2} k={k} {...rig.sparks[1]} />
        <Sparkle p={p.spark3} k={k} {...rig.sparks[2]} />
      </Part>
    </View>
  );
});

// ---------- reactions ----------
// Each one starts its tracks and returns its total length plus [ms, fn] cues for face / hand swaps.
type Built = { duration: number; cues: [number, () => void][] };

type ReactionSet = Record<Reaction, (p: CharacterParts) => Built>;

const MAN: ReactionSet = {
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
    track(p.head, d, [[0, 0], [0.22, 3], [0.82, 3], [1, 0]]); // tilt away from the waving hand
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

// Same three reactions with her own, bouncier timing: a double hop, a springy hair puff, a quicker wave.
const WOMAN: ReactionSet = {
  correct: p => {
    const d = 2100;
    // big hop, then a small second one
    track(p.rigY, d, [[0, 0], [0.07, 0], [0.17, -34], [0.27, 0], [0.36, -14], [0.45, 0], [1, 0]]);
    track(p.rigScaleX, d, [[0, 1], [0.07, 1.04], [0.17, 0.96], [0.27, 1.05], [0.32, 1], [0.36, 0.98], [0.45, 1.03], [0.52, 1], [1, 1]]);
    track(p.rigScaleY, d, [[0, 1], [0.07, 0.93], [0.17, 1.05], [0.27, 0.94], [0.32, 1], [0.36, 1.02], [0.45, 0.96], [0.52, 1], [1, 1]]);
    track(p.shadowScale, d, [[0, 1], [0.07, 1.04], [0.17, 0.75], [0.27, 1.05], [0.36, 0.88], [0.45, 1.03], [0.52, 1], [1, 1]]);
    // the puff stretches in the air, squashes on landing and wobbles to rest
    track(p.hairScaleY, d, [[0, 1], [0.07, 0.94], [0.17, 1.1], [0.27, 0.86], [0.36, 1.07], [0.45, 0.9], [0.53, 1.04], [0.6, 0.98], [0.66, 1], [1, 1]]);
    track(p.armL, d, [[0, 0], [0.07, -8], [0.24, 55], [0.32, 52], [0.82, 52], [1, 0]]);
    track(p.forearmL, d, [[0, 0], [0.07, 0], [0.24, 121], [0.32, 116], [0.42, 107], [0.5, 116], [0.58, 108], [0.66, 116], [0.82, 116], [1, 0]]);
    track(p.head, d, [[0, 0], [0.27, 6], [0.45, 3], [0.6, 6], [0.82, 5], [1, 0]]);
    for (const b of [p.browLY, p.browRY]) track(b, d, [[0, 0], [0.2, -6], [0.82, -6], [1, 0]]);
    [p.spark1, p.spark2, p.spark3].forEach((s, i) => track(s, 650, [[0, 0], [1, 1]], 600 + i * 130));
    return {
      duration: d,
      cues: [
        [0, () => { p.mouth.value = MOUTH.grin; }],
        [280, () => { p.hand.value = HAND.thumb; }],
        [400, () => { p.eyes.value = EYES.happy; }],
        [1750, () => { p.eyes.value = EYES.open; }],
        [1900, () => { p.hand.value = HAND.relaxed; }],
      ],
    };
  },

  // Slower shake, head tips to one side, then a small sigh.
  wrong: p => {
    const d = 2000;
    const hold = (v: number): Row[] => [[0, 0], [0.12, v], [0.85, v], [1, 0]];
    track(p.head, d, [[0, 0], [0.12, -8], [0.28, 8], [0.42, -5], [0.54, 3], [0.85, 3], [1, 0]]);
    track(p.headY, d, hold(6));
    track(p.upperY, d, [[0, 0], [0.12, 4], [0.55, 4], [0.65, 1], [0.78, 5], [0.88, 5], [1, 0]]);
    track(p.hairScaleY, d, [[0, 1], [0.15, 0.95], [0.85, 0.95], [1, 1]]);
    track(p.browLY, d, hold(2));
    track(p.browRY, d, hold(2));
    track(p.browLRot, d, hold(-14));
    track(p.browRRot, d, hold(14));
    track(p.pupilY, d, hold(4));
    return {
      duration: d,
      cues: [
        [0, () => { p.mouth.value = MOUTH.sad; }],
        [140, () => { p.eyes.value = EYES.sad; }],
        [1800, () => { p.eyes.value = EYES.open; }],
      ],
    };
  },

  // Quick, excited wave with a bounce on her toes.
  wave: p => {
    const d = 2200;
    track(p.armL, d, [[0, 0], [0.05, -5], [0.18, 56], [0.84, 56], [1, 0]]);
    track(p.forearmL, d, [[0, 0], [0.05, 0], [0.18, 104], [0.26, 113], [0.34, 90], [0.42, 113], [0.5, 90], [0.58, 113], [0.66, 90], [0.74, 111], [0.84, 104], [1, 0]]);
    track(p.head, d, [[0, 0], [0.18, 4], [0.5, 2], [0.84, 4], [1, 0]]);
    track(p.rigY, d, [[0, 0], [0.18, 0], [0.26, -5], [0.34, 0], [0.42, -5], [0.5, 0], [0.58, -5], [0.66, 0], [1, 0]]);
    track(p.hairScaleY, d, [[0, 1], [0.26, 1.04], [0.34, 0.96], [0.42, 1.04], [0.5, 0.96], [0.58, 1.04], [0.66, 0.97], [0.74, 1], [1, 1]]);
    for (const b of [p.browLY, p.browRY]) track(b, d, [[0, 0], [0.2, -5], [0.84, -5], [1, 0]]);
    return {
      duration: d,
      cues: [
        [0, () => { p.mouth.value = MOUTH.grin; }],
        [240, () => { p.hand.value = HAND.open; }],
        [2000, () => { p.hand.value = HAND.relaxed; }],
      ],
    };
  },
};

const REACTIONS: Record<Variant, ReactionSet> = { man: MAN, woman: WOMAN };

const styles = StyleSheet.create({ noTouch: { pointerEvents: 'none' } });

export default Character;
