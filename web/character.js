// Character rig controller. Uses the browser's Web Animations API (element.animate).
//
// Idle motion animates the separate CSS `translate` / `rotate` properties, reactions animate
// `transform`. The two stack, so a reaction never makes the idle motion jump.

// keyframe helpers: rows are [offset, ...values]
const kf = (fn, rows) => rows.map(([offset, ...v]) => ({ offset, transform: fn(...v), easing: 'ease-in-out' }));
const rot = rows => kf(d => `rotate(${d}deg)`, rows);
const dy = rows => kf(y => `translateY(${y}px)`, rows);

class Character {
  static PARTS = ['shadow', 'rig', 'upper', 'torso', 'head', 'hair', 'legs', 'leg-l', 'leg-r',
    'arm-l', 'forearm-l', 'arm-r', 'forearm-r', 'hand-r', 'hand-l-relaxed', 'hand-l-thumb', 'hand-l-open',
    'eyes-open', 'eyes-happy', 'pupil-l', 'pupil-r', 'lid-l', 'lid-r', 'brow-l', 'brow-r',
    'mouth-smile', 'mouth-grin', 'mouth-open', 'mouth-mid', 'mouth-sad', 'spark-1', 'spark-2', 'spark-3'];

  constructor(svg, { idle = true, followPointer = true } = {}) {
    this.svg = svg;
    for (const id of Character.PARTS) {
      if (!this.part(id)) throw new Error('Character: missing part #' + id);
    }
    this._anims = [];
    this._timers = [];
    this._lastLook = -1e9;
    this._reset();
    if (idle) this._startIdle();
    if (followPointer) addEventListener('pointermove', e => this.lookAt(e.clientX, e.clientY));
  }

  part(id) { return this.svg.querySelector('#' + id); }

  // Thin wrapper over element.animate so you can animate any part by name.
  animate(id, keyframes, options) { return this.part(id).animate(keyframes, options); }

  setMouth(name) { this._show('mouth-', ['smile', 'grin', 'open', 'mid', 'sad'], name); }
  _hand(name) { this._show('hand-l-', ['relaxed', 'thumb', 'open'], name); }
  _eyes(name) { this._show('eyes-', ['open', 'happy'], name); }
  _show(prefix, names, active) {
    for (const n of names) this.part(prefix + n).style.display = n === active ? '' : 'none';
  }

  // ---------- idle ----------

