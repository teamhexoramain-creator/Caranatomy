// HTML/CSS motion-graphics layer drawn over the WebGL canvas. Every style is a
// pure function of t, so screenshots of the page are deterministic frames.
import { SEGMENTS, segTime, T, DURATION, PAGE } from './story.js';
import { clamp01, smooth, window01, easeOut, easeOutBack, lerp } from './anim.js';

const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };

export class Overlay {
  constructor(root) {
    this.root = root;
    this.frame = root.appendChild(h('<div class="o frame"><i></i><i></i><i></i><i></i></div>'));
    this.intro = root.appendChild(h(`
      <div class="o intro">
        <div class="tag"><b></b>${PAGE} <span>· EP.01</span></div>
        <div class="make">NISSAN</div>
        <div class="model"><div class="gtr">GT-R</div><div class="r35">R35</div></div>
        <div class="nick">“GODZILLA”</div>
        <div class="si">කාර් එකක් ඇතුළේ මොනවද තියෙන්නේ?</div>
      </div>`));
    this.header = root.appendChild(h(`
      <div class="o header">
        <div class="row"><div class="brand">GT-R <span>R35</span> · ANATOMY</div><div class="ep">EP.01</div></div>
        <div class="bars">${SEGMENTS.map(() => '<div><span></span></div>').join('')}</div>
      </div>`));
    this.bars = [...this.header.querySelectorAll('.bars span')];
    this.capScan = root.appendChild(h(`
      <div class="o caption"><div class="k">MODE // X-RAY</div><div class="t">X-RAY SCAN</div><div class="si">ඇතුළට බලමු</div></div>`));
    this.capExplode = root.appendChild(h(`
      <div class="o caption"><div class="k">MODE // EXPLODED</div><div class="t">EXPLODED VIEW</div><div class="si">කොටසින් කොටස</div></div>`));
    this.capBuild = root.appendChild(h(`
      <div class="o caption"><div class="k">MODE // ASSEMBLY</div><div class="t">REASSEMBLE</div><div class="si">ආයෙත් එකට</div></div>`));
    this.cards = SEGMENTS.map((s) => root.appendChild(h(`
      <div class="o card">
        <div class="head"><div class="idx">${s.idx}</div><div><div class="title">${s.title}</div></div></div>
        <div class="sub">${s.sub}</div>
        <div class="rule"></div>
        ${s.split ? `
          <div class="split">
            <div class="lbl"><span>FRONT</span><span>TORQUE SPLIT</span><span>REAR</span></div>
            <div class="bar"><div class="f"></div><div class="r"></div></div>
            <div class="pct"><span class="pf">0%</span><span class="pr">100%</span></div>
          </div>` : `
          <div class="stats">${s.stats.map(([v, u]) => `<div class="stat"><div class="v" data-v="${v}">${v}</div><div class="u">${u}</div></div>`).join('')}</div>`}
        <div class="note">${s.note}</div>
        <div class="si">${s.si}</div>
      </div>`)));
    this.leader = root.appendChild(h(`
      <svg class="leader" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <polyline fill="none" stroke="#ff7a1a" stroke-width="2.5" filter="url(#glow)"/>
        <circle r="9" fill="#ff7a1a" filter="url(#glow)"/>
        <circle r="22" fill="none" stroke="#ff7a1a" stroke-width="2" class="ring"/>
      </svg>`));
    this.outro = root.appendChild(h(`
      <div class="o outro">
        <div class="make">NISSAN</div>
        <div class="gtr">GT-R<span>R35</span></div>
        <div class="specs">
          <div><b>570</b><i>PS</i></div><div><b>637</b><i>NM</i></div><div><b>315</b><i>KM/H</i></div><div><b>AWD</b><i>ATTESA</i></div>
        </div>
      </div>`));
    this.cta = root.appendChild(h(`
      <div class="o cta">
        <div class="t">NEXT CAR <span>?</span></div>
        <div class="si">ඊළඟට මොන කාර් එකේ ඇනටමි එකද? Comment කරන්න</div>
        <div class="pill">FOLLOW ${PAGE}</div>
      </div>`));
    this.disc = root.appendChild(h('<div class="o disclaimer">Fan-made 3D illustration · not affiliated with Nissan · specs: GT-R R35 MY2017+</div>'));
  }

