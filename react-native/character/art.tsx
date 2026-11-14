// The character's drawings, one component per moving layer.
// Every layer uses the same 512 x 720 canvas, so the layers line up when stacked.
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

export const VIEW_W = 512;
export const VIEW_H = 720;

const C = {
  skin: '#b8632e', skinDark: '#8a431c', skinShade: '#9a4d22', skinLight: '#c06c34', nail: '#d98a52', neck: '#a4552a', neckShade: '#8f4720',
  hair: '#2b2224', fade: '#43383a', jacket: '#f09c1c', jacketShade: '#d97f0c', jacketLine: '#c8730a',
  jeans: '#155b68', jeansDark: '#0f4753', shoe: '#f4f6f9', shoeLine: '#d3dde8', sole: '#a9b9cb',
  mouth: '#6e2618', tongue: '#d0604e', eyeLine: '#3a1d12', iris: '#6e2f18', pupil: '#2a120a',
};

const Layer = ({ children }: { children: React.ReactNode }) => (
  <Svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%" style={StyleSheet.absoluteFill}>
    {children}
  </Svg>
);

export const Shadow = () => (
  <Layer><Ellipse cx={257} cy={686} rx={112} ry={9} fill="#000" opacity={0.08} /></Layer>
);

export const Legs = () => (
  <Layer>
    <Path d="M250 646 L250 674 L160 674 Q155 662 168 653 Q192 640 216 636 L250 640Z" fill={C.shoe} stroke={C.shoeLine} strokeWidth={1.5} />
    <Path d="M176 650 Q186 660 184 674" stroke="#dfe6ee" strokeWidth={3} fill="none" />
    <Path d="M200 643 l8 8 M211 640 l8 8" stroke="#c9d5e2" strokeWidth={3} strokeLinecap="round" />
    <Rect x={156} y={670} width={94} height={14} rx={7} fill={C.sole} />
    <Path d="M193 446 L257 446 L257 482 L251 640 L189 640Z" fill={C.jeans} />
    <Path d="M187 620 H253 L252 646 Q220 650 187 646Z" fill={C.jeansDark} />
    <Path d="M188 627 H252" stroke={C.jeans} strokeWidth={2} />

    <Path d="M264 646 L264 674 L354 674 Q359 662 346 653 Q322 640 298 636 L264 640Z" fill={C.shoe} stroke={C.shoeLine} strokeWidth={1.5} />
    <Path d="M338 650 Q328 660 330 674" stroke="#dfe6ee" strokeWidth={3} fill="none" />
    <Path d="M314 643 l-8 8 M303 640 l-8 8" stroke="#c9d5e2" strokeWidth={3} strokeLinecap="round" />
    <Rect x={264} y={670} width={94} height={14} rx={7} fill={C.sole} />
    <Path d="M255 446 L319 446 L329 640 L267 640 L257 482Z" fill={C.jeans} />
    <Path d="M265 620 H331 L332 646 Q298 650 265 646Z" fill={C.jeansDark} />
    <Path d="M266 627 H331" stroke={C.jeans} strokeWidth={2} />

    <Path d="M257 448 V481 M206 462 Q222 470 240 464 M274 464 Q292 470 308 462" stroke={C.jeansDark} strokeWidth={2.5} fill="none" strokeLinecap="round" />
  </Layer>
);

export const Torso = () => (
  <Layer>
    <Path d="M228 290 H282 L284 452 H226Z" fill="#fff" />
    <Path d="M233 258 H277 V298 Q255 316 233 298Z" fill={C.neck} />
    <Path d="M233 262 H277 V282 Q255 292 233 282Z" fill={C.neckShade} />
    <Path d="M231 297 Q255 319 279 297" stroke="#dfe3e8" strokeWidth={5} fill="none" />
    <Path d="M233 286 Q200 289 178 304 Q168 330 172 362 L184 452 H233Z" fill={C.jacket} />
    <Path d="M277 286 Q310 289 332 304 Q342 330 338 362 L326 452 H277Z" fill={C.jacket} />
    <Path d="M183 438 H233 V453 H185Z M277 438 H327 L325 453 H277Z" fill={C.jacketShade} />
    <Path d="M224 326 V438 M286 326 V438" stroke={C.jacketLine} strokeWidth={2} />
    <Path d="M239 276 Q212 280 205 297 L224 324 L239 300Z M271 276 Q298 280 305 297 L286 324 L271 300Z" fill={C.jacketShade} />
    <Path d="M287 352 V368 Q287 374 293 374 H315 Q321 374 321 368 V352" stroke={C.jacketLine} strokeWidth={2} fill="none" />
    <Rect x={285} y={338} width={38} height={14} rx={3} fill={C.hair} />
    <Rect x={288} y={340.5} width={32} height={3.5} fill="#2f9e44" />
    <Rect x={288} y={344} width={32} height={5.5} fill="#f5c518" />
    <Path d="M288 349.5 L292 344 L296 349.5Z M296 349.5 L300 344 L304 349.5Z M304 349.5 L308 344 L312 349.5Z M312 349.5 L316 344 L320 349.5Z" fill="#d92c20" />
  </Layer>
);

