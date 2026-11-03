#!/usr/bin/env python3
# ============================================================================
# FUMIGA — PIPELINE DE PIXELIZAÇÃO (fase F0b-2 do plano PIXEL CELESTE)
#
# Transforma a FONTE gerada (alta resolução, fundo de chroma) na ARTE NATIVA
# que entra no jogo. Roda FORA do runtime — é ferramenta de produção, nunca
# é chamada em tempo de jogo (Regra 5: nada de pós-processar pixel a pixel
# durante a partida).
#
# Os cinco passos do plano, nesta ordem:
#   1. remover o chroma (verde/azul) com tolerância e despill de borda;
#   2. detectar o bloco de pixel da fonte e reduzir por vizinho-mais-próximo
#      para o tamanho nativo da ficha;
#   3. quantizar na paleta do bioma (docs/arte/paleta-celeste.json), SEM dither;
#   4. validar: alfa binário, nenhuma cor fora da paleta (tolerância 0),
#      alfa real;
#   5. exportar nativo.png + preview-3x.png + relatório JSON.
#
# A quantização usa exatamente a mesma métrica do runtime
# (quantizeToPalette em game/js/pixel_celeste.js: dr²*3 + dg²*6 + db², sem
# dither), para o que o pipeline aprova ser o que o jogo mostra.
#
# DUAS COISAS QUE A FERRAMENTA MEDIU NAS PRIMEIRAS FONTES E O PLANO NÃO PREVIA:
#
#   • o fundo gerado quase nunca é o #00FF00 / #0000FF puro do prompt — sai
#     um azul ou verde "quase". Por isso a chave é a cor MEDIDA nas quinas, e
#     a ficha só diz a família esperada (o desvio vira aviso, não falha).
#   • a fonte pode não ter grade de pixel nenhuma (o gerador entrega arte
#     lisa). Quando há grade, a redução usa a COR DESENHADA (maioria da
#     célula); quando não há, usa a MÉDIA da célula — área média antes de
#     quantizar é o que salva o volume de uma fonte lisa. O relatório diz
#     qual caminho foi usado e com que confiança.
#
# Uso:
#   python3 tools/pixelize.py --tudo
#   python3 tools/pixelize.py --peca cortadeira
#   python3 tools/pixelize.py --fichas caminho/fichas.json --saida dir
#
# Dependência: Pillow (ver tools/setup-pixel.sh).
# ============================================================================
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import sys
from collections import Counter, deque

try:
    from PIL import Image
except ImportError:  # o agente/artista esqueceu o setup
    sys.exit("Pillow não encontrado. Rode: bash tools/setup-pixel.sh")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FICHAS_PADRAO = os.path.join("docs", "arte", "provas-f0b-2", "fichas.json")
PALETA = os.path.join("docs", "arte", "paleta-celeste.json")

# Cobertura mínima de pixels opacos numa célula para ela virar opaca. >50%
# é o que preserva o contorno de 1 px em vez de dissolvê-lo na redução.
COBERTURA = 0.5
# Faixa (em pixels da fonte) em que o despill alcança a partir da borda.
DESPILL_VIZ = 2
# Confiança mínima para aceitar que a fonte tem mesmo uma grade de blocos.
GRADE_CONFIANCA = 0.90
# Amostras por célula na redução (estruturadas, determinísticas).
AMOSTRAS = 16