  /** proj(name) -> {x, y, visible} screen-space anchor of a system */
  update(t, proj) {
    const set = (el, o, tf = '') => { el.style.opacity = o.toFixed(3); el.style.transform = tf; };

    set(this.frame, window01(t, 0.6, DURATION - 0.6, 0.8, 0.6) * 0.9);

    // intro title
    const io = window01(t, 0.9, 5.7, 0.6, 0.6);
    set(this.intro, io, `translateY(${(1 - easeOut(clamp01((t - 0.9) / 1.2))) * 40}px)`);
    const kids = this.intro.children;
    for (let i = 0; i < kids.length; i++) {
      const a = 1.0 + i * 0.18;
      kids[i].style.opacity = smooth(a, a + 0.45, t).toFixed(3);
      kids[i].style.transform = `translateX(${(1 - easeOut(clamp01((t - a) / 0.7))) * -60}px)`;
    }

    // header + progress
    set(this.header, window01(t, 6.0, T.outro, 0.6, 0.5));
    SEGMENTS.forEach((_, i) => {
      const [a, b] = segTime(i);
      this.bars[i].style.transform = `scaleX(${clamp01((t - a) / (b - a)).toFixed(4)})`;
    });

    // captions
    const cap = (el, a, b) => {
      const o = window01(t, a, b, 0.4, 0.45);
      set(el, o, `translateX(${(1 - easeOut(clamp01((t - a) / 0.8))) * -50}px)`);
    };
    cap(this.capScan, T.scan[0] + 0.1, T.scan[1] + 0.35);
    cap(this.capExplode, T.explode + 0.5, T.tour + 0.2);
    cap(this.capBuild, T.reassemble + 0.5, T.scanBack[0] + 0.6);

    // spec cards + leader
    let leaderOn = 0, anchor = null, cardIdx = -1;
    SEGMENTS.forEach((s, i) => {
      const [a, b] = segTime(i);
      const el = this.cards[i];
      const o = window01(t, a + 0.75, b - 0.05, 0.35, 0.3);
      set(el, o, `translateY(${(1 - easeOut(clamp01((t - a - 0.75) / 0.6))) * 30}px)`);
      if (o <= 0) return;
      const local = t - a - 0.75;
      el.querySelector('.rule').style.transform = `scaleX(${easeOut(clamp01(local / 0.7))})`;
      const head = el.querySelector('.head');
      head.style.clipPath = `inset(0 ${(1 - easeOut(clamp01(local / 0.5))) * 100}% 0 0)`;
      el.querySelectorAll('.stat .v').forEach((v, j) => {
        const target = v.dataset.v;
        const k = easeOut(clamp01((local - 0.25 - j * 0.12) / 0.9));
        v.textContent = /^\d+$/.test(target) ? Math.round(Number(target) * k).toLocaleString('en-US') : target;
        v.parentElement.style.opacity = smooth(0.2 + j * 0.12, 0.5 + j * 0.12, local).toFixed(3);
      });
      if (s.split) {
        // torque split sweeps rear-biased -> 50:50 -> back
        const w = smooth(0.4, 1.6, local) - smooth(2.6, 3.3, local) * 0.55;
        const front = Math.round(lerp(2, 50, w));
        el.querySelector('.f').style.flex = `0 0 ${front}%`;
        el.querySelector('.pf').textContent = `${front}%`;
        el.querySelector('.pr').textContent = `${100 - front}%`;
      }
      if (o > leaderOn) { leaderOn = o; anchor = proj(s.sys); cardIdx = i; }
    });
    if (anchor && anchor.visible && cardIdx >= 0) {
      const local = t - segTime(cardIdx)[0] - 0.75;
      const k = easeOut(clamp01(local / 0.55));
      const x0 = anchor.x, y0 = anchor.y;
      const x2 = 70, y2 = 1120;
      const x1 = Math.min(Math.max(x0 - 60, 160), 980), y1 = 1120;
      // grow the polyline from the anchor
      const seg1 = Math.hypot(x1 - x0, y1 - y0), seg2 = Math.hypot(x2 - x1, y2 - y1);
      const L = (seg1 + seg2) * k;
      const p = [[x0, y0]];
      if (L <= seg1) p.push([lerp(x0, x1, L / seg1), lerp(y0, y1, L / seg1)]);
      else { p.push([x1, y1]); p.push([lerp(x1, x2, (L - seg1) / seg2), y1]); }
      this.leader.querySelector('polyline').setAttribute('points', p.map((q) => q.join(',')).join(' '));
      const dots = this.leader.querySelectorAll('circle');
      dots.forEach((c) => { c.setAttribute('cx', x0); c.setAttribute('cy', y0); });
      const pulse = (local * 1.2) % 1;
      dots[1].setAttribute('r', 10 + pulse * 26);
      dots[1].style.opacity = (1 - pulse).toFixed(3);
      this.leader.style.opacity = leaderOn.toFixed(3);
    } else {
      this.leader.style.opacity = 0;
    }

    // outro
    const oo = window01(t, T.outro + 0.6, DURATION - 0.2, 0.6, 0.8);
    set(this.outro, oo, `translateY(${(1 - easeOut(clamp01((t - T.outro - 0.6) / 1.0))) * 40}px)`);
    this.outro.querySelectorAll('.specs div').forEach((d, j) => {
      const a = T.outro + 1.1 + j * 0.15;
      d.style.opacity = smooth(a, a + 0.4, t).toFixed(3);
      d.style.transform = `scale(${lerp(0.85, 1, easeOutBack(clamp01((t - a) / 0.5)))})`;
    });
    const co = window01(t, T.outro + 2.1, DURATION - 0.2, 0.5, 0.8);
    set(this.cta, co, `translateY(${(1 - easeOut(clamp01((t - T.outro - 2.1) / 0.8))) * 30}px)`);
    set(this.disc, window01(t, T.outro + 2.5, DURATION - 0.2, 0.5, 0.8));
  }
}
