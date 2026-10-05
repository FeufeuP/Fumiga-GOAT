// 77 habilidades NOVAS (10 livres + 1 Flor Suprema por fruto). Os 18 nós anteriores são preservados como legado.
// IDs estáveis e custos de nível único (exceto mundos com santuário de flores:
// passos de preço por mundo em FLOWER_STEPS); a 14ª flor é a Flor Suprema de compra única.
// Santuários com folha de flores própria ganham 3 níveis de compra por nó regular.
// Passos aprovados: planície +30/+60 (2026-09-29), floresta +35/+70 (2026-09-30), pântano +40/+80 (2026-10-01).
const FLOWER_STEPS = { planicie: [0, 30, 60], floresta: [0, 35, 70], pantano: [0, 40, 80] };
const SUPREME_COSTS = [500, 580, 660, 750, 840, 920, 1000];
export const FRUIT_SKILLS = {
  planicie: [
    ['p1','Corrida do Amanhecer','Nos primeiros 20s da expedição, irmãs se movem 35% mais rápido.','bolt'],
    ['p2','Gotas para a Rainha','Entregar comida cura 8 de vida da rainha. Intervalo de 1s entre curas.','heal'],
    ['p3','Cadência do Tambor','Cada quarto golpe direto da colônia causa 80% de dano extra.','fist'],
    ['p4','Capim Escudo','Cada irmã reduz um golpe em 12 de dano. Recarrega após 8s; mínimo 1 de dano.','shield'],
    ['p5','Primeira Colheita','As três primeiras entregas de comida de cada irmã rendem o dobro.','food'],
    ['p6','Vento nas Mandíbulas','Projéteis aliados viajam 50% mais rápido; alcance de ataque aumenta em 45.','wing_gem'],
    ['p7','Fuga entre as Folhas','Irmãs abaixo de 35% de vida ganham 60% de velocidade para escapar.','bolt'],
    ['p8','Tambor Compartilhado','Golpear um alvo lento espalha 15% do dano a até três vizinhos em 130. Máximo uma vez a cada 0,4s.','sk_fury'],
    ['p9','Caravana do Orvalho','Cada expedição começa com três operárias extras e 60 de comida adicional.','egg'],
    ['p10','Novo Amanhecer','A cada 20 abates diretos ou por veneno, toda a colônia recupera 8% da vida máxima.','sun'],
    ['p11','Florescência do Amanhecer','FLOR SUPREMA — Entregas rendem o dobro de comida, +25% velocidade global e +20% cadência de ataque.','crown'],
  ],
  floresta: [
    ['f1','Teia de Caça','Cada terceiro golpe direto aplica 2s de lentidão a inimigos comuns.','spider'],
    ['f2','Emboscada de Musgo','Golpes contra inimigos com vida cheia causam 60% mais dano.','sk_slash'],
    ['f3','Dossel Curativo','Matabeles alcançam irmãs 70% mais distantes ao curar.','heal'],
    ['f4','Casulo de Emergência','Cada irmã sobrevive uma vez a um golpe fatal, voltando com 25% da vida. Não afeta a rainha.','egg'],
    ['f5','Seda Retaliadora','Ao sofrer um golpe próximo, a irmã atordoa o agressor comum por 0,4s. Recarga individual de 6s.','spider'],
    ['f6','Pólen de Triagem','Matabeles curam 50% a mais quando o alvo tem menos de 35% de vida.','fungo'],
    ['f7','Folhas Fermentadas','Cada entrega de comida concede seis unidades extras após os outros multiplicadores.','food'],
    ['f8','Tecelagem Expedita','Tecelãs ganham 80% de velocidade e duas unidades de capacidade de carga.','bolt'],
    ['f9','Cheiro da Caçadora','Alvos já revelados por um golpe recebem 25% de dano direto adicional.','sk_slash'],
    ['f10','Ninho Vivo','A cada 12s, irmãs a até 300 da rainha recuperam 8% da vida máxima.','crown'],
    ['f11','Coração do Dossel Eterno','FLOR SUPREMA — Irmãs revivem uma vez com 50% da vida, +40% poder de cura e 4% de vida regenerada por segundo.','crown'],
  ],
  pantano: [
    ['s1','Mandíbulas Sépticas','Golpes diretos envenenam: seis de dano por segundo durante 3s. Não acumula consigo mesmo.','fungo'],
    ['s2','Banquete da Podridão','Abater um inimigo envenenado concede quatro de comida.','food'],
    ['s3','Contágio de Bruma','Inimigos envenenados mortos espalham o veneno restante a até três vizinhos em 130.','sk_frost'],
    ['s4','Maré Pútrida','Explosões e ataques de área aliados têm raio 40% maior.','sk_fury'],
    ['s5','Wisps Condutores','Cristais de essência voam ao formigueiro duas vezes mais rápido.','wing_gem'],
    ['s6','Manto do Brejo','Irmãs sofrem 35% menos dano de golpes com origem a mais de 220 de distância.','shield'],
    ['s7','Ferida Contaminada','Golpes diretos causam 30% mais dano contra alvos já envenenados.','sk_slash'],
    ['s8','Grito Roubado','Cada quinto golpe direto enfraquece o alvo por 4s. Inimigos comuns causam 15% menos dano.','sk_fury'],
    ['s9','Barqueiras da Memória','Cada irmã perdida devolve cinco de essência à reserva da expedição.','hourglass'],
    ['s10','Ciclo do Lodo','A cada dez abates de envenenados, a rainha recupera 15% da vida máxima.','crown'],
    ['s11','Lótus Abissal da Bruma','FLOR SUPREMA — Golpes aplicam 12 de veneno/s por 5s, +35% dano contra envenenados e +3 essência por abate.','crown'],
  ],
  deserto: [
    ['d1','Calor Crescente','Golpes em sequência ganham 1% de dano por acerto, até 40%. Esfria após 3s sem acertar.','fire_sword'],
    ['d2','Ninhada Solar','O tempo base de chocagem das irmãs é reduzido em 35%.','egg'],
    ['d3','Cuspe de Brasas','Projéteis aliados incendeiam por 4s, causando oito de dano por segundo.','fire_sword'],
    ['d4','Casca Calcinada','Irmãs abaixo de metade da vida recebem 25% menos dano.','shield'],
    ['d5','Trabalho antes do Meio-dia','Nos primeiros 30s da expedição, velocidade de coleta dobra.','hourglass'],
    ['d6','Fúria Faminta','Irmãs abaixo de 40% de vida causam 50% mais dano direto.','sk_fury'],
    ['d7','Prole da Matriarca','A cada oito irmãs nascidas, nasce uma operária gratuita se houver espaço. Limite de três por expedição.','spider'],
    ['d8','Miragem Defensiva','Cada terceiro projétil recebido por uma irmã é evitado completamente.','sk_frost'],
    ['d9','Mandíbula de Vidro','Chance de crítico das irmãs aumenta em 15 pontos percentuais.','sk_slash'],
    ['d10','Forno do Enxame','Matar um inimigo em chamas ou envenenado causa 20 de dano a até três vizinhos em 130. Explosões não geram outras explosões.','sun'],
    ['d11','Coroa Solar da Fornalha','FLOR SUPREMA — +30% dano global, +20% crítico, +6 limite de população e explosão solar a cada terceiro golpe.','crown'],
  ],
  outono: [
    ['o1','Manto de Folhas','Cada irmã nasce com uma barreira igual a 20% da vida máxima. Não se regenera.','shield'],
    ['o2','Seiva da Vitória','Abates curam oito de vida da irmã ferida mais próxima do inimigo, em até 300.','heal'],
    ['o3','Poda do Galhada','Golpes contra alvos abaixo de 20% de vida causam o dobro. Contra chefes, o bônus é de 20%.','sk_slash'],
    ['o4','Âmbar do Pomar','Cada entrega de comida gera uma essência na reserva da expedição.','sun'],
    ['o5','Colheita Restauradora','Entregar comida restaura 8% da vida máxima da própria coletora.','food'],
    ['o6','Raízes Firmes','Irmãs a até 240 do formigueiro ignoram lentidão ao se mover.','fungo'],
    ['o7','Última Folha','A rainha sobrevive a um golpe fatal com 30% da vida. Uma vez por expedição.','crown'],
    ['o8','Jardim de Seiva','A rainha regenera três de vida por segundo, somando às outras fontes.','heal'],
    ['o9','Chamado Dourado','Um rali bem-sucedido cura 25% da vida das irmãs chamadas. Recarga de 15s.','sk_fury'],
    ['o10','Estação da Abundância','A cada 50 abates diretos ou por veneno, recebe 30 de comida e 15 de essência na expedição.','food'],
    ['o11','Crisântemo do Rei Dourado','FLOR SUPREMA — +30% vida máxima para colônia e rainha, +35% barreira inicial e cura 12% da colônia a cada 10 abates.','crown'],
  ],
  gelo: [
    ['i1','Mandíbulas de Geada','Cada terceiro golpe direto causa 3s de lentidão e 0,35s de atordoamento em inimigos comuns.','sk_frost'],
    ['i2','Fratura do Inverno','Golpes diretos contra alvos lentos causam 60% mais dano.','fist'],
    ['i3','Quitina de Granizo','Irmãs reduzem cada golpe recebido em seis de dano, mantendo dano mínimo de um.','shield'],
    ['i4','Peso do Devastador','Cefalotes têm 40% mais vida, mas se movem 10% mais devagar.','shield'],
    ['i5','Inverno Longo','Dobra a duração da lentidão aplicada pelos novos frutos a inimigos comuns.','hourglass'],
    ['i6','Avalanche Concentrada','Cada quarto projétil aliado explode em raio 90, atingindo outros alvos com 60% do dano.','sk_fury'],
    ['i7','Calma Glacial','Irmãs com vida cheia atacam 30% mais rápido enquanto permanecem intactas.','sk_frost'],
    ['i8','Coração sob o Gelo','A rainha começa a expedição com uma barreira de 20% da vida máxima.','crown'],
    ['i9','Caça ao Colosso','Golpes diretos causam 25% mais dano contra chefes de qualquer mapa.','fire_sword'],
    ['i10','Solo Perene','A cada 15 abates diretos ou por veneno, atordoa até seis inimigos comuns a até 250 do último alvo por 1s.','sk_frost'],
    ['i11','Rosa Cristalina do Pico','FLOR SUPREMA — +40% dano contra chefes, 25% menos dano recebido por toda a colônia e golpes aplicam 3s de lentidão.','crown'],
  ],
  topo: [
    ['a1','Memória Herdada','Começa cada expedição com 100 de essência na reserva.','wing_gem'],
    ['a2','Ressonância da Anciã','Cada quinto golpe direto dobra o dano e cura dois de vida da rainha.','crown'],
    ['a3','Lições das Perdidas','Experiência recebida aumenta em 40%.','hourglass'],
    ['a4','Seda Ancestral','Cura das Matabeles e cura natural da rainha aumentam em 35%.','heal'],
    ['a5','Ninhada Espectral','As cinco primeiras irmãs de cada expedição recebem barreira de 50% da vida, somada ao Manto de Folhas.','egg'],
    ['a6','Fios do Resgate','Uma irmã atingida fatalmente retorna com 10% de vida. Recarga compartilhada de 30s; não salva a rainha.','spider'],
    ['a7','Olhar da Névoa-Mãe','Alcance de visão de todas as irmãs aumenta em 50%.','sk_frost'],
    ['a8','Fome de Memórias','Cada unidade de cristal recolhida concede duas essências extras.','wing_gem'],
    ['a9','Coroa de Bruma','A rainha recebe 20% menos dano de todos os golpes.','crown'],
    ['a10','Coração da Colônia Eterna','Uma vez por expedição, ao cair abaixo de 30% de vida, a rainha restaura 40% da vida máxima de toda a colônia.','sun'],
    ['a11','Semente do Formigueiro Eterno','FLOR SUPREMA — Dobra o ganho de essência e XP, +35% dano e vida global e +15 vida/s na rainha.','crown'],
  ],
};
// Progressão conservadora aprovada em 2026-10-01: aumenta o BÔNUS,
// não o multiplicador inteiro. Gatilhos, intervalos, alvos e usos não mudam.
const RANK_FACTORS = [1, 1.25, 1.5];
const POWER_BASE = {
  p1: { speed: .35 }, p2: { heal: 8 }, p3: { damage: .8 },
  p4: { reduction: 12 }, p5: { foodBonus: 1 },
  p6: { projectileSpeed: .5, range: 45 }, p7: { speed: .6 },
  p8: { splash: .15 }, p9: { workers: 3, food: 60 }, p10: { healing: .08 },
  f1: { slow: 2 }, f2: { damage: .6 }, f3: { healRange: .7 },
  f4: { revive: .25 }, f5: { stun: .4 }, f6: { healing: .5 },
  f7: { food: 6 }, f8: { speed: .8, carry: 2 }, f9: { damage: .25 },
  f10: { healing: .08 },
};
const INTEGER_BONUSES = new Set(["range", "workers", "food", "carry"]);
const POWER_RANKS = Object.fromEntries(Object.entries(POWER_BASE).map(([key, base]) =>
  [key, RANK_FACTORS.map(factor => Object.fromEntries(Object.entries(base).map(([field, value]) =>
    [field, INTEGER_BONUSES.has(field) ? Math.round(value * factor) : value * factor])))]));

