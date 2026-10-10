// Original opaque paper paintings, rendered without ever stretching a pixel.
// Each painting is textured everywhere (fibres, cuts, pigment), so the old
// "stretch the quiet interior" model smeared the art and crushed the ornate
// islands to ~6% — details vanished. New contract: ONE uniform scale per box
// (bounded so details stay readable), frame islands cropped like a cover when
// the box is thin, and every corridor repeated (tiled) at that same scale.
import { IMG } from './assets.js';
import { registerPaperSurface } from './font.js';

// Audited cuts on each painting: [left island | corridor | centre island |
// corridor | right island] per axis. Islands keep their aspect (uniform scale
// or crop); corridors tile. Same cuts as the audited paintings deserve — the
// slices were never the problem, the stretching was.
export const PAPER_SLICES = Object.freeze({
  panel:   { x: [.38,.45,.57,.65], y: [.32,.39,.57,.69] },
  button:  { x: [.25,.40,.60,.75], y: [.20,.35,.60,.80] },
  health:  { x: [.18,.38,.58,.79], y: [.35,.42,.58,.65] },
  banner:  { x: [.39,.47,.60,.79], y: [.32,.42,.56,.65] },
  minimap: { x: [.27,.40,.54,.62], y: [.38,.44,.57,.66] },
  card:    { x: [.35,.44,.55,.68], y: [.25,.34,.63,.74] },
  pause:   { x: [.32,.43,.55,.68], y: [.31,.38,.59,.70] },
  tooltip: { x: [.35,.44,.57,.70], y: [.36,.44,.59,.69] },
});
// Uniform scale bounds. Floor keeps leaf/knot detail readable even in tiny
// boxes (the cover crop does the fitting); cap stops huge modals from drowning
// their own text area in frame. Frame islands cover at most ~22% per side.
const S_FLOOR = .16, S_CAP = .45, FRAME_MAX = .22;
export function paperSource(kind,w,h) {
  if(kind==='tooltip'||kind==='pause'||kind==='button') return kind; // explicit functional art
  if(kind==='panel'||kind==='card') {
    return h>w*1.12 ? 'card' : h>w*.68 ? 'pause' : 'panel';
  }
  return kind;
}
const cache = new Map();
const MAX_PIXELS = 8 * 1024 * 1024;
let pixels = 0;
export function paperReady() { return !!IMG.paper_panel; }
export function paperState(opt = {}) {
  return opt.disabled ? 'disabled' : opt.pressed ? 'pressed' : opt.selected ? 'selected' : opt.hot ? 'hover' : 'normal';
}
// Per-axis layout: [island | corridor | centre | corridor | island] with the
// two islands sized by uniform scale (cropped by FRAME_MAX when the box is
// thin), the centre kept at uniform scale (the knot island), and corridors
// splitting whatever remains — they tile, so any width is honest.
function axisLayout(cuts, src, dst, s, fmax) {
  const [c1,c2,c3,c4] = cuts;
  let L = Math.min(c1*src*s, dst*fmax);
  let R = Math.min((1-c4)*src*s, dst*fmax);
  let mid = (c3-c2)*src*s;
  const maxBoth = dst*.6;
  if(L+R > maxBoth) { const k=maxBoth/(L+R); L*=k; R*=k; }
  let avail = dst - L - R;
  if(avail < 0) avail = 0;
  if(mid > avail*.55) mid = avail*.55;
  const w1 = c2-c1, w2 = c4-c3, tot = (w1+w2)||1;
  const rest = Math.max(0, avail - mid);
  const corr1 = rest*w1/tot, corr2 = rest-corr1;
  const dx = [0, L, L+corr1, L+corr1+mid, dst-R, dst];
  const half = (c2+c3)/2*src;
  let s2 = half - mid/(2*s), s3 = half + mid/(2*s);
  let s1 = Math.min(L/s, s2*.98);
  let s4 = Math.max(src - R/s, s3+(src-s3)*.02);
  if(s2 < s1) s2 = s1;
  if(s3 < s2) s3 = s2;
  if(s4 < s3) s4 = s3;
  return { src:[0,s1,s2,s3,s4,src], dst:dx, l:L, r:R };
}
export function paperGeometry(kind, sw, sh, w, h) {
  const m=PAPER_SLICES[kind]||PAPER_SLICES.panel;
  const s = Math.max(S_FLOOR, Math.min(S_CAP, Math.min(w/sw, h/sh)));
  const ax = axisLayout(m.x, sw, w, s, FRAME_MAX);
  const ay = axisLayout(m.y, sh, h, s, FRAME_MAX);
  return { sx:ax.src, sy:ay.src, dx:ax.dst, dy:ay.dst, scale:s,
           lx:ax.l, rx:ax.r, ty:ay.l, by:ay.r };
}
// One cell of the 5x5 grid. Modes per axis: 'u' draws at uniform scale (the
// island is pre-cropped for cover), 't' repeats the source slice and crops the
// last repetition. No code path scales an axis non-uniformly — ever. Tiled
// cells fill through a repeating pattern (one operation per cell, seamless)
// instead of dozens of drawImage calls.
const SUBS = new Map();
function subCanvas(img, sx, sy, sw, sh) {
  const key = sx+','+sy+','+sw+','+sh+','+(img.width*1000+img.height);
  let cv = SUBS.get(key);
  if (cv && cv.__img === img) return cv;
  cv = document.createElement('canvas');
  cv.__img = img;
  cv.width = Math.max(1, Math.round(sw));
  cv.height = Math.max(1, Math.round(sh));
  cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  if (SUBS.size > 256) SUBS.clear();
  SUBS.set(key, cv);
  return cv;
}
function cell(c,img,sx,sy,sw,sh,dx,dy,dw,dh,modeX,modeY,s) {
  if(dw<=0||dh<=0||sw<=0||sh<=0) return;
  if(modeX==='u'&&modeY==='u') {
    c.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);
    return;
  }
  if (typeof c.createPattern === 'function') {
    const pat = c.createPattern(subCanvas(img,sx,sy,sw,sh),'repeat');
    if (pat && typeof DOMMatrix !== 'undefined' && pat.setTransform) {
      pat.setTransform(new DOMMatrix([s,0,0,s,dx,dy]));
      c.save();
      c.fillStyle = pat;
      c.fillRect(dx,dy,dw,dh);
      c.restore();
      return;
    }
  }
  // Fallback sem DOMMatrix: repetição manual, ainda em escala uniforme.
  const stepX = Math.max(1, sw*s), stepY = Math.max(1, sh*s);
  for(let at=0;at<dh;at+=stepY) {
    const ny=Math.min(stepY,dh-at), fy=ny/stepY;
    for(let bx=0;bx<dw;bx+=stepX) {
      const nx=Math.min(stepX,dw-bx), fx=nx/stepX;
      c.drawImage(img,sx,sy,sw*fx,sh*fy,dx+bx,dy+at,nx,ny);
    }
  }
}
function tileFor(img, kind, w, h, state) {
  const key = `${kind}:${w}:${h}:${state}`;
  const old = cache.get(key);
  if (old && old.image === img) return old.canvas;
  if (old) { pixels -= old.canvas.width*old.canvas.height; cache.delete(key); }
  const tile = document.createElement('canvas'); tile.width=w; tile.height=h;
  const c=tile.getContext('2d');
  // The paintings carry no cream matte: the sheet around the drawing is
  // transparent; the enclosed paper interior is opaque and keeps text readable.
  c.imageSmoothingEnabled=true;
  const {sx,sy,dx,dy,scale:s}=paperGeometry(kind,img.width,img.height,w,h);
  const modes=['u','t','u','t','u'];
  for(let row=0;row<5;row++) for(let col=0;col<5;col++) {
    cell(c,img,
      sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],
      dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row],
      modes[col],modes[row],s);
  }
  // State treatment changes depth and adds a readable selection mark, never
  // reduces background opacity or puts a generic stroke around the rectangle.
  // It is clipped to the painted pixels ('source-atop') so no state repaints a
  // rectangle over the transparent sheet that was just removed.
  if(state !== 'normal') {
    c.globalCompositeOperation='source-atop';
    const inset = Math.max(2, Math.min(6,h*.12));
    const g=c.createLinearGradient(0,0,0,h);
    if(state==='pressed') {
      g.addColorStop(0,'rgba(73,53,33,.62)'); g.addColorStop(.5,'rgba(73,53,33,.25)'); g.addColorStop(1,'rgba(73,53,33,.16)');
    } else if(state==='disabled') {
      g.addColorStop(0,'rgba(236,225,200,.72)'); g.addColorStop(1,'rgba(164,149,121,.55)');
    } else if(state==='selected') {
      g.addColorStop(0,'rgba(149,173,96,.46)'); g.addColorStop(1,'rgba(105,132,61,.34)');
    } else {
      g.addColorStop(0,'rgba(255,249,225,.65)'); g.addColorStop(.55,'rgba(255,249,225,0)'); g.addColorStop(1,'rgba(83,62,34,.24)');
    }
    c.fillStyle=g; c.fillRect(inset,inset,w-inset*2,h-inset*2);
    if(state==='selected') {
      c.globalCompositeOperation='source-over'; // the mark must stay readable
      const s2=Math.max(4,Math.min(9,h*.19)), x=w-inset-s2*2.5,y=h*.5;
      c.strokeStyle='#456032';c.lineWidth=Math.max(2,s2*.3);c.lineCap='round';
      c.beginPath();c.moveTo(x,y);c.lineTo(x+s2*.55,y+s2*.5);c.lineTo(x+s2*1.5,y-s2*.6);c.stroke();
    }
    c.globalCompositeOperation='source-over';
  }
  while(cache.size && (cache.size>=160 || pixels+w*h>MAX_PIXELS)) {
    const first=cache.keys().next().value, entry=cache.get(first);
    pixels-=entry.canvas.width*entry.canvas.height;cache.delete(first);
  }
  if(w*h<=MAX_PIXELS) { cache.set(key,{canvas:tile,image:img});pixels+=w*h; }
  return tile;
}
export function drawPaper(ctx, kind, x, y, w, h, opt = {}) {
  // Functional paintings from the publication lot; no replacement shapes.
  const source = paperSource(kind,w,h);
  const img = IMG['paper_' + source];
  if(!img || typeof document==='undefined') return false;
  w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
  const tile=tileFor(img,source,w,h,paperState(opt));
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.drawImage(tile,Math.round(x),Math.round(y));ctx.restore();
  registerPaperSurface(ctx,x,y,w,h);
  return true;
}
export function drawPaperBar(ctx,x,y,w,h,frac,opt={}) {
  if(!drawPaper(ctx,'health',x,y,w,h)) return false;
  frac=Math.max(0,Math.min(1,Number.isFinite(frac)?frac:0));
  const img=IMG.paper_health;
  const g=img?paperGeometry('health',img.width,img.height,Math.round(w),Math.round(h)):null;
  const ix=x+(g?g.lx+2:w*.16), iy=y+(g?g.ty+1:h*.34);
  const iw=Math.max(2,w-(g?g.lx+g.rx+4:w*.30)), ih=Math.max(2,h-(g?g.ty+g.by+2:h*.36));
  ctx.save();ctx.globalAlpha=1;
  ctx.fillStyle='#d0b995';ctx.fillRect(ix,iy,iw,ih);
  const gr=ctx.createLinearGradient(0,iy,0,iy+ih);
  gr.addColorStop(0,opt.low?'#cd6952':'#dcaa56');gr.addColorStop(1,opt.low?'#9e332b':'#a36223');
  ctx.fillStyle=gr;ctx.fillRect(ix,iy,Math.round(iw*frac),ih);
  ctx.restore();return true;
}
