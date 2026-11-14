# Animated characters

Two Duolingo-style animated mascots, a **man** and a **woman**. Each has a subtle looping idle animation (breathing, blinking, glances), a talking mouth, and three reactions: **correct** (thumbs-up and a hop), **wrong** (head shake and a sad face) and **wave**. The woman plays the same reactions in her own, bouncier style.

| | Man | Woman |
|---|---|---|
| React Native | ✓ | ✓ |
| Web demo | ✓ | — |
| Design SVGs | ✓ | — |

## What's in here

| Folder | For | Start with |
|---|---|---|
| [`react-native/character`](react-native/character) | **Mobile app developers.** A drop-in React Native component with both characters (react-native-svg + Reanimated, TypeScript). | [its README](react-native/character/README.md) |
| [`web`](web) | A browser version and demo page of the man (plain SVG + JavaScript, no dependencies). | `web/index.html` |
| [`design`](design) | The man's layered SVG drawing. `character-figma.svg` has every mouth/hand/eye pose laid out for importing into Figma. | |

## React Native in 30 seconds

1. Install the two dependencies (Expo: `npx expo install react-native-svg react-native-reanimated`).
2. Copy the `react-native/character` folder into your app.
3. Use it:

```tsx
<Character ref={character} variant="woman" size={200} talking={isSpeaking} />

await character.current?.play('correct'); // or 'wrong' / 'wave'
```

`variant` picks the character: `"man"` (the default) or `"woman"`. Both use exactly the same props and calls.

The full guide, with every animation state, props, custom animations and troubleshooting, is in [react-native/character/README.md](react-native/character/README.md).

## Web demo

Browsers block the script when the page is opened straight from disk, so serve the folder:

```bash
python -m http.server 8765 -d web
```

Then open http://localhost:8765.

## Download

Click **Code → Download ZIP** on GitHub, or run:

```bash
git clone https://github.com/MilkyHasena/animated-character.git
```
