// Drawings for the woman character. Same layer names as art.tsx, so Character.tsx can swap one for the other.
// Her hands reuse the drawings in art.tsx, in her skin tone and moved to her wrists.
import React from 'react';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import * as Shared from './art';
import { Layer, Skin } from './art';

const C = {
  skin: '#b5531b', skinDark: '#7f3610', skinShade: '#994313', skinLight: '#c4622a', nail: '#dc8a55', neck: '#a54a17', neckShade: '#8c3c11',
  hair: '#2a1d1b', curl: '#43312d', band: '#f5b301', jacket: '#f4412f', jacketShade: '#d9301f', jacketDark: '#b8261a',
  pants: '#4a6b2c', pantsDark: '#3a5522', button: '#7d9a4f', shoe: '#f4f6f9', shoeLine: '#d3dde8', sole: '#a9b9cb',
  mouth: '#5c1a12', tongue: '#e8556a', eyeLine: '#2a1410', iris: '#7a3e1e', pupil: '#1c0d08',
  green: '#2f9e44', yellow: '#f5c518',
};
const SKIN: Skin = C;

// Where her wrist sits relative to the man's (the hand drawings are shared).
const HAND_L = { c: SKIN, dx: 2, dy: 24 };

export const Legs = () => (
  <Layer box={[147, 422, 235, 266]}>
    <Path d="M245 646 L245 674 L155 674 Q150 662 163 653 Q187 640 211 636 L245 640Z" fill={C.shoe} stroke={C.shoeLine} strokeWidth={1.5} />
    <Path d="M171 650 Q181 660 179 674" stroke="#dfe6ee" strokeWidth={3} fill="none" />
    <Path d="M195 643 l8 8 M206 640 l8 8" stroke="#c9d5e2" strokeWidth={3} strokeLinecap="round" />
    <Rect x={151} y={670} width={94} height={14} rx={7} fill={C.sole} />
    <Path d="M284 646 L284 674 L374 674 Q379 662 366 653 Q342 640 318 636 L284 640Z" fill={C.shoe} stroke={C.shoeLine} strokeWidth={1.5} />
    <Path d="M358 650 Q348 660 350 674" stroke="#dfe6ee" strokeWidth={3} fill="none" />
    <Path d="M334 643 l-8 8 M323 640 l-8 8" stroke="#c9d5e2" strokeWidth={3} strokeLinecap="round" />
    <Rect x={284} y={670} width={94} height={14} rx={7} fill={C.sole} />

    <Path d="M192 426 H258 V492 L252 632 H182Z" fill={C.pants} />
    <Path d="M254 426 H322 L350 632 H277 L258 492Z" fill={C.pants} />
    <Path d="M180 621 H254 L253 651 Q217 655 180 651Z" fill={C.pantsDark} />
    <Path d="M275 621 H352 L353 651 Q314 655 275 651Z" fill={C.pantsDark} />
    <Path d="M181 628 H253 M276 628 H352" stroke={C.pants} strokeWidth={2} />
    {/* high waist: band, button, fly */}
    <Path d="M192 445 H322" stroke={C.pantsDark} strokeWidth={2.5} />
    <Path d="M247 445 V477 Q247 482 252 482 H263 V445" stroke={C.pantsDark} strokeWidth={2.5} fill="none" />
    <Path d="M240 490 Q256 494 274 490" stroke={C.pantsDark} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    <Circle cx={256} cy={436} r={5} fill={C.button} />
  </Layer>
);

export const Torso = () => (
  <Layer box={[167, 298, 178, 175]}>
    <Path d="M230 330 H282 L284 432 H228Z" fill="#fff" />
    <Path d="M239 302 H274 V334 Q256 347 239 334Z" fill={C.neck} />
    <Path d="M239 306 H274 V320 Q256 329 239 320Z" fill={C.neckShade} />
    <Path d="M236 333 Q256 351 277 333" stroke="#e3e6ea" strokeWidth={4} fill="none" />
    {/* cropped jacket */}
    <Path d="M234 320 Q204 321 184 334 Q169 348 172 380 L188 469 H234Z" fill={C.jacket} />
    <Path d="M278 320 Q308 321 328 334 Q343 348 340 380 L324 469 H278Z" fill={C.jacket} />
    <Path d="M186 454 H234 V469 H188Z M279 454 H326 L324 469 H279Z" fill={C.jacketShade} />
    <Path d="M241 316 L241 336 L235 340 L232 322Z M272 316 L272 336 L278 340 L281 322Z" fill={C.jacketDark} />
    <Path d="M241 315 Q214 318 206 336 Q222 333 236 346 Q241 334 241 315Z M272 315 Q299 318 307 336 Q291 333 277 346 Q272 334 272 315Z" fill={C.jacket} stroke={C.jacketShade} strokeWidth={2} strokeLinejoin="round" />
  </Layer>
);

// green and yellow trim across a cuff
const Trim = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => (
  <G>
    <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.green} strokeWidth={6} />
    <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.yellow} strokeWidth={6} strokeDasharray="5 5" />
  </G>
);

