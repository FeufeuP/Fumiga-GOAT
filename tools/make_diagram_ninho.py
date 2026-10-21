#!/usr/bin/env python3
"""Diagrama ANTES -> DEPOIS do FORMIGUEIRO (Regra 20).

Entrada: capturas reais do jogo.
  ANTES  = o código no HEAD (salas fixas), servido de /tmp/fumiga-antes
  DEPOIS = o estado atual (ninho escavável), PC e mobile
Saída: slice-box/diagrama-ninho-escavavel.png
As capturas são geradas por:  node /tmp/capture-ninho.mjs  (mesmo servidor dos testes)

--arte: as capturas vêm de node /tmp/diag-cap.mjs - o "antes" de cada par é o
MESMO código de hoje com o interruptor de fallback caído (sem a folha / sem a
moldura / sem a madeira), o que fotografa a diferença e prova de quebra que a
cena não depende de nenhuma das três artes para existir.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT_TTF = ROOT / "game/assets/font/KiwiSoda.ttf"
ANTE = Path("/tmp/fumiga-shot/antes/ninho-antes.png")
DEPOIS = Path("/tmp/fumiga-shot/depois/ninho-depois.png")
MOBILE = Path("/tmp/fumiga-shot/depois/ninho-depois-mobile.png")
DIAG = Path("/tmp/fumiga-diag")
OUT = ROOT / "slice-box/diagrama-ninho-escavavel.png"
OUT_ARTE = ROOT / "slice-box/diagrama-ninho-arte.png"

GOLD = (255, 212, 121, 255)
CREAM = (242, 228, 195, 255)
DIM = (176, 158, 128, 255)
GREEN = (138, 212, 148, 255)
RED = (235, 108, 96, 255)
BLUE = (143, 211, 255, 255)
BG = (26, 19, 14, 255)


def font(px):
    return ImageFont.truetype(str(FONT_TTF), px)


def paste_fit(cv, im, box):
    x, y, w, h = box
    sw, sh = im.size
    s = min(w / sw, h / sh)
    fw, fh = max(1, round(sw * s)), max(1, round(sh * s))
    r = im.resize((fw, fh), Image.Resampling.LANCZOS)
    cv.paste(r, (x + (w - fw) // 2, y + (h - fh) // 2), r)


def bullets(d, x, y, lines, f, fill=CREAM, step=19, mark="- "):
    for i, t in enumerate(lines):
        d.text((x, y + i * step), mark + t, font=f, fill=fill)
    return y + len(lines) * step


def main():
    W, H = 1920, 1830
    cv = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(cv)
    f_title, f_sub, f_lbl, f_txt, f_small = font(30), font(15), font(21), font(14), font(13)

    # a seta é desenhada (a fonte KiwiSoda não tem o glifo "->")
    t1 = "FORMIGUEIRO - ANTES"
    w1 = int(d.textlength(t1, font=f_title))
    d.text((36, 22), t1, font=f_title, fill=GOLD)
    ax, ay = 36 + w1 + 12, 22 + 14
    d.rectangle([ax, ay, ax + 34, ay + 6], fill=GOLD)
    d.polygon([(ax + 34, ay - 6), (ax + 50, ay + 3), (ax + 34, ay + 12)], fill=GOLD)
    d.text((ax + 62, 22), "DEPOIS - NINHO ESCAVAVEL (2026-10-20)", font=f_title, fill=GOLD)
    d.text((36, 62), "Arquivos: game/js/nest.js (reescrito) - game/js/config.js (NEST_GRID/NEST_SOIL/NEST_BUILD/NEST_RULES) - "
                     "game/js/game.js (estoque que azeda, fungo e memoria por tile) - game/js/units.js (POP e depositos do ninho)",
             font=f_sub, fill=DIM)

    # ----------------------------------------------------------- ANTES --------
    d.text((36, 100), "ANTES - o formigueiro era um MENU de salas fixas", font=f_lbl, fill=RED)
    d.rectangle([32, 96, W - 32, 98 + 2], fill=(90, 40, 30, 255))
    paste_fit(cv, Image.open(ANTE).convert("RGBA"), (36, 110, 1000, 562))
    yb = bullets(d, 1064, 112, [
        "7 salas num layout que NUNCA muda, ligadas por tuneis desenhados a mao",
        "\"escavar\" era apertar a sala: pagava, esperava a barra e o nivel subia",
        "o nivel vinha de um contador (CHAMBERS[type].costs = 0/1/2/3) - nao da forma",
        "estoque, POP, choco e dano saiam de run.chambers.<tipo>: 0..3, sem relacao com o que voce abriu",
        "tunel nao custava nada: a sala mais longe da boca rendia igual a colada nela",
        "nada enterrado, nada revelado - o subsoolo era decoracao",
    ], f_txt, CREAM)
    bullets(d, 1064, yb + 8, [
        "a cena era um corte transversal a parte: a arte top-down do mundo nao servia ali",
        "decisao pendente no MEGA: \"interior em corte exige decisao antes de novas pecas top-down\"",
    ], f_txt, DIM)

    # ----------------------------------------------------------- DEPOIS -------
    d.text((36, 700), "DEPOIS - a colônia ABRE o proprio formigueiro, tile por tile", font=f_lbl, fill=GREEN)
    d.rectangle([32, 696, W - 32, 698 + 2], fill=(36, 80, 46, 255))
    paste_fit(cv, Image.open(DEPOIS).convert("RGBA"), (36, 710, 1000, 560))
    yb2 = bullets(d, 1064, 712, [
        "grade 34x12 de terra real (4 durezas + rocha-mae); so se marca o tile ENCOSTADO no aberto",
        "CAMARA = AREA CONTIGUA do mesmo tipo: 3/6/10 tiles = nivel 1/2/3; 2 tiles soltos sao PISO, sem bonus",
        "a obra e delas: a escavadora anda ate o tile, a dureza define o tempo, ate 3 na mesma obra",
        "cavar e de graca em comida e REVELA o que esta enterrado: sementes (+comida) e cristal (+essencia)",
        "TRAFOEGO: x1,7 na boca -> x0,55 no fim do tuneu - \"onde\" voce cava passa a importar",
        "o ninho e o MOTOR da run: teto do estoque (o excedente AZEDA), POP do berco, cura e dano do quartel, fungo e memoria por tile",
    ], f_txt, CREAM)
    bullets(d, 1064, yb2 + 8, [
        "A BOCA fica como esta: L/P, rodizio e o OLHO LÁ FORA com o mundo vivo - nada de teleporte",
        "nascer e trabalho: a rainha bota na Real, a enfermeira leva o ovo ate o berco cavado",
        "numeros em um so lugar: config.js NEST_RULES/NEST_BUILD (nenhum chao hardcoded na cena)",
    ], f_txt, BLUE)

    # ----------------------------------------------------------- MOBILE -------
    d.text((36, 1292), "MOBILE - as mesmas obras na barra do proprio canvas (Regra 9)", font=f_lbl, fill=GOLD)
    d.rectangle([32, 1288, W - 32, 1290 + 2], fill=(90, 74, 30, 255))
    paste_fit(cv, Image.open(MOBILE).convert("RGBA"), (36, 1306, 900, 420))
    bullets(d, 964, 1310, [
        "7 placas na faixa de baixo: CAVAR + 5 obras + DEMOLIR, tocaveis (o HUD de toque some dentro do ninho)",
        "arrastar com o dedo pinta a obra; o TOQUE CURTO tambem vale (o par down/up pode caber entre dois frames)",
        "dica do rodapé troca o texto: \"TOQUE E ARRASTE NO SOLO\" no lugar de \"CLIQUE OU ARRASTE\"",
    ], f_txt, CREAM, step=21)
    bullets(d, 964, 1400, [
        "a cena cabe no letterbox: nenhum botao de toque por cima do rodape do ninho",
        "o que a colônia fez (entregas, escavado, na obra, POP) fecha a faixa embaixo, em verde",
    ], f_txt, DIM)

    d.text((36, 1742), "Verificacao: npm test (bateria completa, com nest-dig / nestmap / uitest / layout / mobile) - ver o registro de 2026-10-20 no MEGA_ARQUIVO.md",
           font=f_small, fill=DIM)
    d.text((36, 1762), "Playtest no navegador (Regra 4): marcar 3 tiles -> despensa nivel 1 -> entregas +16 em 10s -> comida acima do teto AZEDANDO na barra; "
                        "uma regressao achada JOGANDO (carregadora sem trilha congelava o estoque) virou teste em nest-dig.",
           font=f_small, fill=DIM)
    d.text((36, 1782), "PROTOIPO - nenhuma arte nova ainda: aprovado o JOGO, vem a rodada de arte/HUD/mobile/balanceamento (Regra 16).",
           font=f_small, fill=GOLD)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cv.convert("RGB").save(OUT, optimize=True)
    print("diagrama:", OUT)


def main_arte():
    W = 1920
    f_title, f_sub, f_lbl, f_txt, f_small, f_num, f_tag = (font(28), font(14), font(20),
                                                            font(14), font(12), font(15), font(11))

    def wrap(txt, f, maxw):
        out, cur = [], ""
        for word in txt.split(" "):
            nxt = (cur + " " + word).strip()
            if d.textlength(nxt, font=f) <= maxw or not cur:
                cur = nxt
            else:
                out.append(cur)
                cur = word
        if cur:
            out.append(cur)
        return out

    def block(x, y, lines, f, fill, maxw, step):
        for t in lines:
            for ln in wrap(t, f, maxw):
                d.text((x, y), ln, font=f, fill=fill)
                y += step
        return y + 8

    def row(label, cor, y, a, b, iw, linhas, notas=()):
        d.text((36, y), label, font=f_lbl, fill=cor)
        d.rectangle([32, y + 4, W - 32, y + 6], fill=(90, 74, 30, 255))
        yy = y + 20
        ia = Image.open(a).convert("RGBA")
        ib = Image.open(b).convert("RGBA")
        ih = round(iw * ib.height / ib.width)
        d.text((36, yy), "ANTES", font=f_tag, fill=RED)
        d.text((48 + iw, yy), "DEPOIS", font=f_tag, fill=GREEN)
        gap = 20
        paste_fit(cv, ia, (36, yy + 14, iw, ih))
        paste_fit(cv, ib, (48 + iw + gap, yy + 14, iw, ih))
        tx = 48 + 2 * iw + gap + 30
        tw = W - 36 - tx
        ty = block(tx, yy + 10, linhas, f_txt, CREAM, tw, 19)
        block(tx, ty, notas, f_small, DIM, tw, 16)
        return yy + max(ih + 30, ty - yy + 20)

    cv = Image.new("RGBA", (W, 3200), BG)      # altura ajustada no fim
    d = ImageDraw.Draw(cv)
    d.text((36, 20), "NINHO ESCAVÁVEL - RODADA 2: ARTE, HUD, MOBILE E BALANCEIO (2026-10-21)", font=f_title, fill=GOLD)
    d.text((36, 56), "Mudou em: game/js/nest.js (folha do chão, prancha nas faixas, ficha com moldura própria, gaveta mobile) - config.js "
                    "(NEST_RULES e as duas dicas) - assets.js + paper_hud.js (3 PNGs novos e a área quieta medida) - render.js (OLHO LÁ FORA na madeira)",
             font=f_sub, fill=DIM)
    d.text((36, 76), "Pedidos do usuário atendidos aqui: \"a terra deve ter um sprite que se conecte entre si quando lado a lado\" e \"o que é essa moldura?\"",
             font=f_sub, fill=BLUE)

    y = row("1 - O CHÃO: UMA PINTURA SÓ, AMOSTRADA 1:1 PELA GRADE (nada de tile que encaixa)", GOLD, 106,
            DIAG / "antes-solo.png", DIAG / "depois-solo.png", 452, [
        "ANTES: cada tile pintava o PRÓPRIO retângulo chapado - a grade virava xadrez e a emenda era visível em toda a tela.",
        "DEPOIS: uma folha de terra (1326x468) desenhada UMA vez no rect da grade (884x312); cada tile lê a sua REGIÃO dela.",
        "A continuidade vem da FONTE compartilhada: vizinhos leem pixels vizinhos, então não existe emenda a alinhar - nem como acertá-la.",
        "É o princípio do mundo lá fora (world.js:bakeGround pinta o terreno de uma vez) trazido para baixo da terra.",
        "Por cima da folha: lavado escuro no que AINDA NÃO FOI ESCAVADO, levante quente no piso já aberto. A FRONTEIRA da obra se lê de longe.",
    ], [
        "sem a arte (interruptor hasSheet caído) a cena volta aos chapados da esquerda: nenhum PNG é obrigatório para o ninho existir.",
        "a folha foi cortada na proporção EXATA da grade e o nestmap reprova qualquer re-corte que deformasse (Regra 22).",
    ])

    y = row("2 - A FICHA DO TILE: MOLDURA PRÓPRIA, E NÃO O PANEL DA SUPERFÍCIE", GOLD, y,
            DIAG / "antes-ficha.png", DIAG / "depois-ficha.png", 372, [
        "A ficha conta dureza, tempo, o que está enterrado e o estatuto da câmara. Ela caía no `panel` do plano - madeira de CÉU embaixo da TERRA.",
        "Nasceu `nest_tip`: raízes e cogumelos em volta de papel, uma pintura só (960x540) no par frame + bg da casa.",
        "A ALTURA da caixa é derivada da proporção do sprite carregado (256 x 540/960 = 144): nunca esmagada, nunca fatiada.",
        "A caixa quieta do texto foi MEDIDA na arte (0,303 / 0,243 / 0,723 / 0,757) e cabe na janela vazada (63% dela).",
    ], [
        "o bg cobre 100% do buraco do frame: sem vão preto entre a madeira e o papel (o erro clássico das tiras).",
        "o guard paper-hud-browser.mjs passou a conhecer `nest_tip` - área quieta registrada, não suposição.",
    ])

    y = row("3 - AS FAIXAS DO NINHO E O OLHO LÁ FORA: PRANCHA DE MADEIRA (Tabela C1.2 / C1.3 / C1.4)", GOLD, y,
            DIAG / "antes-faixa.png", DIAG / "depois-faixa.png", 590, [
        "As três faixas eram fillRect preto solto sobre o corte: o vazio que o Grupo C existe para matar.",
        "Agora cada faixa é a prancha da casa - 3 partes, tampas de folha nas pontas - com as placas das obras por cima.",
        "O OLHO LÁ FORA recebeu a mesma madeira nas duas faixas de texto (C1.4).",
        "wood_* e não banner_*: fora da família madeira o tileFor faz contain, e a moldura de minimapa (960x717) sairia encolhida para ~44px numa tira de 300x15.",
    ], [
        "as placas C1.5 (pílulas) ficaram FORA desta aplicação, a pedido do escopo: o chão e as faixas do ninho eram o pedido.",
    ])

    y = row("4 - MOBILE: AS 7 OBRAS VIRARAM GAVETA QUE ABRE SÓ NO TOQUE (Regra 9)", GOLD, y,
            DIAG / "antes-mob.png", DIAG / "gaveta-mob.png", 430, [
        "ANTES: sete placas espremidas no rodapé do celular - rótulos cortados, dedo grande em botão pequeno.",
        "DEPOIS: uma placa `OBRAS: <obra atual> >`. Ao tocar, abre a GAVETA sobre o campo com as 7 placas grandes (4 + 3).",
        "Escolher a obra JÁ fecha a gaveta: volta a pintar a terra sem um toque a mais.",
        "Toque dentro da faixa da gaveta não marca terra atrás dela - a guarda de pintura no nestInput segura.",
    ], [
        "no PC nada mudou: as 7 placas seguem na faixa de baixo, sempre visíveis, porque lá sobra largura.",
        "uitest agora clica nos dois caminhos pelo uiButtons(): abrir a gaveta, escolher QUARTEL, fechar sozinha, e a guarda de pintura.",
    ])

    d.text((36, y), "5 - BALANCEIO: MAIS BRANDO, SEM TROCAR O DESENHO DAS OBRAS", font=f_lbl, fill=GOLD)
    d.rectangle([32, y + 4, W - 32, y + 6], fill=(90, 74, 30, 255))
    yy = y + 20
    for nome, num, why in [
        ("capBase", "220 -> 280", "estoque sem nenhuma despensa escavada; 220 estourava na 1ª onda e o azedamento parecia castigo, não escolha"),
        ("spoil", "0,07 -> 0,05", "meia-vida do excedente de 9,9s para 13,9s: ainda obriga a cavar despensa, mas dá tempo de reagir"),
        ("refundBuilt", "novo: 0,5", "demolir obra JÁ COMEÇADA devolve metade; plano ainda não começado devolve tudo (erro de clique não é punido)"),
        ("tecla do demolir", "7 e X", "as duas armam DEMOLIR e o rodapé diz \"7 / X\" - a tecla escrita no HUD agora existe no código"),
    ]:
        d.text((40, yy), nome, font=f_num, fill=GOLD)
        d.text((280, yy), num, font=f_num, fill=BLUE)
        d.text((470, yy + 1), why, font=f_txt, fill=CREAM)
        yy += 22
    yy = block(40, yy + 8, [
        "medido no nest-dig: marcou a obra (pagou 50), a colônia começou a levantar, demoliram - voltou 25 (0,5 exato, e a medição é feita no clique, sem passo de sim no meio).",
        "medido no navegador: 9000 de comida com teto 280 azedou para 652 em ~60s de cena - o teto continua sendo a lei, só mais lento.",
        "revalidado em: sim (economia da run) e endless (poderes infinitos e ciclos) - nenhum dos dois reclamou do novo teto.",
    ], f_small, DIM, W - 80, 16)
    yy = block(40, yy, [
        "AS QUATRO TRAVAS DA CASA DEPOIS DE TUDO: npm test 38/38 - inspect:layout 122 estados limpos (a gaveta incluída, com FONTE GRANDE) - "
        "inspect:hud OK em seis biomas + formigueiro - FPS 59,5 no ninho com a gaveta aberta (o desenho da folha custa o mesmo de antes: um drawImage).",
        "AS ARTES: 2 candidatos por peça, escolhidos pelo usuário (Regra 16); a terra virou PNG de paleta (519 KB) depois de medir as variantes.",
    ], f_small, GOLD, W - 80, 16)
    cv = cv.crop((0, 0, W, yy + 26))

    OUT_ARTE.parent.mkdir(parents=True, exist_ok=True)
    cv.convert("RGB").save(OUT_ARTE, optimize=True)
    print("diagrama:", OUT_ARTE, "|", cv.size)


if __name__ == "__main__":
    import sys
    if "--arte" in sys.argv:
        main_arte()
    else:
        main()