// ---- right arm (viewer's right, hand on hip) ----
export const ArmRUpper = () => (
  <Layer><Line x1={334} y1={320} x2={374} y2={378} stroke={C.jacket} strokeWidth={40} strokeLinecap="round" /></Layer>
);
export const ForearmR = () => (
  <Layer>
    <Line x1={374} y1={378} x2={352} y2={410} stroke={C.jacket} strokeWidth={36} strokeLinecap="round" />
    {/* left hand resting on the hip: back of the hand, fingers pointing down toward the belt */}
    <Path d="M356 408 Q338 402 320 409 Q305 414 301 424 Q298 432 304 435 Q299 441 303 447 Q301 453 308 456 Q310 462 318 460 Q333 457 345 447 Q354 438 358 424Z" fill={C.skin} />
    <Path d="M321 412 Q323 431 331 450" stroke={C.skinShade} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.4} />
    <Path d="M304 435 Q314 434 322 429 M303 447 Q314 446 324 439 M308 456 Q318 454 327 448" stroke={C.skinDark} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.75} />
    <Path d="M330 414 Q340 412 348 416" stroke={C.skinLight} strokeWidth={4} fill="none" strokeLinecap="round" />
    <Line x1={361} y1={397} x2={346} y2={420} stroke={C.jacketShade} strokeWidth={39} />
  </Layer>
);

// ---- left arm (viewer's left: thumbs up / wave) ----
export const ArmLUpper = () => (
  <Layer>
    <Line x1={190} y1={320} x2={170} y2={386} stroke={C.jacket} strokeWidth={40} strokeLinecap="round" />
    <Path d="M207 336 L190 388" stroke={C.jacketLine} strokeWidth={2} strokeLinecap="round" />
  </Layer>
);
export const ForearmL = () => (
  <Layer><Line x1={170} y1={386} x2={168} y2={428} stroke={C.jacket} strokeWidth={38} strokeLinecap="round" /></Layer>
);
export const CuffL = () => (
  <Layer>
    <Rect x={147} y={424} width={42} height={22} rx={6} fill={C.jacketShade} />
    <Path d="M189 392 L187 424" stroke={C.jacketLine} strokeWidth={2} strokeLinecap="round" />
  </Layer>
);
// Right hand hanging at his side: palm toward his leg, thumb in front, fingers loosely curled.
export const HandRelaxed = () => (
  <Layer>
    <Path d="M155 444 Q148 462 151 480 Q154 496 166 498 Q178 498 181 486 Q184 466 181 444Z" fill={C.skin} />
    <Path d="M156 456 Q151 470 155 484" stroke={C.skinShade} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.45} />
    <Path d="M157 480 Q165 485 175 482 M157 488 Q165 493 174 490" stroke={C.skinDark} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.7} />
    <Ellipse cx={179} cy={467} rx={6.5} ry={14} rotation={-10} origin="179, 467" fill={C.skinLight} />
    <Ellipse cx={180.5} cy={476} rx={3.5} ry={3} fill={C.nail} />
  </Layer>
);
// Thumbs-up and open hands are drawn upright (thumb toward his body), then pre-rotated so they sit
// upright once the arm is raised.
export const HandThumb = () => (
  <Layer>
    <G rotation={190} origin="168, 446">
      <Rect x={148} y={410} width={36} height={40} rx={13} fill={C.skin} />
      <Circle cx={151} cy={417} r={5} fill={C.neck} />
      <Circle cx={150} cy={428} r={5} fill={C.neck} />
      <Circle cx={150} cy={438} r={5} fill={C.neck} />
      <Rect x={160} y={409} width={30} height={11} rx={5.5} fill={C.skinLight} />
      <Rect x={160} y={419} width={30} height={11} rx={5.5} fill={C.skin} />
      <Rect x={160} y={429} width={29} height={10.5} rx={5.25} fill={C.skin} />
      <Rect x={160} y={438.5} width={26} height={10} rx={5} fill={C.skin} />
      <Path d="M163 419.5 H188 M163 429.5 H187 M163 439 H184" stroke={C.skinDark} strokeWidth={1.8} strokeLinecap="round" />
      <G rotation={5} origin="178, 414">
        <Rect x={170} y={374} width={17} height={42} rx={8.5} fill={C.skinLight} />
        <Ellipse cx={177} cy={381} rx={5} ry={4.5} fill={C.nail} />
        <Path d="M172 398 Q178 401 185 398" stroke={C.skinDark} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </G>
    </G>
  </Layer>
);
export const HandOpen = () => (
  <Layer>
    <G rotation={189} origin="168, 446">
      <Rect x={148} y={390} width={9} height={34} rx={4.5} rotation={-9} origin="152, 422" fill={C.skin} />
      <Rect x={157.5} y={380} width={9.5} height={42} rx={4.75} rotation={-3} origin="162, 422" fill={C.skin} />
      <Rect x={167.5} y={377} width={9.5} height={45} rx={4.75} rotation={2} origin="172, 422" fill={C.skin} />
      <Rect x={177} y={382} width={9.5} height={40} rx={4.75} rotation={7} origin="181, 422" fill={C.skin} />
      <Path d="M152 398 h5 M161 392 h5 M171 390 h5 M181 395 h5" stroke={C.skinDark} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      <Line x1={184} y1={436} x2={201} y2={417} stroke={C.skin} strokeWidth={10.5} strokeLinecap="round" />
      <Rect x={148} y={410} width={40} height={38} rx={12} fill={C.skin} />
      <Path d="M155 421 Q168 426 181 419 M157 432 Q166 437 178 433" stroke={C.skinDark} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.7} />
      <Path d="M178 440 Q186 436 187 428" stroke={C.skinShade} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.5} />
    </G>
  </Layer>
);

