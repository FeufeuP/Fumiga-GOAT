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
 assert.equal(data[25],2,`${r.id}: RGB opaque PNG`);
 assert.equal(r.backup.verified,true);assert.equal(r.backup.sha256,r.source_sha256);
 const key=r.id==='brasa'?'i_ember':'paper_'+({botao:'button',pausa:'pause'}[r.id]||r.id);
 const assets=fs.readFileSync(new URL('game/js/assets.js',root),'utf8');
 const match=assets.match(new RegExp('\\b'+key+':\\s*"([^"]+)"'));
 assert(match,`${key}: manifest entry missing`);
 assert.equal('game/assets/'+match[1],r.runtime,`${key}: real consumer`);
}
console.log('HUD PUBLICATION OK — four exact RGB assets, manifest wiring, remote hashes recorded');