# --------------------------------------------------------------------- cores --
def hex_para_rgb(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def rgb_para_hex(c):
    return "#%02x%02x%02x" % c


def carregar_paleta(caminho, bioma, compartilhado=False, contorno=False):
    """As 19 cores do bioma (16 de cena + 3 de fundo), como o runtime monta.

    Peças que usam as tintas compartilhadas (HUD, texto, contorno de aliado)
    somam o grupo `compartilhado` da paleta — ele existe justamente para não
    reinventar papel-claro e tinta em cada bioma.
    """
    with open(caminho, encoding="utf-8") as f:
        doc = json.load(f)
    b = doc["biomas"].get(bioma) or doc["biomas"]["planicie"]
    if bioma not in doc["biomas"]:
        print("  aviso: bioma %r não existe; usando a Planície" % bioma)
    cores = [b["infill"], b["borda"], b["trilha"]]
    for k in ("fundo", "terreno", "musgo", "acento", "vegetacao"):
        v = b[k]
        cores.extend(v if isinstance(v, list) else [v])
    if len(cores) != 19:
        raise SystemExit("paleta de %r tem %d cores, o contrato pede 19" % (bioma, len(cores)))
    if compartilhado:
        for v in doc["compartilhado"].values():
            cores.extend(v if isinstance(v, list) else [v])
    elif contorno:
        # O contorno de 1 px usa a tinta compartilhada — ela existe exatamente
        # para isso — sem abrir a porta para o resto do grupo: as cores de
        # perigo contaminaram a larva quando a paleta inteira entrou.
        tinta = doc["compartilhado"]["tinta"]
        cores.extend(tinta if isinstance(tinta, list) else [tinta])
    return [hex_para_rgb(c) for c in cores], b


def dist_paleta(rgb, pal):
    """Mesma métrica do runtime: peso 3 no vermelho, 6 no verde, 1 no azul."""
    dr = rgb[0] - pal[0]
    dg = rgb[1] - pal[1]
    db = rgb[2] - pal[2]
    return dr * dr * 3 + dg * dg * 6 + db * db


# -------------------------------------------------------------------- chroma --
def amostrar_quinas(im):
    w, h = im.size
    n = max(2, min(w, h) // 50)
    px = im.load()
    amostra = []
    for (x0, y0) in ((0, 0), (w - n, 0), (0, h - n), (w - n, h - n)):
        for y in range(y0, min(y0 + n, h)):
            for x in range(x0, min(x0 + n, w)):
                amostra.append(px[x, y][:3])
    return amostra


def detectar_chroma(im):
    """Mede o fundo real: cor mediana das quinas, família e tolerância.

    A família (verde/azul) é comparada com as duas chaves puras do prompt,
    mas a COR usada no recorte é a medida — o gerador entrega "quase"
    #00FF00, e recortar pela chave teórica não recorta nada.
    """
    amostra = amostrar_quinas(im)
    mediana = tuple(sorted(c[i] for c in amostra)[len(amostra) // 2] for i in range(3))
    # A familia sai do CANAL DOMINANTE, nao da distancia: a metrica do runtime
    # pesa o verde 6x, entao um azul-claro (#48a1f2) ficaria "mais perto" do
    # verde que do azul e o despill mexeria no canal errado.
    r, g, bl = mediana
    fam = "azul" if bl >= g else "verde"
    # tolerância: 1,3x o desvio máximo das quinas, presa entre 40 e 160.
    desvio = max(dist_paleta(c, mediana) ** 0.5 for c in amostra)
    tol = int(min(160, max(40, desvio * 1.3)))
    return fam, mediana, tol


def inundar_chroma(im, chave, tol):
    """Máscara do chroma alcançável pelas BORDAS.

    Chave global apagaria detalhe verde (ou azul) que a peça tenha por
    dentro — a folha da cortadeira, o musgo da pedra. Inundando de fora para
    dentro, só o fundo, que encosta na moldura, é removido.
    """
    w, h = im.size
    px = im.load()
    lim = tol * tol * 3
    visitado = bytearray(w * h)
    pilha = deque()
    combina = lambda x, y: dist_paleta(px[x, y][:3], chave) <= lim

    for x in range(w):
        for y in (0, h - 1):
            i = y * w + x
            if not visitado[i] and combina(x, y):
                visitado[i] = 1
                pilha.append(i)
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if not visitado[i] and combina(x, y):
                visitado[i] = 1
                pilha.append(i)

    while pilha:
        i = pilha.popleft()
        x, y = i % w, i // w
        if x > 0 and not visitado[i - 1] and combina(x - 1, y):
            visitado[i - 1] = 1; pilha.append(i - 1)
        if x < w - 1 and not visitado[i + 1] and combina(x + 1, y):
            visitado[i + 1] = 1; pilha.append(i + 1)
        if y > 0 and not visitado[i - w] and combina(x, y - 1):
            visitado[i - w] = 1; pilha.append(i - w)
        if y < h - 1 and not visitado[i + w] and combina(x, y + 1):
            visitado[i + w] = 1; pilha.append(i + w)
    return visitado


def despill(im, mascara, canal):
    """Arrasta o canal da chave para baixo na franja que sobrou.

    A contaminação (spill) é a luz do fundo batendo na borda da peça. Só
    pixels opacos a até DESPILL_VIZ px do recorte são tocados, e o canal
    nunca sobe — só desce até a média dos outros dois.
    """
    w, h = im.size
    px = im.load()
    outro = (1, 2) if canal == 0 else ((0, 2) if canal == 1 else (0, 1))
    perto = set()
    for i in range(w * h):
        if not mascara[i]:
            continue
        x, y = i % w, i // w
        for dy in range(-DESPILL_VIZ, DESPILL_VIZ + 1):
            ny = y + dy
            if 0 <= ny < h:
                for dx in range(-DESPILL_VIZ, DESPILL_VIZ + 1):
                    nx = x + dx
                    if 0 <= nx < w:
                        j = ny * w + nx
                        if not mascara[j]:
                            perto.add(j)
    tocados = 0
    for j in sorted(perto):
        x, y = j % w, j // w
        c = list(px[x, y][:3])
        teto = (c[outro[0]] + c[outro[1]]) // 2
        if c[canal] > teto:
            c[canal] = teto
            px[x, y] = (c[0], c[1], c[2], px[x, y][3])
            tocados += 1
    return tocados


def aplicar_alfa(im, mascara):
    """Alfa BINÁRIO (0 ou 255). Meio-tom na borda de pixel art é erro, não
    suavidade — e é exatamente o que o runtime faz (alpha <= 127 -> 0)."""
    px = im.load()
    w = im.width
    for i in range(w * im.height):
        x, y = i % w, i // w
        r, g, b, _a = px[x, y]
        px[x, y] = (r, g, b, 0 if mascara[i] else 255)
    return im


def caixa_conteudo(im):
    """Menor retângulo que contém os pixels opacos."""
    w, h = im.size
    px = im.load()
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 127:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    if x1 < 0:
        raise SystemExit("a peça ficou vazia: o chroma comeu tudo")
    return (x0, y0, x1 + 1, y1 + 1)


# --------------------------------------------------------------------- grade --
def comprimentos_de_sequencia(im, caixa):
    """Tamanho de cada trecho de pixels iguais, por linha e por coluna.

    Numa fonte de pixel art ampliada por um fator inteiro, todo trecho mede
    um múltiplo do bloco — e é isso que denuncia a grade. Numa fonte lisa os
    trechos decaem sem estrutura, e o detector precisa dizer "não tem grade"
    em vez de inventar um número.
    """
    px = im.load()
    x0, y0, x1, y1 = caixa
    runs = []
    for y in range(y0, y1, 2):
        n = 1
        for x in range(x0 + 1, x1):
            if px[x, y] == px[x - 1, y]:
                n += 1
            else:
                if n >= 2: runs.append(n)
                n = 1
        if n >= 2: runs.append(n)
    for x in range(x0, x1, 2):
        n = 1
        for y in range(y0 + 1, y1):
            if px[x, y] == px[x, y - 1]:
                n += 1
            else:
                if n >= 2: runs.append(n)
                n = 1
        if n >= 2: runs.append(n)
    return runs


def detectar_bloco(runs, limite):
    """Maior candidato que explique ao menos 90% dos trechos.

    Tolerância de 1 px a cada 16 px de bloco (0 para blocos pequenos): sem
    isso o candidato 2 "explica" qualquer coisa, porque todo número está a
    1 de um múltiplo de 2.
    """
    if not runs:
        return 0, 0.0
    melhor, melhor_score, maximo = 0, 0.0, 0.0
    for cand in range(2, max(3, limite)):
        folga = cand // 16
        ok = 0
        for r in runs:
            # um trecho menor que um bloco nao e multiplo de nada: e ruido.
            if r < cand - folga:
                continue
            m = r % cand
            if min(m, cand - m) <= folga:
                ok += 1
        score = ok / len(runs)
        if cand > 1 and score > maximo:
            maximo = score
        if score >= GRADE_CONFIANCA and cand > melhor:
            melhor, melhor_score = cand, score
    return melhor, (melhor_score if melhor else maximo)


# ------------------------------------------------------------------- redução --
def reduzir(im, caixa, alvo_w, alvo_h, bloco, ajuste):
    """Redução por célula, SEM deformar a peça (Regras 21 e 22).

    • alfa: cobertura de pixels opacos > 50% — é o que preserva o contorno
      de 1 px em vez de dissolvê-lo;
    • cor: MAIORIA quando a fonte tem grade de blocos (aí a cor da célula é
      literalmente a cor que foi desenhada); MÉDIA quando não tem (aí a
      média de área antes de quantizar é o que preserva o volume).

    O encaixe é `conter` (cabe inteira, centralizada, o resto fica
    transparente) ou `cortar` (recorta a fonte na proporção do alvo).
    Esticar nunca: HUD deformado é bug, não ajuste.
    """
    px = im.load()
    bx0, by0, bx1, by1 = caixa
    bw, bh = bx1 - bx0, by1 - by0
    if bloco >= 3:
        cols = max(1, bw // bloco)
        rows = max(1, bh // bloco)
        bw, bh = cols * bloco, rows * bloco     # arredonda para blocos inteiros
        bx1, by1 = bx0 + bw, by0 + bh
    else:
        cols, rows = bw, bh

    if ajuste == "cortar":
        alvo_asp = alvo_w / alvo_h
        if cols / rows > alvo_asp:
            folga = cols - round(rows * alvo_asp)
            bx0 += folga // 2
            bw = cols = round(rows * alvo_asp)
        else:
            folga = rows - round(cols / alvo_asp)
            by0 += folga // 2
            bh = rows = round(cols / alvo_asp)
        bx1, by1 = bx0 + bw, by0 + bh

    esc = min(alvo_w / cols, alvo_h / rows)
    tw = max(1, min(alvo_w, round(cols * esc)))
    th = max(1, min(alvo_h, round(rows * esc)))
    offx, offy = (alvo_w - tw) // 2, (alvo_h - th) // 2

    saida = [[(0, 0, 0, 0)] * alvo_w for _ in range(alvo_h)]
    metodo = "maioria" if bloco >= 3 else "média de área"
    for ty in range(th):
        sy0 = by0 + (ty * bh) // th
        sy1 = max(sy0 + 1, by0 + ((ty + 1) * bh) // th)
        for tx in range(tw):
            sx0 = bx0 + (tx * bw) // tw
            sx1 = max(sx0 + 1, bx0 + ((tx + 1) * bw) // tw)
            passo_y = max(1, (sy1 - sy0) // AMOSTRAS)
            passo_x = max(1, (sx1 - sx0) // AMOSTRAS)
            cont = Counter()
            soma = [0, 0, 0]
            total = opacos = 0
            for sy in range(sy0, sy1, passo_y):
                for sx in range(sx0, sx1, passo_x):
                    total += 1
                    p = px[sx, sy]
                    if p[3] > 127:
                        opacos += 1
                        cont[p[:3]] += 1
                        soma[0] += p[0]; soma[1] += p[1]; soma[2] += p[2]
            if opacos < COBERTURA * total or not cont:
                continue
            if bloco >= 3:
                top = max(cont.values())
                # desempate na cor mais ESCURA: o contorno de 1 px é minoria
                # dentro da célula e, sem essa regra, desaparece na redução.
                cor = min((c for c, n in cont.items() if n == top),
                          key=lambda c: c[0] * 3 + c[1] * 6 + c[2])
            else:
                cor = tuple(round(s / opacos) for s in soma)
            saida[offy + ty][offx + tx] = (cor[0], cor[1], cor[2], 255)
    return saida, metodo, (tw, th)


# ---------------------------------------------------------------- quantização --
def quantizar(grade, pal):
    """Vizinho-mais-próximo na paleta, SEM dither (o plano proíbe dither)."""
    cache = {}
    fora = 0
    dmax = 0
    dsoma = 0
    n = 0
    for linha in grade:
        for i, p in enumerate(linha):
            if p[3] == 0:
                continue
            rgb = p[:3]
            k = cache.get(rgb)
            if k is None:
                bd, bi = None, 0
                for j, c in enumerate(pal):
                    d = dist_paleta(rgb, c)
                    if bd is None or d < bd:
                        bd, bi = d, j
                k = (bi, bd)
                cache[rgb] = k
            linha[i] = (pal[k[0]][0], pal[k[0]][1], pal[k[0]][2], 255)
            n += 1
            dsoma += k[1]
            dmax = max(dmax, k[1])
            if k[1] > 0:
                fora += 1
    return fora, dmax, (dsoma / n if n else 0.0), n


# ------------------------------------------------- contorno e rampa curta --
def aplicar_contorno(grade, tinta):
    """Contorno de 1 px de tinta escura por fora da silhueta.

    O contrato (Regra 6) pede contorno de 1 px em personagens, inimigos e
    perigos — e é ele, não o detalhe interno, que faz a peça ser lida em 15 px.
    Uma fonte lisa reduzida por média de área não tem contorno: a borda
    derrete no fundo. Então o pipeline desenha o contorno, por fora da peça.
    """
    h, w = len(grade), len(grade[0])
    saida = [linha[:] for linha in grade]
    n = 0
    for y in range(h):
        for x in range(w):
            if grade[y][x][3] != 0:
                continue
            if ((x > 0 and grade[y][x - 1][3]) or (x < w - 1 and grade[y][x + 1][3])
                    or (y > 0 and grade[y - 1][x][3]) or (y < h - 1 and grade[y + 1][x][3])):
                saida[y][x] = (tinta[0], tinta[1], tinta[2], 255)
                n += 1
    return saida, n


def reduzir_cores(grade, pal, k):
    """Enxuga a peça para no máximo k cores da paleta (medoides gulosos).

    Reduzir uma fonte lisa por média de área espalha a peça por dezenas de
    matizes vizinhos — a larva chegou a 17 cores contra 5 de orçamento. A
    seleção gulosa escolhe as k cores da paleta que mais reduzem a distância
    total ponderada e manda cada pixel para a mais próxima delas. É
    determinístico e barato: a paleta tem 19 a 37 entradas.
    """
    hist = Counter()
    for linha in grade:
        for p in linha:
            if p[3]:
                hist[p[:3]] += 1
    return grade, _aplicar_medoides([grade], hist, pal, k)


def reduzir_cores_folha(grades, pal, k):
    """A mesma redução, mas com a rampa escolhida entre TODOS os tiles.

    Uma folha de terreno com rampas sorteadas tile por tile vira xadrez: o
    infill de um tile não casa com a borda do vizinho. A Celeste resolve com
    uma paleta única por tileset, então os medoides são eleitos sobre o
    histograma somado dos 40 tiles e aplicados a todos eles.
    """
    hist = Counter()
    for grade in grades:
        for linha in grade:
            for p in linha:
                if p[3]:
                    hist[p[:3]] += 1
    return grades, _aplicar_medoides(grades, hist, pal, k)


def _aplicar_medoides(grades, hist, pal, k):
    if not hist or len(hist) <= k:
        return len(hist)
    cores = list(hist)
    sel = [max(cores, key=lambda c: hist[c])]
    custo = {c: dist_paleta(c, sel[0]) for c in cores}
    while len(sel) < k:
        ganho_max, escolhida = 0, None
        for cand in pal:
            if cand in sel:
                continue
            ganho = 0
            for c in cores:
                d = dist_paleta(c, cand)
                if d < custo[c]:
                    ganho += (custo[c] - d) * hist[c]
            if ganho > ganho_max:
                ganho_max, escolhida = ganho, cand
        if escolhida is None:
            break
        sel.append(escolhida)
        for c in cores:
            d = dist_paleta(c, escolhida)
            if d < custo[c]:
                custo[c] = d
    mapa = {c: min(sel, key=lambda s: dist_paleta(c, s)) for c in cores}
    for grade in grades:
        for linha in grade:
            for i, p in enumerate(linha):
                if p[3]:
                    m = mapa[p[:3]]
                    linha[i] = (m[0], m[1], m[2], 255)
    return len(set(mapa.values()))


# -------------------------------------------------------------------- saída --
def grade_para_imagem(grade):
    h = len(grade)
    w = len(grade[0])
    im = Image.new("RGBA", (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = grade[y][x]
    return im


def ampliar(im, fator):
    return im.resize((im.width * fator, im.height * fator), Image.NEAREST)


def sha256_arquivo(caminho):
    with open(caminho, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def sha256_png(im):
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return hashlib.sha256(buf.getvalue()).hexdigest()


# ----------------------------------------------------------------- validação --
def validar(grade, pal, peca_opaca, exigir_transparente=True):
    problemas = []
    alfas = Counter()
    fora = []
    preto = 0
    for linha in grade:
        for p in linha:
            alfas[p[3]] += 1
            if p[3] == 0:
                continue
            if p[:3] not in pal:
                fora.append(rgb_para_hex(p[:3]))
            if p[:3] == (0, 0, 0):
                preto += 1
    sujos = [a for a in alfas if a not in (0, 255)]
    if sujos:
        problemas.append("alfa semitransparente: %d pixel(s) com alfa %s"
                         % (sum(alfas[a] for a in sujos), sujos))
    if fora:
        problemas.append("%d pixel(s) fora da paleta: %s"
                         % (len(fora), sorted(set(fora))[:5]))
    if exigir_transparente and not peca_opaca and alfas.get(0, 0) == 0:
        problemas.append("sem alfa real: nenhum pixel transparente (recorte falhou?)")
    if preto:
        problemas.append("preto puro como cor de cena: %d pixel(s)" % preto)
    return problemas, alfas


# --------------------------------------------------------------------- peça --
def processar(ficha, args):
    pid = ficha["id"]
    print("─" * 70)
    print("PEÇA %s — %s" % (pid, ficha.get("titulo", "")))

    fonte_path = os.path.join(ROOT, ficha["fonte"])
    if not os.path.exists(fonte_path):
        raise SystemExit("fonte não encontrada: %s" % fonte_path)
    im = Image.open(fonte_path).convert("RGBA")
    alvo_w, alvo_h = ficha["nativo"][0], ficha["nativo"][1]
    print("  fonte: %s (%dx%d)" % (ficha["fonte"], im.width, im.height))

    # ── 1. chroma ────────────────────────────────────────────────────────────
    familia, chave, tol = detectar_chroma(im)
    esperado = ficha.get("chroma", "auto")
    if esperado in ("verde", "azul") and esperado != familia:
        print("  AVISO: a ficha espera chroma %s, a fonte veio %s (%s)"
              % (esperado, familia, rgb_para_hex(chave)))
    if tol > 60:
        print("  aviso: fundo da fonte não é uniforme (tolerância %d) — "
              "regar pedindo fundo sólido na próxima" % tol)
    tol = ficha.get("chroma_tol", tol)
    canal = 1 if familia == "verde" else 2
    px_fonte = im.load()
    lim_chroma = tol * tol * 3
    marcados = sum(1 for i in range(im.width * im.height)
                   if dist_paleta(px_fonte[i % im.width, i // im.width][:3], chave) <= lim_chroma)
    mascara = inundar_chroma(im, chave, tol)
    removidos = sum(mascara)
    spill = despill(im, mascara, canal)
    aplicar_alfa(im, mascara)
    print("  chroma %s %s (tol %d): %d px de fundo recortados, "
          "%d px da cor da chave preservados por estarem dentro da peça, %d com spill"
          % (familia, rgb_para_hex(chave), tol, removidos, marcados - removidos, spill))

    caixa = caixa_conteudo(im)
    bw, bh = caixa[2] - caixa[0], caixa[3] - caixa[1]
    print("  conteúdo: %dx%d px" % (bw, bh))

    # ── 2. grade + redução ───────────────────────────────────────────────────
    runs = comprimentos_de_sequencia(im, caixa)
    bloco, confianca = detectar_bloco(runs, min(256, min(bw, bh) // 4))
    ajuste = ficha.get("ajuste", "conter")
    if bloco >= 3:
        print("  grade detectada: bloco de %d px (confiança %.0f%%) → %dx%d células"
              % (bloco, confianca * 100, bw // bloco, bh // bloco))
    else:
        print("  SEM GRADE: a fonte é lisa, não tem bloco de pixel "
              "(confiança máxima %.0f%% < %.0f%%) — reduzindo por média de área"
              % (confianca * 100, GRADE_CONFIANCA * 100))
    grade, metodo, (tw, th) = reduzir(im, caixa, alvo_w, alvo_h, bloco, ajuste)
    print("  reduzido: %dx%d px nativos (método: %s; encaixe: %s)"
          % (alvo_w, alvo_h, metodo, ajuste))

    # ── 3. quantização ───────────────────────────────────────────────────────
    pal, bioma = carregar_paleta(os.path.join(ROOT, PALETA),
                                 ficha.get("bioma", "planicie"),
                                 ficha.get("compartilhado", False),
                                 ficha.get("contorno", False))
    fora, dmax, dmedia, n = quantizar(grade, pal)
    print("  quantizado em %d cores (%s%s): %d/%d px ajustados, "
          "distância média %.0f, máxima %.0f"
          % (len(pal), ficha.get("bioma", "planicie"),
             " + compartilhado" if ficha.get("compartilhado") else "",
             fora, n, dmedia, dmax))

    # ── 3b. rampa curta ──────────────────────────────────────────────────────
    k = ficha.get("cores", {}).get("cores_max", 6)
    antes = len(Counter(p[:3] for linha in grade for p in linha if p[3]))
    grade, depois = reduzir_cores(grade, pal, k)
    print("  rampa: %d → %d cores próprias (orçamento %d)" % (antes, depois, k))

    # ── 3c. contorno ─────────────────────────────────────────────────────────
    contorno = ficha.get("contorno", False)
    n_contorno = 0
    if contorno:
        with open(os.path.join(ROOT, PALETA), encoding="utf-8") as f:
            tinta = hex_para_rgb(json.load(f)["compartilhado"]["tinta"])
        grade, n_contorno = aplicar_contorno(grade, tinta)
        print("  contorno: %d px de tinta %s por fora da silhueta"
              % (n_contorno, rgb_para_hex(tinta)))

    # ── 4. validação ─────────────────────────────────────────────────────────
    nativo = grade_para_imagem(grade)
    problemas, alfas = validar(grade, pal, ficha.get("opaca", False))
    cores = Counter(p[:3] for linha in grade for p in linha if p[3])
    print("  cores usadas: %d %s" % (len(cores), [rgb_para_hex(c) for c in sorted(cores, key=lambda c: -cores[c])]))
    print("  alfa: %d opacos, %d transparentes" % (alfas.get(255, 0), alfas.get(0, 0)))
    if problemas:
        for p in problemas:
            print("  ✗ " + p)
    else:
        print("  ✓ validação: alfa binário, 0 cor fora da paleta, alfa real, sem preto puro")

    # ── 5. exportação ────────────────────────────────────────────────────────
    saida_dir = os.path.join(ROOT, args.saida) if args.saida else os.path.join(
        ROOT, os.path.dirname(FICHAS_PADRAO))
    os.makedirs(saida_dir, exist_ok=True)
    base = os.path.join(saida_dir, pid)

    nativo.save(base + "-nativo.png")
    fundo = hex_para_rgb(bioma["fundo"][1])
    prev = Image.new("RGB", (alvo_w * 3, alvo_h * 3), fundo)
    tri = ampliar(nativo, 3)
    prev.paste(tri, (0, 0), tri)
    prev.save(base + "-preview-3x.png")

    rel = {
        "id": pid,
        "titulo": ficha.get("titulo", ""),
        "categoria": ficha.get("categoria", ""),
        "bioma": ficha.get("bioma", "planicie"),
        "fonte": {
            "arquivo": ficha["fonte"],
            "dimensoes": [im.width, im.height],
            "sha256": sha256_arquivo(fonte_path),
        },
        "chroma": {
            "familia": familia,
            "cor_medida": rgb_para_hex(chave),
            "tolerancia": tol,
            "metodo": "inundação pelas bordas (preserva detalhe da cor da chave no interior da peça)",
            "pixels_recortados": removidos,
            "pixels_da_chave_preservados_no_interior": marcados - removidos,
            "pixels_com_spill_corrigido": spill,
        },
        "caixa_conteudo": list(caixa),
        "grade": {
            "bloco_px": bloco,
            "confianca": round(confianca, 4),
            "tem_grade": bloco >= 3,
            "metodo_reducao": metodo,
            "encaixe": ajuste,
            "desenho_efetivo": [tw, th],
        },
        "nativo": {
            "dimensoes": [alvo_w, alvo_h],
            "arquivo": os.path.relpath(base + "-nativo.png", ROOT),
            "sha256": sha256_png(nativo),
            "cores_usadas": [rgb_para_hex(c) for c in sorted(cores, key=lambda c: -cores[c])],
            "contagem_de_cores": len(cores),
            "pixels_opacos": alfas.get(255, 0),
            "pixels_transparentes": alfas.get(0, 0),
        },
        "quantizacao": {
            "paleta": "docs/arte/paleta-celeste.json",
            "compartilhado": bool(ficha.get("compartilhado")),
            "rampa": {"antes": antes, "depois": depois, "orcamento": k},
            "contorno": {"feito": bool(contorno), "px": n_contorno},
            "cores_na_paleta": len(pal),
            "dither": False,
            "metrica": "dr^2*3 + dg^2*6 + db^2 (igual ao quantizeToPalette do runtime)",
            "pixels_ajustados": fora,
            "distancia_media": round(dmedia, 1),
            "distancia_maxima": round(dmax, 1),
        },
        "validacao": {"ok": not problemas, "problemas": problemas},
        "preview_3x": os.path.relpath(base + "-preview-3x.png", ROOT),
    }
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump(rel, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("  → %s" % rel["nativo"]["arquivo"])
    print("  → %s" % rel["preview_3x"])
    print("  → %s" % os.path.relpath(base + ".json", ROOT))
    return rel


# -------------------------------------------------------------------- folha --
LADOS = (("norte", 1), ("leste", 2), ("sul", 4), ("oeste", 8))


def lados_abertos(grade, marcador=None):
    """Quais das 4 bordas do tile encostam no vazio — é a chave do autotile.

    O código de 4 bits (N=1, L=2, S=4, O=8) é o índice da tabela que
    `bakeGround` vai consultar. A fonte marca a borda de dois jeitos possíveis,
    então o teste tem dois modos:

    • **transparência** — o vazio veio recortado junto com o chroma. Um lado é
      aberto quando a maioria dos seus 8 px de borda é transparente;
    • **marcador** — a fonte NÃO recortou o vazio e marcou a borda exposta
      pintando ali o tom mais claro da rampa (a grama na beira do terreno).
      Um lado é aberto quando ele tem pelo menos 2 px do marcador e não fica
      muito atrás do lado mais marcado (60%): numa borda reta o tom claro
      corre a fileira inteira, num canto ele se concentra na quina.
    """
    h, w = len(grade), len(grade[0])
    filas = {
        "norte": [grade[0][x] for x in range(w)],
        "sul":   [grade[h - 1][x] for x in range(w)],
        "oeste": [grade[y][0] for y in range(h)],
        "leste": [grade[y][w - 1] for y in range(h)],
    }
    contagem = {}
    for nome, _ in LADOS:
        fila = filas[nome]
        contagem[nome] = (sum(1 for p in fila if p[3] == 0) if marcador is None
                          else sum(1 for p in fila if p[3] and p[:3] == marcador))
    if marcador is None:
        return [n for n, _ in LADOS if contagem[n] * 2 > len(filas[n])], contagem
    topo = max(contagem.values())
    if topo == 0:
        return [], contagem            # tile de infill: nenhum tom claro na borda
    limiar = max(2, 0.6 * topo)
    return [n for n, _ in LADOS if contagem[n] >= limiar], contagem


def processar_folha(ficha, args):
    """Fatia uma folha de terreno em tiles de 8x8 e monta a tabela de autotile.

    Ao contrário das peças avulsas, aqui o chroma recorta a folha INTEIRA de
    uma vez (o fundo é um só) e só depois a folha é fatiada em células. Cada
    célula é reduzida a 8x8 pelo mesmo critério das outras peças, a rampa é
    eleita uma única vez para os 40 tiles e cada tile sai classificado pelos
    lados que encostam no vazio.
    """
    pid = ficha["id"]
    print("─" * 70)
    print("FOLHA %s — %s" % (pid, ficha.get("titulo", "")))
    fonte_path = os.path.join(ROOT, ficha["fonte"])
    im = Image.open(fonte_path).convert("RGBA")
    print("  fonte: %s (%dx%d)" % (ficha["fonte"], im.width, im.height))

    # ── 1. chroma ────────────────────────────────────────────────────────────
    familia, chave, tol = detectar_chroma(im)
    esperado = ficha.get("chroma", "auto")
    if esperado in ("verde", "azul") and esperado != familia:
        print("  AVISO: a ficha espera chroma %s, a fonte veio %s (%s)"
              % (esperado, familia, rgb_para_hex(chave)))
    tol = ficha.get("chroma_tol", tol)
    canal = 1 if familia == "verde" else 2
    px_fonte = im.load()
    lim = tol * tol * 3
    marcados = sum(1 for i in range(im.width * im.height)
                   if dist_paleta(px_fonte[i % im.width, i // im.width][:3], chave) <= lim)
    mascara = inundar_chroma(im, chave, tol)
    removidos = sum(mascara)
    spill = despill(im, mascara, canal)
    aplicar_alfa(im, mascara)
    print("  chroma %s %s (tol %d): %d px de fundo recortados, %d da chave "
          "preservados dentro da folha, %d com spill"
          % (familia, rgb_para_hex(chave), tol, removidos, marcados - removidos, spill))

    # O vazio DENTRO de um tile está cercado de terra opaca, então a inundação
    # pelas bordas não chega nele — e um tile de borda sairia idêntico a um de
    # infill. Um segundo passe por distância de cor resolve: a chave #04fa02 é
    # absurdamente distante dos verdes de terreno da Planície, então não há
    # risco de a grama ser comida junto.
    if ficha.get("recorte_global"):
        pxg = im.load()
        extra = 0
        for i in range(im.width * im.height):
            x, y = i % im.width, i // im.width
            r, g, b, a = pxg[x, y]
            if a and (r - chave[0]) ** 2 * 3 + (g - chave[1]) ** 2 * 6 + (b - chave[2]) ** 2 <= lim:
                pxg[x, y] = (r, g, b, 0)
                extra += 1
        print("  recorte global: +%d px de vazio dentro dos tiles" % extra)

    # ── 2. fatiar ────────────────────────────────────────────────────────────
    layout = ficha["layout"]
    cols, rows = layout["colunas"], layout["linhas"]
    tw, th = ficha["nativo"][0], ficha["nativo"][1]
    bx0, by0, bx1, by1 = caixa_conteudo(im)
    cw, chh = (bx1 - bx0) / cols, (by1 - by0) / rows
    print("  folha: %d×%d = %d tiles de %dx%d px (célula de %.0fx%.0f na fonte)"
          % (cols, rows, cols * rows, tw, th, cw, chh))

    grades, vazios = [], 0
    for r in range(rows):
        for c in range(cols):
            x0 = bx0 + int(round(c * cw)); x1 = bx0 + int(round((c + 1) * cw))
            y0 = by0 + int(round(r * chh)); y1 = by0 + int(round((r + 1) * chh))
            sub = im.crop((x0, y0, x1, y1))
            cb = caixa_conteudo(sub)
            if cb is None or cb[2] - cb[0] < 2 or cb[3] - cb[1] < 2:
                grades.append([[(0, 0, 0, 0)] * tw for _ in range(th)])
                vazios += 1
                continue
            g, metodo, _ = reduzir(sub, cb, tw, th, 0, "conter")
            grades.append(g)
    if vazios:
        print("  aviso: %d célula(s) saíram vazias — a fonte não desenhou ali" % vazios)

    # ── 3. quantização + rampa compartilhada ─────────────────────────────────
    pal, bioma = carregar_paleta(os.path.join(ROOT, PALETA),
                                 ficha.get("bioma", "planicie"),
                                 ficha.get("compartilhado", False),
                                 ficha.get("contorno", False))
    fora = dmax = dmedia = n = 0
    for g in grades:
        f, dm, dmd, nn = quantizar(g, pal)
        fora += f; dmax = max(dmax, dm); dmedia += dmd * nn; n += nn
    k = ficha["cores_max"]
    antes = len({p[:3] for g in grades for linha in g for p in linha if p[3]})
    grades, depois = reduzir_cores_folha(grades, pal, k)
    print("  quantizado em %d cores (%s): %d/%d px ajustados, distância média %.0f"
          % (len(pal), ficha.get("bioma", "planicie"), fora, n, dmedia / max(1, n)))
    print("  rampa compartilhada: %d → %d cores próprias (orçamento %d)" % (antes, depois, k))

    # ── 4. classificação e validação ─────────────────────────────────────────
    # O vazio interno do tile só sai no recorte global; sem ele, a fonte marcou
    # a borda exposta com o tom mais claro da rampa e é por ele que classifico.
    tem_vazio = any(p[3] == 0 for g in grades for linha in g for p in linha)
    marcador = None
    if not tem_vazio:
        marcador = max({p[:3] for g in grades for linha in g for p in linha if p[3]},
                       key=lambda c: c[0] * 3 + c[1] * 6 + c[2])
        print("  sem vazio recortado: classificando pelo tom claro da borda (%s)"
              % rgb_para_hex(marcador))
    problemas, alfas_totais, tiles = [], Counter(), []
    for i, g in enumerate(grades):
        probs, alfas = validar(g, pal, False, exigir_transparente=False)
        for pr in probs:
            problemas.append("tile %d: %s" % (i, pr))
        alfas_totais += alfas
        abertos, contagem = lados_abertos(g, marcador)
        bit = sum(b for nome, b in LADOS if nome in abertos)
        tiles.append({
            "indice": i,
            "linha": i // cols,
            "coluna": i % cols,
            "lados_abertos": abertos,
            "marcador_por_borda": {n: contagem[n] for n, _ in LADOS},
            "codigo_autotile": bit,
            "pixels_opacos": alfas.get(255, 0),
            "preenchimento": round(alfas.get(255, 0) / (tw * th), 3),
        })
    tabela = {}
    for t_ in tiles:
        tabela.setdefault(t_["codigo_autotile"], []).append(t_["indice"])
    if len({len(g) for g in grades}) != 1 or len({len(g[0]) for g in grades}) != 1:
        problemas.append("tiles de tamanhos diferentes na mesma folha")

    cores = Counter(p[:3] for g in grades for linha in g for p in linha if p[3])
    print("  autotile: %d dos 16 casos cobertos; %d tiles de infill (código 0)"
          % (len(tabela), len(tabela.get(0, []))))
    print("  cores usadas: %d %s" % (len(cores), [rgb_para_hex(c) for c in sorted(cores, key=lambda c: -cores[c])]))
    print("  alfa: %d opacos, %d transparentes" % (alfas_totais.get(255, 0), alfas_totais.get(0, 0)))
    if problemas:
        for pr in problemas[:20]:
            print("  ✗ " + pr)
    else:
        print("  ✓ validação: alfa binário, 0 cor fora da paleta, %d tiles todos em %dx%d"
              % (len(grades), tw, th))

    # ── 5. exportação ────────────────────────────────────────────────────────
    saida_dir = os.path.join(ROOT, args.saida) if args.saida else os.path.join(
        ROOT, os.path.dirname(FICHAS_PADRAO))
    os.makedirs(saida_dir, exist_ok=True)
    base = os.path.join(saida_dir, pid)

    folha = Image.new("RGBA", (cols * tw, rows * th), (0, 0, 0, 0))
    for i, g in enumerate(grades):
        folha.paste(grade_para_imagem(g), ((i % cols) * tw, (i // cols) * th))
    folha.save(base + "-nativo.png")
    fundo = hex_para_rgb(bioma["fundo"][1])
    for fator in (3, 8):
        prev = Image.new("RGB", (folha.width * fator, folha.height * fator), fundo)
        tri = ampliar(folha, fator)
        prev.paste(tri, (0, 0), tri)
        prev.save(base + "-preview-%dx.png" % fator)

    rel = {
        "id": pid,
        "titulo": ficha.get("titulo", ""),
        "categoria": ficha.get("categoria", ""),
        "bioma": ficha.get("bioma", "planicie"),
        "fonte": {
            "arquivo": ficha["fonte"],
            "dimensoes": [im.width, im.height],
            "sha256": sha256_arquivo(fonte_path),
        },
        "chroma": {
            "familia": familia,
            "cor_medida": rgb_para_hex(chave),
            "tolerancia": tol,
            "metodo": "inundação pelas bordas",
            "pixels_recortados": removidos,
            "pixels_com_spill_corrigido": spill,
        },
        "caixa_conteudo": [bx0, by0, bx1, by1],
        "folha": {
            "colunas": cols, "linhas": rows, "total": len(grades),
            "tile": [tw, th],
            "celula_na_fonte": [round(cw), round(chh)],
            "celulas_vazias": vazios,
            "metodo_reducao": metodo,
        },
        "nativo": {
            "dimensoes": [folha.width, folha.height],
            "arquivo": os.path.relpath(base + "-nativo.png", ROOT),
            "sha256": sha256_png(folha),
            "cores_usadas": [rgb_para_hex(c) for c in sorted(cores, key=lambda c: -cores[c])],
            "contagem_de_cores": len(cores),
            "pixels_opacos": alfas_totais.get(255, 0),
            "pixels_transparentes": alfas_totais.get(0, 0),
        },
        "quantizacao": {
            "paleta": "docs/arte/paleta-celeste.json",
            "compartilhado": bool(ficha.get("compartilhado")),
            "rampa": {"antes": antes, "depois": depois, "orcamento": k,
                      "compartilhada_entre_tiles": True},
            "contorno": {"feito": False, "px": 0},
            "cores_na_paleta": len(pal),
            "dither": False,
            "metrica": "dr^2*3 + dg^2*6 + db^2 (igual ao quantizeToPalette do runtime)",
            "pixels_ajustados": fora,
        },
        "autotile": {
            "codigo": "bit 1=norte, 2=leste, 4=sul, 8=oeste; 0 = infill",
            "modo": "transparência" if tem_vazio else "marcador de borda clara",
            "marcador": None if tem_vazio else rgb_para_hex(marcador),
            "casos_cobertos": len(tabela),
            "tabela": {str(c): v for c, v in sorted(tabela.items())},
            "tiles": tiles,
        },
        "validacao": {"ok": not problemas, "problemas": problemas},
        "preview_3x": os.path.relpath(base + "-preview-3x.png", ROOT),
        "preview_8x": os.path.relpath(base + "-preview-8x.png", ROOT),
    }
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump(rel, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("  → %s" % rel["nativo"]["arquivo"])
    print("  → %s" % rel["preview_8x"])
    print("  → %s" % os.path.relpath(base + ".json", ROOT))
    return rel


def main():
    ap = argparse.ArgumentParser(description="Pipeline de pixelização FUMIGA (F0b-2)")
    ap.add_argument("--fichas", default=FICHAS_PADRAO, help="JSON com as fichas das peças")
    ap.add_argument("--peca", help="processa só a peça com este id")
    ap.add_argument("--saida", help="diretório de saída (padrão: o das fichas)")
    ap.add_argument("--tudo", action="store_true", help="atalho para --fichas padrão")
    args = ap.parse_args()

    with open(os.path.join(ROOT, args.fichas), encoding="utf-8") as f:
        doc = json.load(f)
    fichas = doc["pecas"] if isinstance(doc, dict) else doc
    if args.peca:
        fichas = [f for f in fichas if f["id"] == args.peca]
        if not fichas:
            raise SystemExit("peça %r não está nas fichas" % args.peca)

    relatorios = [processar_folha(ficha, args) if ficha.get("layout")
                   else processar(ficha, args) for ficha in fichas]

    print("═" * 70)
    reprovadas = [r["id"] for r in relatorios if not r["validacao"]["ok"]]
    lisas = [r["id"] for r in relatorios if not r.get("grade", {}).get("tem_grade", False)]
    if reprovadas:
        print("✗ REPROVADAS: %s — nenhuma arte gerada entra no jogo sem validação."
              % ", ".join(reprovadas))
        return 1
    print("✓ %d peça(s) nativas validadas: alfa binário, paleta exata, sem anti-aliasing."
          % len(relatorios))
    if lisas:
        print("⚠ fonte sem grade de pixel: %s — reduzidas por média de área. "
              "Para arte realmente nativa, regar pedindo blocos duros." % ", ".join(lisas))
    return 0


if __name__ == "__main__":
    sys.exit(main())