// ---- left arm (viewer's left: thumbs up / wave) ----
export const ArmLUpper = () => (
  <Layer box={[153, 331, 74, 100]}>
    <Line x1={196} y1={350} x2={172} y2={410} stroke={C.jacket} strokeWidth={34} strokeLinecap="round" />
    <Path d="M208 368 L188 412" stroke={C.jacketShade} strokeWidth={2} strokeLinecap="round" />
  </Layer>
);
export const ForearmL = () => (
  <Layer box={[152, 392, 38, 78]}><Line x1={172} y1={410} x2={170} y2={452} stroke={C.jacket} strokeWidth={32} strokeLinecap="round" /></Layer>
);
export const CuffL = () => (
  <Layer box={[146, 411, 48, 64]}>
    <Rect x={151} y={448} width={38} height={22} rx={6} fill={C.jacketShade} />
    <Trim x1={153} y1={459} x2={187} y2={459} />
    <Path d="M186 416 L185 448" stroke={C.jacketShade} strokeWidth={2} strokeLinecap="round" />
  </Layer>
);
export const HandRelaxed = () => <Shared.HandRelaxed {...HAND_L} />;
export const HandThumb = () => <Shared.HandThumb {...HAND_L} />;
export const HandOpen = () => <Shared.HandOpen {...HAND_L} />;
export const HandClap = () => <Shared.HandClap {...HAND_L} />;

// ---- head ----
const HAIRLINE: [number, number, number][] = [
  [205, 197, 10], [222, 189, 10], [239, 184, 10], [256, 182, 10], [273, 184, 10], [290, 189, 10], [307, 197, 10],
];
export const HeadBase = () => (
  <Layer box={[154, 121, 205, 202]}>
    <Circle cx={179} cy={256} r={20} fill={C.skin} />
    <Path d="M172 248 Q182 251 180 264" stroke={C.skinDark} strokeWidth={4} fill="none" strokeLinecap="round" />
    <Circle cx={334} cy={256} r={20} fill={C.skin} />
    <Path d="M341 248 Q331 251 333 264" stroke={C.skinDark} strokeWidth={4} fill="none" strokeLinecap="round" />
    <Path d="M185 230 V258 Q185 316 256 318 Q328 316 328 258 V230 Q328 172 256 172 Q185 172 185 230Z" fill={C.skin} />
    {/* hair cap with a scalloped hairline, then the headband on top of it */}
    <Path d="M177 244 V215 Q180 144 256 142 Q333 144 336 215 V244 H324 Q325 206 311 193 Q256 168 202 193 Q188 206 189 244Z" fill={C.hair} />
    <Ellipse cx={256} cy={150} rx={66} ry={24} fill={C.hair} />
    <Circle cx={184} cy={156} r={12} fill={C.hair} />
    <Circle cx={329} cy={156} r={12} fill={C.hair} />
    <Circle cx={193} cy={160} r={13} fill={C.hair} />
    <Circle cx={320} cy={160} r={13} fill={C.hair} />
    {HAIRLINE.map(([cx, cy, r]) => <Circle key={cx} cx={cx} cy={cy} r={r} fill={C.hair} />)}
    <Path d="M182 204 Q186 148 256 148 Q327 148 331 204" stroke={C.band} strokeWidth={6} fill="none" strokeLinecap="round" />
    <Ellipse cx={256} cy={260} rx={9} ry={5.5} fill={C.skinShade} />
  </Layer>
);

export const MouthSmile = () => (
  <Layer box={[226, 269, 60, 38]}>
    <Path d="M228 271 Q256 277 284 271 Q283 304 256 305 Q229 304 228 271Z" fill={C.mouth} />
    <Ellipse cx={256} cy={297} rx={14} ry={6} fill={C.tongue} />
    <Path d="M231 272.5 Q256 278 281 272.5 Q280 284 256 285 Q232 284 231 272.5Z" fill="#fff" />
  </Layer>
);
export const MouthGrin = () => (
  <Layer box={[223, 267, 66, 45]}>
    <Path d="M225 269 Q256 276 287 269 Q287 309 256 310 Q225 309 225 269Z" fill={C.mouth} />
    <Ellipse cx={256} cy={300} rx={16} ry={7} fill={C.tongue} />
    <Path d="M228 270.5 Q256 277 284 270.5 Q283 284 256 285 Q229 284 228 270.5Z" fill="#fff" />
  </Layer>
);
export const MouthOpen = () => (
  <Layer box={[239, 271, 34, 32]}>
    <Ellipse cx={256} cy={287} rx={15} ry={14} fill={C.mouth} />
    <Ellipse cx={256} cy={295} rx={9} ry={4.5} fill={C.tongue} />
    <Path d="M244 277 Q256 281 268 277 L267 282 Q256 284.5 245 282Z" fill="#fff" />
  </Layer>
);
export const MouthMid = () => (
  <Layer box={[240, 274, 32, 18]}>
    <Ellipse cx={256} cy={283} rx={14} ry={7} fill={C.mouth} />
    <Path d="M245 278.5 Q256 282 267 278.5 L266 282.5 Q256 284.5 246 282.5Z" fill="#fff" />
  </Layer>
);
export const MouthFlat = () => (
  <Layer box={[238, 283, 36, 11]}><Path d="M243 288 Q256 290 269 288" stroke={C.mouth} strokeWidth={4.5} fill="none" strokeLinecap="round" /></Layer>
);
export const MouthSad = () => (
  <Layer box={[235, 283, 42, 16]}><Path d="M240 294 Q256 281 272 294" stroke={C.mouth} strokeWidth={4.5} fill="none" strokeLinecap="round" /></Layer>
);