// ---- head ----
export const HeadBase = () => (
  <Layer>
    <Circle cx={166} cy={206} r={27} fill={C.skin} />
    <Path d="M159 195 Q173 199 170 217" stroke={C.skinDark} strokeWidth={4} fill="none" strokeLinecap="round" />
    <Circle cx={344} cy={206} r={27} fill={C.skin} />
    <Path d="M351 195 Q337 199 340 217" stroke={C.skinDark} strokeWidth={4} fill="none" strokeLinecap="round" />
    <Path d="M174 150 V200 Q174 272 255 274 Q336 272 336 200 V150 Q336 112 255 112 Q174 112 174 150Z" fill={C.skin} />
    <Path d="M174 128 H190 V178 H174Z M320 128 H336 V178 H320Z" fill={C.fade} />
    <Path d="M174 176 H190 Q192 210 212 226 Q234 217 255 220 Q276 217 298 226 Q318 210 320 176 H336 V200 Q336 274 255 278 Q174 274 174 200Z" fill={C.hair} />
    <Path d="M229 238 Q255 229 281 238 Q283 256 255 261 Q227 256 229 238Z" fill={C.skin} />
    <Ellipse cx={255} cy={262} rx={7} ry={4} fill={C.hair} />
    <Ellipse cx={255} cy={212} rx={11} ry={7} fill={C.skinShade} />
  </Layer>
);

export const MouthSmile = () => (
  <Layer>
    <Path d="M233 238 Q255 244 277 238 Q275 255 255 255 Q235 255 233 238Z" fill={C.mouth} />
    <Path d="M236 239.5 Q255 245 274 239.5 Q272 247 255 248 Q238 247 236 239.5Z" fill="#fff" />
  </Layer>
);
export const MouthGrin = () => (
  <Layer>
    <Path d="M230 236 Q255 243 280 236 Q279 259 255 259 Q231 259 230 236Z" fill={C.mouth} />
    <Path d="M233 237.5 Q255 244 277 237.5 Q276 247 255 248 Q234 247 233 237.5Z" fill="#fff" />
    <Ellipse cx={255} cy={255} rx={10} ry={3.5} fill={C.tongue} />
  </Layer>
);
export const MouthOpen = () => (
  <Layer>
    <Ellipse cx={255} cy={246} rx={13} ry={11} fill={C.mouth} />
    <Path d="M244 238.5 Q255 242 266 238.5 L265 243 Q255 245 245 243Z" fill="#fff" />
    <Ellipse cx={255} cy={253} rx={8} ry={3.5} fill={C.tongue} />
  </Layer>
);
export const MouthMid = () => (
  <Layer>
    <Ellipse cx={255} cy={244} rx={12} ry={6} fill={C.mouth} />
    <Path d="M245 240 Q255 243 265 240 L264 243.5 Q255 245.5 246 243.5Z" fill="#fff" />
  </Layer>
);
export const MouthSad = () => (
  <Layer><Path d="M241 251 Q255 240 269 251" stroke="#5a2216" strokeWidth={4.5} fill="none" strokeLinecap="round" /></Layer>
);

