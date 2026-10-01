import assert from 'node:assert/strict';
import { G, metaBonus, metaBuy, metaCanBuy, isFruitUnlocked, unlockFruitForBoss, loadSave } from '../js/state.js';
import { FRUIT_TREES } from '../js/config.js';
import { NEW_FRUIT_NODES } from '../js/fruit_skills.js';
import * as P from '../js/fruit_effects.js';
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const unit=(props={})=>({x:0,y:0,hp:50,maxHp:100,type:'soldier',faction:'ally',...props});
const foe=(props={})=>({x:0,y:0,hp:100,maxHp:100,burnT:0,slowT:0,stunT:0,revealT:0,takeDamage(d){this.hp-=d;},...props});
let a,q,e,covered=new Set();
function test(key,fn,level=1) {
  G.run={mapIdx:0,elapsed:0,food:0,essencePool:0};G.time=10;G.save.nodes={['v_'+key]:level};
  a=unit();q=unit({type:'queen'});e=foe();
  P.fruitWorld.allies=[a];P.fruitWorld.allies.queen=q;P.fruitWorld.foes=[e];P.fruitWorld.home=()=>({x:0,y:0});P.fruitWorld.freeWorker=()=>true;
  fn();covered.add(key);console.log('ok '+key);
}
test('p1',()=>{near(P.fruitSpeed(a),1.35);G.run.elapsed=21;near(P.fruitSpeed(a),1);});
test('p2',()=>{P.fruitDeposit(a,10);near(q.hp,58);P.fruitDeposit(a,10);near(q.hp,58);G.run.elapsed=1;P.fruitDeposit(a,10);near(q.hp,66);});
test('p3',()=>{for(let i=1;i<=4;i++)near(P.fruitEnemyDamage(e,10,'ally',a),i===4?18:10);});
test('p4',()=>{near(P.fruitAllyDamage(a,20,e),8);near(P.fruitAllyDamage(a,20,e),20);G.run.elapsed=8;near(P.fruitAllyDamage(a,20,e),8);});
test('p5',()=>{for(let i=0;i<4;i++)near(P.fruitDeposit(a,10),i<3?20:10);});
test('p6',()=>{near(metaBonus().rangeBonus,45);const p=P.fruitProjectile({faction:'ally',vx:10,vy:20});near(p.vx,15);near(p.vy,30);});
test('p7',()=>{a.hp=20;near(P.fruitSpeed(a),1.6);a.hp=50;near(P.fruitSpeed(a),1);});
test('p8',()=>{e.slowT=1;const n=foe({x:10});P.fruitWorld.foes.push(n);P.fruitEnemyDamage(e,100,'ally',a);near(n.hp,85);P.fruitEnemyDamage(e,100,'ally',a);near(n.hp,85);});
test('p9',()=>{near(metaBonus().startWorkers,3);near(metaBonus().startFood,60);});
test('p10',()=>{for(let i=0;i<20;i++)P.fruitKill(e);near(a.hp,58);near(q.hp,58);});
test('p11',()=>{near(metaBonus().allSpeed,1.25);near(metaBonus().workerSpeed,1.25);near(metaBonus().fireRate,1.2);near(P.fruitSpeed(a),1.25);near(P.fruitAttackCd(a,1.2),1);near(P.fruitDeposit(a,10),20);});
test('f1',()=>{for(let i=0;i<3;i++)P.fruitEnemyDamage(e,1,'ally',a);near(e.slowT,2);});
test('f2',()=>{near(P.fruitEnemyDamage(e,10,'ally',a),16);e.hp=50;near(P.fruitEnemyDamage(e,10,'ally',a),10);});
test('f3',()=>near(P.fruitUnitStats('healer',{healRange:100}).healRange,170));
test('f4',()=>{a.hp=0;assert.equal(P.fruitSurvive(a),true);near(a.hp,25);a.hp=0;assert.equal(P.fruitSurvive(a),false);q.hp=0;assert.equal(P.fruitSurvive(q),false);});
test('f5',()=>{P.fruitAllyDamage(a,10,e);near(e.stunT,.4);e.stunT=0;P.fruitAllyDamage(a,10,e);near(e.stunT,0);});
test('f6',()=>{a.hp=20;near(P.fruitHealingMultiplier(a),1.5);a.hp=50;near(P.fruitHealingMultiplier(a),1);});
test('f7',()=>near(P.fruitDeposit(a,10),16));
test('f8',()=>{const s=P.fruitUnitStats('weaver',{speed:100,carry:1});near(s.speed,180);near(s.carry,3);});
test('f9',()=>{e.revealT=1;near(P.fruitEnemyDamage(e,10,'ally',a),12.5);});
test('f10',()=>{P.fruitTick(11);near(a.hp,50);P.fruitTick(1);near(a.hp,58);});
test('f11',()=>{near(metaBonus().healPower,1.4);a.hp=0;assert.equal(P.fruitSurvive(a),true);near(a.hp,50);a.hp=0;assert.equal(P.fruitSurvive(a),false);a.hp=50;P.fruitTick(1);near(a.hp,54);near(q.hp,54);});
test('s1',()=>{P.fruitEnemyDamage(e,1,'ally',a);near(e.burnT,3);near(e.burnDps,6);});
test('s2',()=>{e.burnT=1;P.fruitKill(e);near(G.run.food,4);});
test('s3',()=>{e.burnT=2;e.burnDps=8;const n=foe({x:10});P.fruitWorld.foes.push(n);P.fruitKill(e);near(n.burnT,2);near(n.burnDps,8);});
test('s4',()=>near(metaBonus().aoeMult,1.4));
test('s5',()=>near(P.fruitOrbSpeed(),2));
test('s6',()=>near(P.fruitAllyDamage(a,20,{x:300,y:0}),13));
test('s7',()=>{e.burnT=1;near(P.fruitEnemyDamage(e,10,'ally',a),13);});
test('s8',()=>{for(let i=0;i<5;i++)P.fruitEnemyDamage(e,1,'ally',a);near(e.weakT,4);});
test('s9',()=>{P.fruitDeath();near(G.run.essencePool,5);});
test('s10',()=>{e.burnT=1;for(let i=0;i<10;i++)P.fruitKill(e);near(q.hp,65);});
test('s11',()=>{P.fruitEnemyDamage(e,10,'ally',a);near(e.burnT,5);near(e.burnDps,12);near(P.fruitEnemyDamage(e,10,'ally',a),13.5);P.fruitKill(e);near(G.run.essencePool,3);});
test('d1',()=>{for(let i=1;i<=45;i++)near(P.fruitEnemyDamage(e,100,'ally',a),100+Math.min(i,40));G.run.elapsed=4;near(P.fruitEnemyDamage(e,100,'ally',a),101);});
test('d2',()=>near(metaBonus().hatchSpeed,.65));
test('d3',()=>{const p=P.fruitProjectile({faction:'ally'});near(p.burnDur,4);near(p.burnDps,8);});
test('d4',()=>{a.hp=30;near(P.fruitAllyDamage(a,20,e),15);});
test('d5',()=>{near(P.fruitGatherRate(),2);G.run.elapsed=30;near(P.fruitGatherRate(),1);});
test('d6',()=>{a.hp=30;near(P.fruitEnemyDamage(e,10,'ally',a),15);near(P.fruitEnemyDamage(e,10,'ally',{owner:a}),15);});
test('d7',()=>{let count=0;P.fruitWorld.freeWorker=()=>{count++;return true;};for(let i=0;i<40;i++)P.fruitBorn(unit());near(count,3);});
test('d8',()=>{for(let i=1;i<=6;i++)near(P.fruitAllyDamage(a,10,{isProjectile:true}),i%3===0?0:10);});
test('d9',()=>near(metaBonus().critChance,.15));
test('d10',()=>{e.burnT=1;const n=foe({x:10});P.fruitWorld.foes.push(n);P.fruitKill(e);near(n.hp,80);e.fruitSecondaryDeath=true;P.fruitKill(e);near(n.hp,80);});
test('d11',()=>{near(metaBonus().dmgAll,1.3);near(metaBonus().critChance,.2);near(metaBonus().popCap,6);const n=foe({x:10});P.fruitWorld.foes.push(n);for(let i=0;i<3;i++)P.fruitEnemyDamage(e,100,'ally',a);near(n.hp,65);});
test('o1',()=>{P.fruitBorn(a);near(a.fruitShield,20);near(P.fruitAllyDamage(a,30,e),10);near(a.fruitShield,0);});
test('o2',()=>{P.fruitKill(e);near(a.hp,58);});
test('o3',()=>{e.hp=10;near(P.fruitEnemyDamage(e,10,'ally',a),20);e.isBoss=true;near(P.fruitEnemyDamage(e,10,'ally',a),12);});
test('o4',()=>{P.fruitDeposit(a,10);near(G.run.essencePool,1);});
test('o5',()=>{P.fruitDeposit(a,10);near(a.hp,58);});
test('o6',()=>{assert.equal(P.fruitIgnoreSlow(a),true);a.x=300;assert.equal(P.fruitIgnoreSlow(a),false);});
test('o7',()=>{q.hp=0;assert.equal(P.fruitSurvive(q),true);near(q.hp,30);q.hp=0;assert.equal(P.fruitSurvive(q),false);});
test('o8',()=>near(metaBonus().queenRegen,3));
test('o9',()=>{P.fruitRally([a]);near(a.hp,75);P.fruitRally([a]);near(a.hp,75);});
test('o10',()=>{for(let i=0;i<50;i++)P.fruitKill(e);near(G.run.food,30);near(G.run.essencePool,15);});
test('o11',()=>{near(metaBonus().hpAll,1.3);near(metaBonus().queenHp,1.3);P.fruitBorn(a);near(a.fruitShield,35);P.fruitQueenBorn(q);near(q.fruitShield,35);for(let i=0;i<10;i++)P.fruitKill(e);near(a.hp,62);near(q.hp,62);});
test('i1',()=>{for(let i=0;i<3;i++)P.fruitEnemyDamage(e,1,'ally',a);near(e.slowT,3);near(e.stunT,.35);});
test('i2',()=>{e.slowT=1;near(P.fruitEnemyDamage(e,10,'ally',a),16);});
test('i3',()=>{near(P.fruitAllyDamage(a,20,e),14);near(P.fruitAllyDamage(a,2,e),1);});
test('i4',()=>{const s=P.fruitUnitStats('tank',{hp:100,speed:100});near(s.hp,140);near(s.speed,90);});
test('i5',()=>{G.save.nodes.v_i1=1;for(let i=0;i<3;i++)P.fruitEnemyDamage(e,1,'ally',a);near(e.slowT,6);});
test('i6',()=>{for(let i=1;i<=4;i++){const p=P.fruitProjectile({faction:'ally'});if(i===4)near(p.aoe,90);else assert.equal(p.aoe,undefined);}});
test('i7',()=>{a.hp=100;near(P.fruitAttackCd(a,1.3),1);a.hp=50;near(P.fruitAttackCd(a,1.3),1.3);});
test('i8',()=>{P.fruitQueenBorn(q);near(q.fruitShield,20);near(P.fruitAllyDamage(q,30,e),10);});
test('i9',()=>{e.isBoss=true;near(P.fruitEnemyDamage(e,10,'ally',a),12.5);});
test('i10',()=>{const n=foe({x:10});P.fruitWorld.foes.push(n);for(let i=0;i<15;i++)P.fruitKill(e);near(n.stunT,1);});
test('i11',()=>{P.fruitEnemyDamage(e,10,'ally',a);near(e.slowT,3);e.isBoss=true;near(P.fruitEnemyDamage(e,10,'ally',a),14);near(P.fruitAllyDamage(a,20,e),15);near(P.fruitAllyDamage(q,20,e),15);});
test('a1',()=>near(metaBonus().startEssence,100));
test('a2',()=>{for(let i=1;i<=5;i++)near(P.fruitEnemyDamage(e,10,'ally',a),i===5?20:10);near(q.hp,52);});
test('a3',()=>near(metaBonus().xpGain,1.4));
test('a4',()=>{near(metaBonus().healPower,1.35);near(metaBonus().allHealing,1.35);});
test('a5',()=>{for(let i=1;i<=6;i++){const u=unit();P.fruitBorn(u);near(u.fruitShield,i<=5?50:0);}});
test('a6',()=>{a.hp=0;assert.equal(P.fruitSurvive(a),true);near(a.hp,10);a.hp=0;assert.equal(P.fruitSurvive(a),false);G.run.elapsed=30;assert.equal(P.fruitSurvive(a),true);});
test('a7',()=>near(P.fruitSight(),1.5));
test('a8',()=>near(P.fruitOrbExtra(),2));
test('a9',()=>near(P.fruitAllyDamage(q,20,e),16));
test('a10',()=>{q.hp=20;P.fruitTick(.1);near(q.hp,60);near(a.hp,90);q.hp=20;P.fruitTick(.1);near(q.hp,20);});
test('a11',()=>{near(metaBonus().essMult,2);near(metaBonus().xpGain,2);near(metaBonus().dmgAll,1.35);near(metaBonus().hpAll,1.35);near(metaBonus().queenRegen,15);});
assert.equal(NEW_FRUIT_NODES.length,77);assert.equal(covered.size,77);
assert.deepEqual(new Set(NEW_FRUIT_NODES.map(n=>n.key)),covered,'cada habilidade tem teste de comportamento');
assert.equal(FRUIT_TREES.length,7);
// Cada um dos 20 poderes com flores: comportamento real em 0/1/2/3,
// não só autorização/preço de compra. Conservador +25%/+50% sobre o bônus.
const rankCases = {
  p1: [()=>P.fruitSpeed(a)-1,[0,.35,.4375,.525]],
  p2: [()=>{P.fruitDeposit(a,10);return q.hp-50;},[0,8,10,12]],
  p3: [()=>{let n;for(let i=0;i<4;i++)n=P.fruitEnemyDamage(e,10,'ally',a);return n-10;},[0,8,10,12]],
  p4: [()=>40-P.fruitAllyDamage(a,40,e),[0,12,15,18]],
  p5: [()=>P.fruitDeposit(a,10)-10,[0,10,12.5,15]],
  p6: [()=>metaBonus().rangeBonus,[0,45,56,68]],
  p7: [()=>{a.hp=20;return P.fruitSpeed(a)-1;},[0,.6,.75,.9]],
  p8: [()=>{e.slowT=1;const n=foe({x:10});P.fruitWorld.foes.push(n);P.fruitEnemyDamage(e,100,'ally',a);return 100-n.hp;},[0,15,18.75,22.5]],
  p9: [()=>metaBonus().startFood,[0,60,75,90]],
  p10: [()=>{for(let i=0;i<20;i++)P.fruitKill(e);return a.hp-50;},[0,8,10,12]],
  f1: [()=>{for(let i=0;i<3;i++)P.fruitEnemyDamage(e,1,'ally',a);return e.slowT;},[0,2,2.5,3]],
  f2: [()=>P.fruitEnemyDamage(e,10,'ally',a)-10,[0,6,7.5,9]],
  f3: [()=>P.fruitUnitStats('healer',{healRange:100}).healRange-100,[0,70,87.5,105]],
  f4: [()=>{a.hp=0;P.fruitSurvive(a);const n=a.hp;a.hp=0;assert.equal(P.fruitSurvive(a),false,'um resgate por irmã');return n;},[0,25,31.25,37.5]],
  f5: [()=>{P.fruitAllyDamage(a,10,e);return e.stunT;},[0,.4,.5,.6]],
  f6: [()=>{a.hp=20;return P.fruitHealingMultiplier(a)-1;},[0,.5,.625,.75]],
  f7: [()=>P.fruitDeposit(a,10)-10,[0,6,8,9]],
  f8: [()=>P.fruitUnitStats('weaver',{speed:100,carry:1}).speed-100,[0,80,100,120]],
  f9: [()=>{e.revealT=1;return P.fruitEnemyDamage(e,10,'ally',a)-10;},[0,2.5,3.125,3.75]],
  f10: [()=>{P.fruitTick(12);return a.hp-50;},[0,8,10,12]],
};
for(const [key,[evaluate,expected]] of Object.entries(rankCases)) {
  for(let level=0;level<=3;level++)test(key,()=>near(evaluate(),expected[level]),level);
  const n=NEW_FRUIT_NODES.find(n=>n.key===key);
  assert.equal(n.levelDescriptions.length,3);
  assert.equal(new Set(n.levelDescriptions).size,3,'a UI descreve três benefícios distintos');
}
for(const [level,expected] of [[1,1.5],[2,1.625],[3,1.75]])test('p6',()=>near(P.fruitProjectile({faction:'ally',vx:1,vy:0}).vx,expected),level);
for(const [level,expected] of [[1,3],[2,4],[3,5]])test('p9',()=>near(metaBonus().startWorkers,expected),level);
for(const [level,expected] of [[1,3],[2,4],[3,4]])test('f8',()=>near(P.fruitUnitStats('weaver',{speed:100,carry:1}).carry,expected),level);
// Compras existentes de outras árvores continuam nível único; inválidos não
// dão potência extra e gatilhos/limites não crescem com o nível.
test('p5',()=>{for(let i=0;i<3;i++)P.fruitDeposit(a,10);near(P.fruitDeposit(a,10),10);},3);
test('p4',()=>{near(P.fruitAllyDamage(a,40,e),22);near(P.fruitAllyDamage(a,40,e),40);},3);
test('f5',()=>{P.fruitAllyDamage(a,10,e);e.stunT=0;P.fruitAllyDamage(a,10,e);near(e.stunT,0);},3);
// Persistência e autoridade do chefe: visitante, chefe errado e modo errado não liberam.
G.save.nodes={};G.save.clearedMaps={};G.save.essence=500000;G.save.era=0;
for(const f of FRUIT_TREES) {
  assert.equal(f.newNodes.length,11);assert.equal(new Set(f.newNodes.map(n=>n.name)).size,11);
  for(const n of f.newNodes)assert.equal(metaCanBuy(n.id).ok,false);
  assert.equal(unlockFruitForBoss(f.map,'wrong','campanha'),false);
  assert.equal(unlockFruitForBoss(f.map,f.boss,'sobrevivencia'),false);
  if(f.pending) {
    assert.equal(unlockFruitForBoss(f.map,f.boss,'campanha'),false);
    G.save.clearedMaps.topo=true;assert.equal(isFruitUnlocked('topo'),false);
    for(const n of f.newNodes)assert.equal(metaBuy(n.id),false);
  } else {
    assert.equal(unlockFruitForBoss(f.map,f.boss,'campanha'),true);
    assert.equal(unlockFruitForBoss(f.map,f.boss,'campanha'),false,'não duplica recompensa');
    const sup = f.newNodes[10];
    assert.equal(sup.supreme, true, '11º nó global é a Flor Suprema');
    assert.equal(metaBuy(sup.id), false, 'Flor Suprema exige todas as 13 flores maximizadas');
    // Qualquer flor regular (inclusive a 10ª) pode ser comprada livremente sem pré-requisito
    for(const n of f.newNodes.slice(0, 10).reverse()){
      assert.equal(n.cost.length, ['planicie', 'floresta', 'pantano'].includes(f.map) ? 3 : 1);
      for(let lv = 0; lv < n.cost.length; lv++) {
        const before = G.save.essence;
        assert.equal(metaBuy(n.id), true);
        near(G.save.essence, before - n.cost[lv]);
      }
      assert.equal(metaBuy(n.id), false);
    }
    assert.equal(metaBuy(sup.id), false, 'Flor Suprema ainda exige as 3 flores legadas maximizadas');
    for(const n of f.legacyNodes) {
      for(let lv = 0; lv < n.cost.length; lv++) assert.equal(metaBuy(n.id), true);
    }
    assert.equal(sup.cost.length, 1, 'Flor Suprema tem compra única');
    const beforeSup = G.save.essence;
    assert.equal(metaBuy(sup.id), true, 'Flor Suprema desbloqueia após maximizar as 13 flores');
    near(G.save.essence, beforeSup - sup.cost[0]);
    assert.equal(metaBuy(sup.id), false);
  }
}
G.save.nodes={};loadSave();assert.equal(Object.keys(G.save.nodes).length,84,'84 compras de frutos (66 novas + 18 legadas) persistem');
// Novos poderes ativos independentemente do mapa; não dependem de estar no bioma natal.
for(let i=0;i<6;i++){G.run.mapIdx=i;assert.equal(P.hasFruitPower('p1'),true);assert.equal(P.hasFruitPower('i9'),true);near(metaBonus().rangeBonus,68);}
console.log('77 PODERES OK — 70 regulares (níveis 1–3) + 7 Flores Supremas, efeitos por rank, limites, sinergias e Pálida bloqueada');
