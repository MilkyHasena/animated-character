# Animated character

A Duolingo-style animated mascot. He has a subtle looping idle animation (breathing, blinking, glances), a talking mouth, and three reactions: **correct** (thumbs-up and a hop), **wrong** (head shake and a sad face) and **wave**.

## What's in here

| Folder | For | Start with |
|---|---|---|
| [`react-native/character`](react-native/character) | **Mobile app developers.** A drop-in React Native component (react-native-svg + Reanimated, TypeScript). | [its README](react-native/character/README.md) |
| [`web`](web) | A browser version and demo page (plain SVG + JavaScript, no dependencies). | `web/index.html` |
| [`design`](design) | The layered SVG drawing. `character-figma.svg` has every mouth/hand/eye pose laid out for importing into Figma. | |

## React Native in 30 seconds

1. Install the two dependencies (Expo: `npx expo install react-native-svg react-native-reanimated`).
2. Copy the `react-native/character` folder into your app.
3. Use it:

```tsx
<Character ref={character} size={200} talking={isSpeaking} />

await character.current?.play('correct'); // or 'wrong' / 'wave'
```

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
