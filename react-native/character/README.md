# Animated character (React Native)

An animated mascot built from SVG. It has a subtle idle loop that runs on its own (breathing, sway, blinks, glances), a talking mouth, and three reactions: **correct** (thumbs-up and a hop), **wrong** (head shake and a sad face) and **wave**.

It's plain React Native code with no WebView and no image files. All motion runs on the UI thread through Reanimated.

## 1. Install the two dependencies

**Expo** (managed or dev client):
```bash
npx expo install react-native-svg react-native-reanimated
```
Expo's Babel preset already configures Reanimated, so there's nothing else to set up.

**Bare React Native:**
```bash
npm install react-native-svg react-native-reanimated
cd ios && pod install
```
Then add the Babel plugin as the **last** entry in `babel.config.js`:
- Reanimated 3.x: `plugins: ['react-native-reanimated/plugin']`
- Reanimated 4.x: also run `npm install react-native-worklets`, then use `plugins: ['react-native-worklets/plugin']`

Restart Metro with a clean cache afterwards: `npx react-native start --reset-cache` (or `npx expo start -c`).

Supported versions: react-native-svg 13+ and react-native-reanimated 3.5+ (including 4.x).

## 2. Copy the folder

Copy this whole `character/` folder into the app, for example to `src/components/character/`. It has three files:

| File | What it is |
|---|---|
| `Character.tsx` | The component. This is the only file you import from. |
| `art.tsx` | The drawings. You shouldn't need to edit it. |
| `ExampleScreen.tsx` | A demo screen with buttons and a quiz. Optional; delete it once you've seen it work. |

## 3. Use it

```tsx
import { useRef, useState } from 'react';
import { Character, CharacterHandle } from './components/character/Character';

function LessonScreen() {
  const character = useRef<CharacterHandle>(null);
  const [speaking, setSpeaking] = useState(false);

  async function onAnswer(isCorrect: boolean) {
    await character.current?.play(isCorrect ? 'correct' : 'wrong');
    // runs after the reaction has finished, e.g. go to the next question
  }

  return <Character ref={character} size={200} talking={speaking} />;
}
```

## Animation states

| State | How to trigger | Length | When to use |
|---|---|---|---|
| **Idle** | Always on (turn it off with `idle={false}`) | loops | Default. Subtle breathing, sway, random blinks and glances. |
| **Talking** | `talking={true}` / `talking={false}` | while true | While the character "speaks", e.g. while your audio or text-to-speech plays. |
| **Correct** | `ref.current.play('correct')` | 2.0 s | The user answered correctly. |
| **Wrong** | `ref.current.play('wrong')` | 1.9 s | The user answered incorrectly. |
| **Wave** | `ref.current.play('wave')` | 2.1 s | A greeting, e.g. lesson start or an empty state. |
| **Blink** | `ref.current.blink()` | 0.16 s | Rarely needed; idle already blinks. |
| **Stop** | `ref.current.stop()` | instant | Cancels a running reaction and returns to rest, e.g. when leaving the screen. |

Rules:
- `play()` returns a Promise that resolves when the reaction finishes, so you can `await` it before moving on.
- Starting a new reaction cancels the current one, so calling `play` quickly in a row is safe.
- While a reaction plays it controls the face; talking resumes automatically afterwards if `talking` is still true.
- If the phone's **Reduce Motion** setting is on, the idle loop is switched off but reactions still play, because they're answer feedback.

## Props

| Prop | Type | Default | |
|---|---|---|---|
| `size` | number | `220` | Width in points. Height is `size × 1.406`. |
| `talking` | boolean | `false` | Mouth moves as if speaking. |
| `idle` | boolean | `true` | The looping idle motion. |
| `style` | ViewStyle | | For positioning (margins etc.). |

The character doesn't take touches, so put it inside a `Pressable` if you want it tappable.

## Custom animations

`ref.current.parts` exposes the animation values for each body part as Reanimated shared values, so you can animate them yourself. Angles are in degrees. Distances are in drawing units (the drawing is 512 units wide), so they scale with `size`.

```tsx
import { withSequence, withTiming } from 'react-native-reanimated';

// raise the hip arm and put it back
const { armR } = character.current!.parts;
armR.value = withSequence(withTiming(-30, { duration: 400 }), withTiming(0, { duration: 400 }));
```

| Part | Rest value | Meaning |
|---|---|---|
| `armL`, `forearmL` | 0 | The free arm (viewer's left): shoulder and elbow rotation. `armL 40` + `forearmL 130` raises it. |
| `armR`, `forearmR` | 0 | The arm with the hand on the hip. |
| `head`, `headY` | 0 | Head tilt (deg) and head bob (units). |
| `upperY` | 0 | Moves the whole upper body up and down. |
| `rigY`, `rigScaleX`, `rigScaleY`, `shadowScale` | 0, 1, 1, 1 | The whole character: jump, squash/stretch, and the ground shadow. |
| `hairScaleY` | 1 | Hair bounce. |
| `browLY`, `browRY`, `browLRot`, `browRRot` | 0 | Eyebrow raise (negative = up) and tilt. |
| `pupilY` | 0 | Look down (positive) or up. |
| `mouth` | `MOUTH.smile` | Set it to `MOUTH.smile`, `grin`, `open`, `mid` or `sad`. |
| `hand` | `HAND.relaxed` | Set it to `HAND.relaxed`, `thumb` or `open` (the free hand). |
| `eyes` | `EYES.open` | Set it to `EYES.open`, `happy` or `sad`. |

`MOUTH`, `HAND` and `EYES` are exported from `Character.tsx`. Call `stop()` to put every part back to rest.

To add a new built-in reaction, copy one of the entries in the `REACTIONS` object at the bottom of `Character.tsx` and add its name to the `Reaction` type.

## Troubleshooting

- **The character draws but doesn't move:** the Reanimated Babel plugin is missing or Metro's cache is stale. Check step 1 and restart with `--reset-cache`.
- **"Reanimated failed to initialize" / native module errors:** rebuild the app (`npx expo run:ios`, `npx react-native run-android`, or a new dev-client build). Expo Go already includes both libraries.
- **The idle loop doesn't play on one device:** that device has Reduce Motion turned on. This is intended.