// Prefixo é constante: a UI mede o texto com os MESMOS valores que o motor usa.
export const FRUIT_POWER_PREFIX = "GLOBAL: ";

// Tabelas assadas uma vez: os hooks não alocam valores por unidade/frame.
export function fruitPowerValues(key, level = 1) {
  const ranks = POWER_RANKS[key];
  return ranks ? ranks[Math.max(0, Math.min(ranks.length - 1, Math.floor(level || 1) - 1))] : null;
}
const number = value => String(Number(value.toFixed(2))).replace(".", ",");
const pct = value => number(value * 100) + "%";
function rankedDescription(key, v) {
  switch (key) {
    case "p1": return `Nos primeiros 20s da expedição, irmãs se movem ${pct(v.speed)} mais rápido.`;
    case "p2": return `Entregar comida cura ${number(v.heal)} de vida da rainha. Intervalo de 1s entre curas.`;
    case "p3": return `Cada quarto golpe direto da colônia causa ${pct(v.damage)} de dano extra.`;
    case "p4": return `Cada irmã reduz um golpe em ${number(v.reduction)} de dano. Recarrega após 8s; mínimo 1 de dano.`;
    case "p5": return `As três primeiras entregas de cada irmã rendem ${number(1 + v.foodBonus)} vezes a comida.`;
    case "p6": return `Projéteis aliados viajam ${pct(v.projectileSpeed)} mais rápido; alcance de ataque aumenta em ${v.range}.`;
    case "p7": return `Irmãs abaixo de 35% de vida ganham ${pct(v.speed)} de velocidade para escapar.`;
    case "p8": return `Golpear um alvo lento espalha ${pct(v.splash)} do dano a até três vizinhos em 130. Máximo uma vez a cada 0,4s.`;
    case "p9": return `Cada expedição começa com ${v.workers} operárias e ${v.food} de comida extras.`;
    case "p10": return `A cada 20 derrotas inimigas, toda a colônia recupera ${pct(v.healing)} da vida máxima.`;
    case "f1": return `Cada terceiro golpe direto deixa inimigos comuns lentos por ${number(v.slow)}s.`;
    case "f2": return `O primeiro golpe contra um alvo com vida cheia causa ${pct(v.damage)} de dano extra.`;
    case "f3": return `Matabeles alcançam ${pct(v.healRange)} mais longe ao curar.`;
    case "f4": return `Cada irmã, exceto a rainha, resiste uma vez a um golpe fatal com ${pct(v.revive)} da vida máxima.`;
    case "f5": return `Receber golpe corpo a corpo atordoa o agressor comum por ${number(v.stun)}s. Intervalo de 6s por irmã.`;
    case "f6": return `Curas em irmãs abaixo de 35% de vida restauram ${pct(v.healing)} mais vida.`;
    case "f7": return `Cada entrega de comida recebe ${v.food} folhas extras.`;
    case "f8": return `Tecelãs se movem ${pct(v.speed)} mais rápido e carregam ${v.carry} recursos extras.`;
    case "f9": return `Inimigos revelados recebem ${pct(v.damage)} mais dano direto.`;
    case "f10": return `A cada 12s, irmãs a até 300 da rainha recuperam ${pct(v.healing)} da vida máxima.`;
    default: return "";
  }
}

export const NEW_FRUIT_NODES = Object.entries(FRUIT_SKILLS).flatMap(([map, rows], mi) => rows.map(([key,name,desc,icon], i) => {
  const isSupreme = i === 10;
  const c0 = 60 + mi*15 + Math.floor(i/3)*45 + (i===9?120:0);
  const steps = FLOWER_STEPS[map];
  const levelDescriptions = POWER_RANKS[key]?.map(v => FRUIT_POWER_PREFIX + rankedDescription(key, v));
  return {
    id:'v_'+key, key, name:name.toUpperCase(), desc:levelDescriptions?.[0] || 'GLOBAL: '+desc,
    levelDescriptions, map, fruit:'fruit_'+map,
    cost: isSupreme ? [SUPREME_COSTS[mi]] : (steps ? steps.map(s => c0 + s) : [c0]),
    requires: [],
    tier: isSupreme ? 3 : (i===9?2:i>=3?1:0), br:['G','C','H'][i%3], icon, global:true, supreme: isSupreme,
  };
}));