export const EyeWhites = () => (
  <Layer><Circle cx={220} cy={190} r={21} fill="#fff" /><Circle cx={288} cy={190} r={21} fill="#fff" /></Layer>
);
// Pupils are small enough to move up to ~5 units without leaving the eye, so they need no clipping.
export const Pupils = () => (
  <Layer>
    {[[223, 217, 228], [285, 279, 290]].map(([x, hx, sx]) => (
      <G key={x}>
        <Circle cx={x} cy={192} r={14} fill={C.iris} />
        <Circle cx={x} cy={192} r={8.5} fill={C.pupil} />
        <Circle cx={hx} cy={185} r={5} fill="#fff" />
        <Circle cx={sx} cy={197} r={2} fill="#fff" />
      </G>
    ))}
  </Layer>
);
// Droopy upper lids for the "wrong" face: the top slice of each eye circle.
export const SadLids = () => (
  <Layer>
    {[220, 288].map(cx => (
      <G key={cx}>
        <Path d={`M${cx - 16.5} 177 Q${cx} 183 ${cx + 16.5} 177 A21 21 0 0 0 ${cx - 16.5} 177Z`} fill={C.neck} />
        <Path d={`M${cx - 16.5} 177 Q${cx} 183 ${cx + 16.5} 177`} stroke={C.eyeLine} strokeWidth={4} fill="none" strokeLinecap="round" />
      </G>
    ))}
  </Layer>
);
export const EyeOutlines = () => (
  <Layer>
    <Circle cx={220} cy={190} r={21} fill="none" stroke={C.eyeLine} strokeWidth={4.5} />
    <Circle cx={288} cy={190} r={21} fill="none" stroke={C.eyeLine} strokeWidth={4.5} />
  </Layer>
);
export const EyesHappy = () => (
  <Layer><Path d="M202 196 Q220 172 238 196 M270 196 Q288 172 306 196" stroke={C.eyeLine} strokeWidth={6} fill="none" strokeLinecap="round" /></Layer>
);

export const BrowL = () => (
  <Layer><Path d="M201 160 Q219 145 238 156" stroke={C.hair} strokeWidth={9} fill="none" strokeLinecap="round" /></Layer>
);
export const BrowR = () => (
  <Layer><Path d="M270 156 Q289 145 307 160" stroke={C.hair} strokeWidth={9} fill="none" strokeLinecap="round" /></Layer>
);

const CURLS: [number, number, number][] = [
  [188, 76, 19], [218, 62, 21], [255, 57, 23], [292, 62, 21], [322, 76, 19],
  [168, 96, 17], [164, 116, 15], [170, 130, 10], [342, 96, 17], [346, 116, 15], [340, 130, 10],
  [192, 121, 11], [213, 120, 12], [234, 119, 12], [255, 119, 12], [276, 119, 12], [297, 120, 12], [318, 121, 11],
];
export const Hair = () => (
  <Layer>
    <Ellipse cx={255} cy={92} rx={88} ry={38} fill={C.hair} />
    {CURLS.map(([cx, cy, r]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={C.hair} />)}
    <Path d="M205 71 Q214 62 225 68 M244 64 Q256 55 268 64 M287 69 Q298 62 308 72 M179 101 Q186 92 195 96 M317 96 Q326 91 333 101 M228 96 Q238 88 250 94 M266 94 Q276 87 288 95"
      stroke={C.fade} strokeWidth={2.5} fill="none" strokeLinecap="round" />
  </Layer>
);

// Sparkle star centred at (cx, cy) with radius r.
export const Sparkle = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => {
  const k = r * 0.15;
  return (
    <Layer>
      <Path fill="#ffc928" d={`M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`} />
    </Layer>
  );
};