  _startIdle() {
    const loop = (id, a, b, duration, delay = 0) => this.animate(id, [a, b],
      { duration, delay, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    loop('upper', { translate: '0 0' }, { translate: '0 -2px' }, 2400);                 // breathing
    loop('head', { translate: '0 0' }, { translate: '0 1.5px' }, 2400, 300);            // head lags the chest
    loop('head', { rotate: '-0.8deg' }, { rotate: '0.8deg' }, 4100);                    // slow head sway
    loop('arm-l', { rotate: '0deg' }, { rotate: '1.6deg' }, 2400, 200);                 // loose arm swings a little
    loop('rig', { rotate: '-0.4deg' }, { rotate: '0.4deg' }, 5300);                     // weight shift
    const blinkLoop = () => setTimeout(() => {
      this.blink();
      if (Math.random() < 0.2) setTimeout(() => this.blink(), 260);                     // occasional double blink
      blinkLoop();
    }, 2000 + Math.random() * 3500);
    const glanceLoop = () => setTimeout(() => {
      const quiet = () => performance.now() - this._lastLook > 2500;                    // pointer not moving
      if (quiet()) {
        this._look((Math.random() * 2 - 1) * 5, (Math.random() * 2 - 1) * 2);
        setTimeout(() => quiet() && this._look(0, 0), 900);
      }
      glanceLoop();
    }, 3000 + Math.random() * 4000);
    blinkLoop();
    glanceLoop();
  }

  blink() {
    const k = [{ transform: 'translateY(-48px)' }, { transform: 'translateY(0)', offset: 0.4 }, { transform: 'translateY(-48px)' }];
    for (const id of ['lid-l', 'lid-r']) this.animate(id, k, { duration: 160, easing: 'ease-in-out' });
  }

  // Eyes look toward a point on the page (clientX / clientY).
  lookAt(x, y) {
    const r = this.svg.getBoundingClientRect();
    const dx = x - (r.left + r.width * 254 / 512), dy = y - (r.top + r.height * 190 / 720);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 150) * 6;
    this._lastLook = performance.now();
    this._look(dx / d * k, dy / d * k * 0.7);
  }
  _look(x, y) {
    for (const id of ['pupil-l', 'pupil-r']) this.part(id).style.translate = `${x}px ${y}px`;
  }

  // ---------- talking ----------

  talk(on) {
    clearTimeout(this._talkTimer);
    if (!on) return this.setMouth('smile');
    const shapes = ['open', 'mid', 'smile'];
    let last;
    const step = () => {
      let s;
      do { s = shapes[Math.floor(Math.random() * shapes.length)]; } while (s === last);
      this.setMouth(last = s);
      this._talkTimer = setTimeout(step, 90 + Math.random() * 90);
    };
    step();
  }

  // ---------- reactions ----------

  // Back to the resting look; also stops any reaction that is still playing.
  _reset() {
    this._anims.forEach(a => a.cancel());
    this._timers.forEach(clearTimeout);
    this._anims = [];
    this._timers = [];
    this.talk(false);
    this._hand('relaxed');
    this._eyes('open');
  }

  // anims: running animations; cues: [ms, fn] face/hand swaps along the way.
  _run(anims, cues) {
    this._reset();
    this._anims = anims;
    this._timers = cues.map(([ms, fn]) => setTimeout(fn, ms));
    // `finished` rejects when a newer reaction cancels this one; then the newer one owns the reset
    return Promise.all(anims.map(a => a.finished)).then(() => this._reset(), () => {});
  }

  // Thumbs up with a hop and sparkles.
  correct() {
    const o = { duration: 2000 };
    const spark = [{ opacity: 0, transform: 'scale(0) rotate(0deg)' },
      { opacity: 1, transform: 'scale(1.2) rotate(45deg)', offset: 0.4 },
      { opacity: 0, transform: 'scale(0) rotate(90deg)' }];
    return this._run([
      // squash, jump, land, settle
      this.animate('rig', kf((y, sx, sy) => `translateY(${y}px) scale(${sx},${sy})`,
        [[0, 0, 1, 1], [0.08, 0, 1.03, 0.95], [0.19, -24, 0.97, 1.04], [0.3, 0, 1.04, 0.95], [0.38, 0, 1, 1], [1, 0, 1, 1]]), o),
      this.animate('shadow', kf(s => `scale(${s})`, [[0, 1], [0.08, 1.03], [0.19, 0.8], [0.3, 1.04], [0.38, 1], [1, 1]]), o),
      this.animate('hair', kf(s => `scaleY(${s})`, [[0, 1], [0.19, 1.03], [0.3, 0.95], [0.4, 1], [1, 1]]), o),
      // arm swings back a touch, up past the pose, settles, then two small pumps (40 + 130 = forearm upright)
      this.animate('arm-l', rot([[0, 0], [0.08, -6], [0.27, 45], [0.35, 40], [0.8, 40], [1, 0]]), o),
      this.animate('forearm-l', rot([[0, 0], [0.08, 0], [0.27, 139], [0.35, 130], [0.45, 122], [0.53, 130],
        [0.61, 123], [0.69, 130], [0.8, 130], [1, 0]]), o),
      this.animate('head', rot([[0, 0], [0.3, 4], [0.8, 4], [1, 0]]), o),
      ...['brow-l', 'brow-r'].map(id => this.animate(id, dy([[0, 0], [0.2, -5], [0.8, -5], [1, 0]]), o)),
      ...[1, 2, 3].map(i => this.animate('spark-' + i, spark, { duration: 650, delay: 520 + i * 130 })),
    ], [
      [0, () => this.setMouth('grin')],
      [300, () => this._hand('thumb')],
      [420, () => this._eyes('happy')],
      [1650, () => this._eyes('open')],
      [1800, () => this._hand('relaxed')],
    ]);
  }

  // Head shake, then a sad droop.
  wrong() {
    const o = { duration: 1900 };
    const hold = v => [[0, 0], [0.1, v], [0.85, v], [1, 0]];
    const brow = d => kf((y, deg) => `translateY(${y}px) rotate(${deg}deg)`, [[0, 0, 0], [0.1, 2, d], [0.85, 2, d], [1, 0, 0]]);
    return this._run([
      this.animate('head', kf((y, d) => `translateY(${y}px) rotate(${d}deg)`,
        [[0, 0, 0], [0.1, 4, -9], [0.22, 4, 9], [0.34, 4, -7], [0.46, 4, 6], [0.56, 5, 0], [0.85, 5, 0], [1, 0, 0]]), o),
      this.animate('upper', dy(hold(3)), o),
      this.animate('brow-l', brow(-14), o),
      this.animate('brow-r', brow(14), o),
      ...['lid-l', 'lid-r'].map(id => this.animate(id, dy([[0, -48], [0.1, -31], [0.85, -31], [1, -48]]), o)),
      ...['pupil-l', 'pupil-r'].map(id => this.animate(id, dy(hold(4)), o)),
    ], [[0, () => this.setMouth('sad')]]);
  }

  // Friendly hello.
  wave() {
    const o = { duration: 2100 };
    return this._run([
      this.animate('arm-l', rot([[0, 0], [0.06, -5], [0.22, 45], [0.82, 45], [1, 0]]), o),
      this.animate('forearm-l', rot([[0, 0], [0.06, 0], [0.22, 126], [0.32, 142], [0.42, 112], [0.52, 142],
        [0.62, 112], [0.72, 140], [0.82, 126], [1, 0]]), o),
      this.animate('head', rot([[0, 0], [0.22, -3], [0.82, -3], [1, 0]]), o),
      ...['brow-l', 'brow-r'].map(id => this.animate(id, dy([[0, 0], [0.2, -4], [0.82, -4], [1, 0]]), o)),
    ], [
      [0, () => this.setMouth('grin')],
      [260, () => this._hand('open')],
      [1900, () => this._hand('relaxed')],
    ]);
  }
}