const EYES = [222, 290];
export const EyeWhites = () => (
  <Layer box={[201, 220, 110, 42]}>{EYES.map(cx => <Circle key={cx} cx={cx} cy={241} r={19} fill="#fff" />)}</Layer>
);
export const Pupils = () => (
  <Layer box={[210, 230, 92, 26]}>
    {[[223, 219, 227], [289, 285, 293]].map(([x, hx, sx]) => (
      <G key={x}>
        <Circle cx={x} cy={243} r={10.5} fill={C.iris} />
        <Circle cx={x} cy={243} r={5} fill={C.pupil} />
        <Circle cx={hx} cy={238.5} r={3.8} fill="#fff" />
        <Circle cx={sx} cy={247} r={1.5} fill="#fff" />
      </G>
    ))}
  </Layer>
);
export const SadLids = () => (
  <Layer box={[200, 218, 112, 24]}>
    {EYES.map(cx => (
      <G key={cx}>
        <Path d={`M${cx - 18} 235 Q${cx} 241 ${cx + 18} 235 A19 19 0 0 0 ${cx - 18} 235Z`} fill={C.neck} />
        <Path d={`M${cx - 18} 235 Q${cx} 241 ${cx + 18} 235`} stroke={C.eyeLine} strokeWidth={4} fill="none" strokeLinecap="round" />
      </G>
    ))}
  </Layer>
);
export const EyeOutlines = () => (
  <Layer box={[189, 215, 134, 50]}>
    {EYES.map(cx => <Circle key={cx} cx={cx} cy={241} r={19} fill="none" stroke={C.eyeLine} strokeWidth={4.5} />)}
    {/* resting upper lids */}
    <Path d={`M206 227 Q222 230 238 227 A21.3 21.3 0 0 0 206 227Z`} fill={C.skin} />
    <Path d="M206 227 Q222 230 238 227" stroke={C.eyeLine} strokeWidth={4.5} fill="none" strokeLinecap="round" />
    <Path d={`M274 227 Q290 230 306 227 A21.3 21.3 0 0 0 274 227Z`} fill={C.skin} />
    <Path d="M274 227 Q290 230 306 227" stroke={C.eyeLine} strokeWidth={4.5} fill="none" strokeLinecap="round" />
    {/* lashes at the outer corners */}
    <Path d="M203 232 L196 228 M201 239 L194 238 M207 226 L201 220 M309 232 L316 228 M311 239 L318 238 M305 226 L311 220"
      stroke={C.eyeLine} strokeWidth={3} strokeLinecap="round" />
  </Layer>
);
export const EyesHappy = () => (
  <Layer box={[192, 231, 128, 21]}>
    <Path d="M205 247 Q222 225 239 247 M273 247 Q290 225 307 247" stroke={C.eyeLine} strokeWidth={6} fill="none" strokeLinecap="round" />
    <Path d="M204 240 L197 236 M308 240 L315 236" stroke={C.eyeLine} strokeWidth={3} strokeLinecap="round" />
  </Layer>
);

export const BrowL = () => (
  <Layer box={[199, 197, 41, 18]}><Path d="M204 210 Q219 198 235 205" stroke={C.hair} strokeWidth={6} fill="none" strokeLinecap="round" /></Layer>
);
export const BrowR = () => (
  <Layer box={[272, 197, 41, 18]}><Path d="M277 205 Q293 198 308 210" stroke={C.hair} strokeWidth={6} fill="none" strokeLinecap="round" /></Layer>
);

// The puff on top. Its lower edge sits on the dark hair cap, so it can bounce without showing a gap.
const PUFF: [number, number, number][] = [
  [200, 78, 22], [230, 66, 24], [260, 62, 25], [292, 68, 23], [320, 84, 21],
  [177, 104, 20], [173, 130, 18], [339, 108, 20], [341, 132, 18], [191, 145, 12], [323, 145, 12],
];
export const Hair = () => (
  <Layer box={[151, 33, 212, 128]}>
    <Ellipse cx={257} cy={106} rx={80} ry={40} fill={C.hair} />
    {PUFF.map(([cx, cy, r]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={C.hair} />)}
    <Path d="M212 76 Q222 66 234 72 M250 68 Q262 59 275 68 M292 76 Q303 68 313 78 M184 112 Q191 102 201 107 M318 108 Q328 102 336 112 M226 104 Q238 95 251 102 M268 102 Q280 94 292 103 M206 132 Q216 124 228 130 M286 130 Q297 123 308 131"
      stroke={C.curl} strokeWidth={2.5} fill="none" strokeLinecap="round" />
  </Layer>
);
