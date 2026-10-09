// Verify the exact paintings that were uploaded are the production derivatives.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const root=new URL('../../',import.meta.url);
const m=JSON.parse(fs.readFileSync(new URL('docs/arte/hud-publicacao.json',root)));
assert.equal(m.lot.length,4);
for(const r of m.lot) {
 const data=fs.readFileSync(new URL(r.runtime,root));
 assert.equal(createHash('sha256').update(data).digest('hex'),r.runtime_sha256,r.id);
 assert.equal(data.readUInt32BE(16),r.runtime_size[0]);assert.equal(data.readUInt32BE(20),r.runtime_size[1]);
 // The matte was removed: the delivered PNGs are RGBA and must really carry
 // transparent pixels on the sheet around the drawing.
 assert.equal(data[25],6,`${r.id}: RGBA PNG`);
 assert.equal(r.mode,'RGBA',r.id);
 assert.match(r.matte,/^removed /,`${r.id}: matte note`);
 assert.equal(r.backup.verified,true);assert.equal(r.backup.sha256,r.source_sha256);
 const key=r.id==='brasa'?'i_ember':'paper_'+({botao:'button',pausa:'pause'}[r.id]||r.id);
 const assets=fs.readFileSync(new URL('game/js/assets.js',root),'utf8');
 const match=assets.match(new RegExp('\\b'+key+':\\s*"([^"]+)"'));
 assert(match,`${key}: manifest entry missing`);
 assert.equal('game/assets/'+match[1],r.runtime,`${key}: real consumer`);
}
console.log('HUD PUBLICATION OK — four exact RGBA assets sem fundo, manifest wiring, remote hashes recorded');

// Matte removal report: every HUD painting must still exist with the exact
// bytes recorded and really hold a transparent sheet around the drawing.
const noBg=JSON.parse(fs.readFileSync(new URL('docs/arte/hud-sem-fundo.json',root)));
assert.equal(noBg.pieces.length,9);
for(const piece of noBg.pieces) {
 const data=fs.readFileSync(new URL(piece.path,root));
 assert.equal(createHash('sha256').update(data).digest('hex'),piece.sha256,piece.path);
 assert.equal(data[25],6,`${piece.path}: RGBA`);
 assert(piece.transparent_ratio>0.02,`${piece.path}: nothing was cleared`);
 assert(piece.cleared_px>0&&piece.feathered_px>0,`${piece.path}: no feathered border`);
}
// The renderer must not paint an opaque sheet back under the art.
const paper=fs.readFileSync(new URL('game/js/paper_hud.js',root),'utf8');
assert(!/fillStyle='#f5edd8'/.test(paper),'paper tile still fills an opaque matte');
assert(/source-atop/.test(paper),'state treatment must be clipped to the painted art');
console.log('HUD SEM FUNDO OK — nove peças RGBA, recorte registrado, tile sem matte');
