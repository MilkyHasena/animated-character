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
import { mouthBeats } from './speech';
import * as WomanArt from './art-woman';

export type Reaction = 'correct' | 'wrong' | 'wave' | 'highFive' | 'clap' | 'impatient';
export type Variant = 'man' | 'woman';

export type CharacterProps = {
  /** Which character to show. Both have the same animations and API. Default 'man'. */
  variant?: Variant;
  /** Width in points. Height is size * 1.406. Default 220. */
  size?: number;
  /** While true the mouth flaps continuously. For speech with known text, use say() instead: it moves once per syllable. */
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
  /**
   * Moves the mouth to match `text`: one opening per syllable, short pauses between words. Pass the audio
   * length as `duration` (ms) to spread it over the clip. Resolves when done; a new say() (or say('')) cancels it.
   */
  say(text: string, options?: { duration?: number }): Promise<void>;
  /** Raw animation values for custom moves (see README). */
  parts: CharacterParts;
};

// Expression values used by `mouth`, `hand` and `eyes`.
export const MOUTH = { smile: 0, grin: 1, open: 2, mid: 3, sad: 4, flat: 5 } as const;
export const HAND = { relaxed: 0, thumb: 1, open: 2, clap: 3 } as const;
export const EYES = { open: 0, happy: 1, sad: 2 } as const;

