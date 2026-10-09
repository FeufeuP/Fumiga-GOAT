// Original opaque paper images, with individually audited protected ornaments.
import { IMG } from './assets.js';
import { registerPaperSurface } from './font.js';

// Protected islands (corners + centre knots) and repeatable corridors, audited
// separately on each painting. Only the quiet paper interior is stretched;
// Legacy edge corridors repeat at the same scale. The new button/pause use
// quiet three-slice corridors and individually scaled ornament corners.
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
// Frame inset is independent of the hitbox: ornate source images used to
// consume 30% of every control. Keep the original cuts, at a bounded scale.
const EDGE_SCALE = {panel:.065, button:.10, health:.12, banner:.14, minimap:.10, card:.085, pause:.07, tooltip:.065};
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
function axisCuts(cuts, source, target, scale) {
  const src=[0,...cuts.map(v=>Math.round(v*source)),source];
  const extra=Math.max(0,target-source*scale);
  const dst=src.map((v,i)=>Math.round(v*scale+(i>=2?extra/2:0)+(i>=4?extra/2:0)));
  dst[dst.length-1]=target;
  return [src,dst];
}
export function paperGeometry(kind, sw, sh, w, h) {
  const m=PAPER_SLICES[kind]||PAPER_SLICES.panel;
  const scale=Math.min(w/sw,h/sh,EDGE_SCALE[kind]||.065);
  const [sx,dx]=axisCuts(m.x,sw,w,scale),[sy,dy]=axisCuts(m.y,sh,h,scale);
  return {sx,sy,dx,dy,scale};
}
// Repeat only along the long dimension of an edge. Final segment is cropped,
// not compressed; every wood knot/leaf retains its original aspect ratio.
function edge(c,img,sx,sy,sw,sh,dx,dy,dw,dh,vertical) {
  const step=vertical ? Math.max(1,Math.round(sh*dw/sw)) : Math.max(1,Math.round(sw*dh/sh));
  const length=vertical?dh:dw;
  for(let at=0;at<length;at+=step) {
    const n=Math.min(step,length-at), f=n/step;
    c.drawImage(img,sx,sy,vertical?sw:sw*f,vertical?sh*f:sh,
      dx+(vertical?0:at),dy+(vertical?at:0),vertical?dw:n,vertical?n:dh);
  }
}
function tileFor(img, kind, w, h, state) {
  const key = `${kind}:${w}:${h}:${state}`;
  const old = cache.get(key);
  if (old && old.image === img) return old.canvas;
  if (old) { pixels -= old.canvas.width*old.canvas.height; cache.delete(key); }
  const tile = document.createElement('canvas'); tile.width=w; tile.height=h;
  const c=tile.getContext('2d');
  // The paintings no longer carry a cream matte: the sheet around the drawing
  // is transparent, so the tile starts empty and only the art is composited.
  // The enclosed paper interior of each frame is still opaque in the source,
  // so text keeps a readable surface.
  c.imageSmoothingEnabled=true;
  if(kind==='button'||kind==='pause') {
    const cuts=kind==='button'?{x:[.25,.75],y:[.2,.8],cap:.15}:{x:[.32,.76],y:[.3,.75],cap:.055};
    const scale=Math.min(w/img.width,h/img.height,cuts.cap);
    const sx=[0,...cuts.x.map(v=>Math.round(v*img.width)),img.width];
    const sy=[0,...cuts.y.map(v=>Math.round(v*img.height)),img.height];
    const dx=[0,Math.round(sx[1]*scale),w-Math.round((img.width-sx[2])*scale),w];
    const dy=[0,Math.round(sy[1]*scale),h-Math.round((img.height-sy[2])*scale),h];
    for(let r=0;r<3;r++)for(let col=0;col<3;col++) {
      const dw=dx[col+1]-dx[col],dh=dy[r+1]-dy[r];
      if(dw>0&&dh>0)c.drawImage(img,sx[col],sy[r],sx[col+1]-sx[col],sy[r+1]-sy[r],dx[col],dy[r],dw,dh);
    }
  } else {
    const {sx,sy,dx,dy}=paperGeometry(kind,img.width,img.height,w,h);
    // Fill all 25 cells. No contain-on-matte branch: frames now actually enclose
    // tall content. Corners/knots retain uniform scale; texture stays opaque.
    for(let row=0;row<5;row++) for(let col=0;col<5;col++) {
      const dw=dx[col+1]-dx[col],dh=dy[row+1]-dy[row];
      const sw=sx[col+1]-sx[col],sh=sy[row+1]-sy[row];
      if(dw<=0||dh<=0) continue;
      if((row===0||row===4)&&(col===1||col===3))
        edge(c,img,sx[col],sy[row],sw,sh,dx[col],dy[row],dw,dh,false);
      else if((col===0||col===4)&&(row===1||row===3))
        edge(c,img,sx[col],sy[row],sw,sh,dx[col],dy[row],dw,dh,true);
      else c.drawImage(img,sx[col],sy[row],sw,sh,dx[col],dy[row],dw,dh);
    }
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
      const s=Math.max(4,Math.min(9,h*.19)), x=w-inset-s*2.5,y=h*.5;
      c.strokeStyle='#456032';c.lineWidth=Math.max(2,s*.3);c.lineCap='round';
      c.beginPath();c.moveTo(x,y);c.lineTo(x+s*.55,y+s*.5);c.lineTo(x+s*1.5,y-s*.6);c.stroke();
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
  ctx.save();ctx.globalAlpha=1;
  const ix=x+w*.13,iy=y+h*.36,iw=w*.74,ih=Math.max(2,h*.30);
  ctx.fillStyle='#d0b995';ctx.fillRect(ix,iy,iw,ih);
  const g=ctx.createLinearGradient(0,iy,0,iy+ih);
  g.addColorStop(0,opt.low?'#cd6952':'#dcaa56');g.addColorStop(1,opt.low?'#9e332b':'#a36223');
  ctx.fillStyle=g;ctx.fillRect(ix,iy,Math.round(iw*frac),ih);
  ctx.restore();return true;
}