// Reaction-controlled values with their resting value. Angles in degrees, distances in canvas units.
const REST = {
  rigY: 0, rigScaleX: 1, rigScaleY: 1, shadowScale: 1, upperY: 0,
  head: 0, headY: 0, hairScaleY: 1, armL: 0, forearmL: 0, armLScale: 1, armR: 0, forearmR: 0,
  browLY: 0, browRY: 0, browLRot: 0, browRRot: 0, pupilY: 0,
  spark1: 0, spark2: 0, spark3: 0,
  mouth: MOUTH.smile as number, hand: HAND.relaxed as number, handR: HAND.relaxed as number, eyes: EYES.open as number,
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
  shoulderL: XY; elbowL: XY; axis: number; neck: XY; hair: XY; eyes: XY; browL: XY; browR: XY;
  sparks: { cx: number; cy: number; r: number }[];
};
const RIGS: Record<Variant, Rig> = {
  man: {
    shoulderL: [190, 320], elbowL: [170, 386], axis: 255,
    neck: [255, 268], hair: [255, 130], eyes: [254, 190], browL: [219, 154], browR: [289, 154],
    sparks: [{ cx: 92, cy: 262, r: 11 }, { cx: 118, cy: 222, r: 8 }, { cx: 84, cy: 300, r: 7 }],
  },
  woman: {
    shoulderL: [196, 350], elbowL: [172, 410], axis: 256,
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
    armLScale: useSharedValue(REST.armLScale), armR: useSharedValue(REST.armR), forearmR: useSharedValue(REST.forearmR),
    browLY: useSharedValue(REST.browLY), browRY: useSharedValue(REST.browRY),
    browLRot: useSharedValue(REST.browLRot), browRRot: useSharedValue(REST.browRRot),
    pupilY: useSharedValue(REST.pupilY),
    spark1: useSharedValue(REST.spark1), spark2: useSharedValue(REST.spark2), spark3: useSharedValue(REST.spark3),
    mouth: useSharedValue(REST.mouth), hand: useSharedValue(REST.hand), handR: useSharedValue(REST.handR), eyes: useSharedValue(REST.eyes),
  };
  const p = parts;

  // idle values, added on top of the reaction values so reactions never make the idle motion jump
  const iUpperY = useSharedValue(0), iHeadY = useSharedValue(0), iHeadRot = useSharedValue(0);
  const iArmL = useSharedValue(0), iArmR = useSharedValue(0), iRigRot = useSharedValue(0);
  const blinkY = useSharedValue(1), lookX = useSharedValue(0), lookY = useSharedValue(0);

  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finish = useRef<(() => void) | null>(null);
  const speech = useRef<{ timers: ReturnType<typeof setTimeout>[]; done: () => void }>({ timers: [], done: () => {} });

  // ---------- styles ----------
  const sShadow = useAnimatedStyle(() => ({ transform: pivot(k, 257, 686, [{ scale: p.shadowScale.value }]) as any }));
  const sRig = useAnimatedStyle(() => ({
    transform: [{ translateY: p.rigY.value * k },
      ...pivot(k, 257, 684, [{ rotate: `${iRigRot.value}deg` }, { scaleX: p.rigScaleX.value }, { scaleY: p.rigScaleY.value }])] as any,
  }));
  const sUpper = useAnimatedStyle(() => ({ transform: [{ translateY: (iUpperY.value + p.upperY.value) * k }] }));
  // The right arm reuses the left arm's drawings and joints inside a mirrored view; positive angles move it outward.
  const mirror = { transform: pivot(k, rig.axis, 360, [{ scaleX: -1 }]) as any };
  const sArmR = useAnimatedStyle(() => ({ transform: pivot(k, rig.shoulderL[0], rig.shoulderL[1], [{ rotate: `${iArmR.value + p.armR.value}deg` }]) as any }));
  const sForearmR = useAnimatedStyle(() => ({ transform: pivot(k, rig.elbowL[0], rig.elbowL[1], [{ rotate: `${p.forearmR.value}deg` }]) as any }));
  const sArmL = useAnimatedStyle(() => ({ transform: pivot(k, rig.shoulderL[0], rig.shoulderL[1], [{ rotate: `${iArmL.value + p.armL.value}deg` }, { scale: p.armLScale.value }]) as any }));
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

  const say = (text: string, { duration }: { duration?: number } = {}) => {
    speech.current.timers.forEach(clearTimeout);
    speech.current.done();
    const { beats, total } = mouthBeats(text, duration);
    let syllable = 0;
    const mouth = (open: boolean) => {
      if (busy.current) return; // a reaction owns the face while it plays
      p.mouth.value = !open ? MOUTH.smile : syllable++ % 3 === 2 ? MOUTH.mid : MOUTH.open;
    };
    return new Promise<void>(resolve => {
      speech.current = {
        timers: beats.map(b => setTimeout(() => mouth(b.open), b.at)),
        done: () => { speech.current.done = () => {}; resolve(); },
      };
      speech.current.timers.push(setTimeout(() => { mouth(false); speech.current.done(); }, total));
    });
  };

  useImperativeHandle(ref, () => ({ play, stop, blink, say, parts }));

  // stop timers when the component goes away
  useEffect(() => () => { timers.current.forEach(clearTimeout); speech.current.timers.forEach(clearTimeout); }, []);

  // ---------- idle loop ----------
  useEffect(() => {
    if (!idle) return;
    const loops: [SharedValue<number>, number, number, number, number][] = [
      [iUpperY, 0, -2, 2400, 0],      // breathing
      [iHeadY, 0, 1.5, 2400, 300],    // head follows the chest a beat later
      [iHeadRot, -0.8, 0.8, 4100, 0], // slow head sway
      [iArmL, 0, 1.6, 2400, 200],     // loose arms swing a little
      [iArmR, 0, 1.6, 2600, 900],
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
          <Part style={mirror}>
            <Part style={sArmR}>
              <A.ArmLUpper />
              <Part style={sForearmR}>
                <A.ForearmL />
                <Swap value={p.handR} is={HAND.relaxed}><A.HandRelaxed /></Swap>
                <Swap value={p.handR} is={HAND.clap}><A.HandClap /></Swap>
                <A.CuffL />
              </Part>
            </Part>
          </Part>
          <Part style={sHead}>
            <A.HeadBase />
            <Swap value={p.mouth} is={MOUTH.smile}><A.MouthSmile /></Swap>
            <Swap value={p.mouth} is={MOUTH.grin}><A.MouthGrin /></Swap>
            <Swap value={p.mouth} is={MOUTH.open}><A.MouthOpen /></Swap>
            <Swap value={p.mouth} is={MOUTH.mid}><A.MouthMid /></Swap>
            <Swap value={p.mouth} is={MOUTH.sad}><A.MouthSad /></Swap>
            <Swap value={p.mouth} is={MOUTH.flat}><A.MouthFlat /></Swap>
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
              <Swap value={p.hand} is={HAND.clap}><A.HandClap /></Swap>
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
type BaseSet = Pick<ReactionSet, 'correct' | 'wrong' | 'wave'>;

const MAN: BaseSet = {
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
const WOMAN: BaseSet = {
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

// Arm angles that differ per character, because their shoulders and heads differ.
type Angles = { raise: number; raiseFore: number; clapOpen: number; clapShut: number; clapFore: number; hip: number; hipFore: number };

const shared = (a: Angles): Pick<ReactionSet, 'highFive' | 'clap' | 'impatient'> => ({
  // Raises an open palm to the user, pushes it toward them (the "slap"), then lowers it.
  highFive: p => {
    const d = 1900;
    track(p.armL, d, [[0, 0], [0.06, -5], [0.22, a.raise], [0.72, a.raise], [1, 0]]);
    track(p.forearmL, d, [[0, 0], [0.06, 0], [0.22, a.raiseFore], [0.72, a.raiseFore], [1, 0]]);
    track(p.armLScale, d, [[0, 1], [0.3, 1], [0.37, 1.2], [0.46, 1], [1, 1]]);
    track(p.headY, d, [[0, 0], [0.3, 0], [0.37, 3], [0.5, 0], [1, 0]]);
    for (const b of [p.browLY, p.browRY]) track(b, d, [[0, 0], [0.2, -5], [0.75, -5], [1, 0]]);
    [p.spark1, p.spark2, p.spark3].forEach((s, i) => track(s, 600, [[0, 0], [1, 1]], 690 + i * 60));
    return {
      duration: d,
      cues: [
        [0, () => { p.mouth.value = MOUTH.grin; }],
        [200, () => { p.hand.value = HAND.open; }],
        [700, () => { p.eyes.value = EYES.happy; }],
        [1400, () => { p.eyes.value = EYES.open; }],
        [1700, () => { p.hand.value = HAND.relaxed; }],
      ],
    };
  },

  // Four quick claps in front of the chest with a happy face.
  clap: p => {
    const d = 2300;
    const o = a.clapOpen, c = a.clapShut;
    const arm: Row[] = [[0, 0], [0.12, o], [0.2, c], [0.28, o], [0.36, c], [0.44, o], [0.52, c], [0.6, o], [0.68, c], [0.8, c], [1, 0]];
    const fore: Row[] = [[0, 0], [0.12, a.clapFore], [0.8, a.clapFore], [1, 0]];
    track(p.armL, d, arm); track(p.armR, d, arm);
    track(p.forearmL, d, fore); track(p.forearmR, d, fore);
    // a little bounce on every clap
    track(p.upperY, d, [[0, 0], [0.2, 2], [0.28, 0], [0.36, 2], [0.44, 0], [0.52, 2], [0.6, 0], [0.68, 2], [0.8, 0], [1, 0]]);
    track(p.head, d, [[0, 0], [0.15, 3], [0.8, 3], [1, 0]]);
    for (const b of [p.browLY, p.browRY]) track(b, d, [[0, 0], [0.15, -5], [0.8, -5], [1, 0]]);
    return {
      duration: d,
      cues: [
        [0, () => { p.mouth.value = MOUTH.grin; }],
        [180, () => { p.hand.value = HAND.clap; p.handR.value = HAND.clap; }],
        [300, () => { p.eyes.value = EYES.happy; }],
        [1850, () => { p.eyes.value = EYES.open; }],
        [2000, () => { p.hand.value = HAND.relaxed; p.handR.value = HAND.relaxed; }],
      ],
    };
  },

  // Waiting for an answer: hand on hip, one eyebrow up, flat mouth, head tilt.
  impatient: p => {
    const d = 2800;
    const hold = (v: number): Row[] => [[0, 0], [0.15, v], [0.82, v], [1, 0]];
    track(p.armR, d, hold(a.hip));
    track(p.forearmR, d, hold(a.hipFore));
    track(p.head, d, [[0, 0], [0.2, -5], [0.5, -6], [0.82, -5], [1, 0]]);
    track(p.browRY, d, hold(-7));
    track(p.browLY, d, hold(1));
    track(p.browLRot, d, hold(-4));
    return {
      duration: d,
      cues: [
        [150, () => { p.mouth.value = MOUTH.flat; }],
        [300, () => { p.eyes.value = EYES.sad; }],
        [2300, () => { p.eyes.value = EYES.open; }],
      ],
    };
  },
});

const REACTIONS: Record<Variant, ReactionSet> = {
  man: { ...MAN, ...shared({ raise: 40, raiseFore: 130, clapOpen: -12, clapShut: -22, clapFore: -75, hip: 20, hipFore: -52 }) },
  woman: { ...WOMAN, ...shared({ raise: 52, raiseFore: 116, clapOpen: -10, clapShut: -20, clapFore: -75, hip: 20, hipFore: -50 }) },
};

const styles = StyleSheet.create({ noTouch: { pointerEvents: 'none' } });

export default Character;
