#!/usr/bin/env python3
# ==============================================================================
# FUMIGA — reparo das camadas da cutscene NOITE BRANCA (decisão 2026-10-02)
# game/assets/cutscenes/noite_branca/{panel1,panel2_conflito}/<i>_<nome>.png
#
# Problema (as camadas vieram de um gerador de imagem):
#   • PNG RGB sem canal alfa — toda camada é 100% opaca, então a de cima tampa
#     todas as de baixo (o painel 1 mostrava só a moldura com xadrez cinza);
#   • 8 das 11 camadas têm o XADREZ DE "TRANSPARÊNCIA" DESENHADO na imagem
#     (claro em 5, escuro em 3) — e ele aparece até através da névoa;
#   • 3_ground do painel 1 é um chão visto de cima (perspectiva errada);
#   • 0_sky do painel 1 é quadrado (2048²) e saía achatado em 16:9;
#   • 1_distant do painel 1 traz a mesma faixa de montanhas duas vezes.
#
# O que este script faz (sem arte nova, tudo numérico e reproduzível):
#   1. lê os ORIGINAIS: art-source/cutscenes/noite_branca/_orig/ ou, se não
#      existirem, direto do histórico do Git (commit ORIG_REV) — nada se perde;
#   2. mede o xadrez de cada camada (período, fase e os dois tons, com deriva
#      local) e recupera o alfa de verdade:
#        sólido  — cidadela, montanhas, ruínas, folhagem: recorte limpo, borda
#                  sem halo (cor da borda vem de dentro do objeto);
#        névoa   — os DOIS TONS do xadrez fazem o papel dos fundos branco/preto
#                  da recuperação de alfa: onde o xadrez aparece através da
#                  névoa, o contraste que sobrou mede a transparência;
#        luz     — partículas sobre xadrez escuro: "cor para alfa" contra o
#                  tom do xadrez em cada pixel;
#        véu     — névoa e raios pintados POR CIMA do xadrez (quase não há casa
#                  limpa): média de um período inteiro apaga o xadrez e o véu
#                  escuro uniforme sai;
#        moldura — miolo vazado e bordas mais FINAS (pedido do usuário):
#                  deformação suave só na faixa da borda, cantos proporcionais;
#   3. céu do painel 1 recortado em 16:9 (sem achatar), uma só faixa de
#      montanhas, 3_ground fora da pilha;
#   4. grava cada camada JÁ NO TAMANHO EM QUE A CUTSCENE DESENHA (320×180 RGBA,
#      ampliada 3× sem suavização): de 32,6 MB para ~0,6 MB.
#
# Variante aprovada pelo usuário (2026-10-02): "nitida" (pixel do centro de
# cada célula, alfa binário nos sólidos) e moldura a 35% nas laterais.
#
# Painel 3 (2026-10-04): arte NOVA, aprovada em 2 opções por camada. As camadas
# de luz (a Pálida, a névoa da frente, as partículas) foram geradas sobre PRETO
# LISO — o próprio brilho vira o alfa ("glow"), sem xadrez nenhum. Os originais
# não estão no Git: moram em art-source/.../_orig/panel3_gancho/ (+ espelho em
# ~/art-source-backup/), como manda a Regra 13.
#
# Requer: Python 3 + Pillow + NumPy (mesma base dos outros scripts de tools/)
# Uso:
#   python3 tools/fix_noite_branca.py                 # repara e grava no jogo
#   python3 tools/fix_noite_branca.py --report        # só mede, não grava
#   python3 tools/fix_noite_branca.py --variant suave # alternativa: média da área
#   python3 tools/fix_noite_branca.py --out DIR       # grava em outra pasta
# ==============================================================================
import argparse
import os
import subprocess
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fix_title_parallax import box_blur, inpaint, label_components  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME_DIR = os.path.join(ROOT, "game", "assets", "cutscenes", "noite_branca")
ORIG_DIR = os.path.join(ROOT, "art-source", "cutscenes", "noite_branca", "_orig")
BACKUP_DIR = os.path.join(os.path.expanduser("~"), "art-source-backup", "cutscenes", "noite_branca", "_orig")
ORIG_REV = "645dc68018961b8a96a6059a94d69df2264df255"  # último commit com os PNGs originais
ORIG_GIT = "game/assets/cutscenes/noite_branca"
OUT_W, OUT_H = 320, 180   # o que drawCutscene desenha (baseW × baseH, ampliado 3×)

# Receita de cada camada. kind: opaque | solid | mist | light | haze | glow | frame | drop
LAYERS = [
    ("panel1", "0_sky", dict(kind="opaque", crop_top=0.0)),
    ("panel1", "1_distant", dict(kind="solid", keep_rows=(0, 650))),   # 2ª faixa repetida fica de fora
    ("panel1", "2_mid", dict(kind="solid")),
    ("panel1", "3_ground", dict(kind="drop")),
    ("panel1", "4_foreground", dict(kind="solid")),
    ("panel1", "5_particles", dict(kind="light", darken=False)),
    ("panel1", "6_vfx", dict(kind="haze", floor=0.25)),
    ("panel1", "7_vignette", dict(kind="frame", thin=0.35)),   # usuário: moldura bem mais fina
    ("panel2_conflito", "0_sky", dict(kind="opaque")),
    ("panel2_conflito", "1_distant", dict(kind="mist")),
    ("panel2_conflito", "2_mid", dict(kind="mist")),
    # painel 3 — a Pálida "no alto da névoa" (originais 2096×1152, 2048², 2672×1504, 2048×1152)
    ("panel3_gancho", "0_sky", dict(kind="opaque")),                       # bruma em espiral, 16:9 pelo meio
    ("panel3_gancho", "2_mid", dict(kind="glow", floor=10,                 # a Pálida: 12,5 px do original por
                                    place=(12.5, 1073, 92, 160, 30))),     # pixel; corpo no centro, antenas em y=30
    ("panel3_gancho", "4_foreground", dict(kind="glow", floor=4, opacity=0.9)),   # banco de névoa da frente
    ("panel3_gancho", "5_particles", dict(kind="glow", floor=13, pool="max")),    # cisco de memória: 1 px nítido
]


# ------------------------------------------------------------------ originais
def read_original(panel, name):
    """RGB float32 0..255 do PNG original: art-source/, o espelho da Regra 13
    (~/art-source-backup/) ou o histórico do Git (painéis 1 e 2)."""
    local = os.path.join(ORIG_DIR, panel, name + ".png")
    if not os.path.exists(local):
        mirror = os.path.join(BACKUP_DIR, panel, name + ".png")
        git = subprocess.run(["git", "-C", ROOT, "show", f"{ORIG_REV}:{ORIG_GIT}/{panel}/{name}.png"],
                             capture_output=True)
        if os.path.exists(mirror):
            with open(mirror, "rb") as fh:
                blob = fh.read()
        elif git.returncode == 0:
            blob = git.stdout
        else:
            sys.exit(f"original não encontrado: {local}\n(nem em {mirror}, nem no Git em {ORIG_REV[:7]})")
        os.makedirs(os.path.dirname(local), exist_ok=True)
        with open(local, "wb") as fh:   # cópia de trabalho dos originais (fora do Git)
            fh.write(blob)
    im = Image.open(local).convert("RGB")
    return np.asarray(im, dtype=np.float32).copy()


# --------------------------------------------------------------- xadrez falso
def periodic_fit(profile, offset):
    """Período e fase de um trem de picos (transições do xadrez): mediana dos
    intervalos entre picos fortes e depois DFT fina numa janela estreita."""
    n = profile.size
    thr = 0.3 * np.percentile(profile, 99.5)
    loc = np.flatnonzero((profile[1:-1] >= thr) & (profile[1:-1] >= profile[:-2]) & (profile[1:-1] > profile[2:])) + 1
    gaps = np.diff(loc)
    gaps = gaps[gaps >= 4]
    p0 = float(np.median(gaps))
    pos = offset + np.arange(n, dtype=np.float64)
    best = (0.0, p0, 0.0)
    for p in np.arange(p0 - 1.0, p0 + 1.0, 0.002):
        s = np.sum(profile * np.exp(-2j * np.pi * pos / p))
        if abs(s) > best[0]:
            best = (abs(s), p, s)
    _, p, s = best
    o = (-np.angle(s) * p / (2 * np.pi)) % p
    return float(p), float(o)


def cblur(z, r):
    """Soma numa janela (2r+1)² com zeros fora da imagem (serve para campos
    complexos: repetir a borda, como o box_blur faz, entortaria a fase)."""
    k = 2 * r + 1
    c = np.cumsum(np.cumsum(np.pad(z, r), 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)))
    return c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]


def two_tones(rgb, mask):
    """Os dois tons do xadrez entre os pixels candidatos (k-médias em 1D)."""
    px = rgb[mask]
    lum = px.mean(1)
    t = (np.percentile(lum, 5) + np.percentile(lum, 95)) / 2
    for _ in range(8):
        lo, hi = lum[lum < t], lum[lum >= t]
        t = (np.median(lo) + np.median(hi)) / 2
    return np.median(px[lum < t], 0), np.median(px[lum >= t], 0)


class Checker:
    """Modelo do xadrez desenhado: período/fase em x e y, corrigidos pela deriva
    local da grade, e o tom de cada casa (que também varia um pouco)."""

    def __init__(self, rgb, tol, tone_range=(200, 256), tone_box=None):
        H, W, _ = rgb.shape
        if tone_box:   # região de xadrez limpo conhecida (tons pouco contrastados)
            x0, y0, x1, y1 = tone_box
            cand = np.zeros((H, W), bool)
            cand[y0:y1, x0:x1] = True
        else:
            mx, mn = rgb.max(2), rgb.min(2)
            cand = ((mx - mn) <= 12) & (mn >= tone_range[0]) & (mx < tone_range[1])
        lo, hi = two_tones(rgb, cand)
        near = (np.abs(rgb - lo).max(2) <= tol) | (np.abs(rgb - hi).max(2) <= tol)
        lum = rgb.mean(2)
        mxh = near[:, 1:] & near[:, :-1]
        myv = near[1:, :] & near[:-1, :]
        gx = (np.abs(np.diff(lum, axis=1)) * mxh).sum(0)
        gy = (np.abs(np.diff(lum, axis=0)) * myv).sum(1)
        self.px, self.ox = periodic_fit(gx, 1.0)   # transição entre x e x+1 fica em x+1
        self.py, self.oy = periodic_fit(gy, 1.0)
        X = np.arange(W, dtype=np.float32)[None, :] + 0.5
        Y = np.arange(H, dtype=np.float32)[:, None] + 0.5
        # 1º passo: grade global; define qual paridade é o tom claro
        par, edge = self._grid(X, Y, 0.0, 0.0)
        inner = near & ~edge
        light_is_1 = lum[inner & par].mean() > lum[inner & ~par].mean()
        # 2º passo: o gerador desenhou a grade com deriva (±1 px ou mais): a fase
        # local de cada região corrige a grade antes de recortar
        sign = np.where(par == light_is_1, 1.0, -1.0) * ~edge
        dx, dy = self._drift(lum, sign, near, (lo.mean() + hi.mean()) / 2, X, Y)
        par, edge = self._grid(X, Y, dx, dy)
        self.edge = edge
        self.is_hi = par == light_is_1      # True = casa clara
        inner = near & ~edge
        ok_hi = inner & self.is_hi & (np.abs(rgb - hi).max(2) <= tol)
        ok_lo = inner & ~self.is_hi & (np.abs(rgb - lo).max(2) <= tol)
        self.hi_map = self._local(rgb, ok_hi, hi)
        self.lo_map = self._local(rgb, ok_lo, lo)
        self.B = np.where(self.is_hi[..., None], self.hi_map, self.lo_map)
        self.coverage = float((ok_hi | ok_lo).mean())
        self.drift = float(np.percentile(np.hypot(dx, dy), 99))
        self.hi, self.lo = hi, lo

    def _grid(self, X, Y, dx, dy):
        fx = (X - dx - self.ox) / self.px
        fy = (Y - dy - self.oy) / self.py
        ix, iy = np.floor(fx), np.floor(fy)
        ex = np.minimum(fx - ix, 1 - (fx - ix)) * self.px   # distância à linha da grade (px)
        ey = np.minimum(fy - iy, 1 - (fy - iy)) * self.py
        par = ((ix + iy).astype(np.int64) & 1).astype(bool)
        return par, (ex < 1.25) | (ey < 1.25)

    def _drift(self, lum, sign, near, mid, X, Y):
        """Deslocamento local da grade pela fase das duas componentes do xadrez
        (frequências ±1/2p), medido só nos pixels com tom de xadrez; onde o
        xadrez não aparece, vale a média ponderada da vizinhança."""
        hp = (lum - mid) * near
        sign = sign * near
        R = int(round(2 * max(self.px, self.py)))
        dens = cblur(near.astype(np.float64), R) / cblur(np.ones(near.shape), R)
        phases = []
        for sy in (1.0, -1.0):
            w = np.exp(-1j * np.pi * (X / self.px + sy * Y / self.py))
            o = cblur(hp * w, R)
            m = cblur(sign * w, R)
            z = o * np.conj(m)
            zl = cblur(z, 4 * R)
            phases.append(np.angle(np.where(dens > 0.3, z, zl)))
        a, b = phases
        dx = -self.px * (a + b) / (2 * np.pi)
        dy = -self.py * (a - b) / (2 * np.pi)
        return dx.astype(np.float32), dy.astype(np.float32)

    @staticmethod
    def _local(rgb, ok, fallback):
        if ok.sum() < 50:
            return np.broadcast_to(fallback, rgb.shape).astype(np.float32)
        r = 24
        num = box_blur(np.where(ok[..., None], rgb, 0.0), r)
        den = box_blur(ok.astype(np.float32), r)
        est = np.where(den[..., None] > 0.02, num / np.maximum(den[..., None], 1e-6), fallback)
        known = den > 0.02
        if (~known).any():
            est = inpaint(est, known, radius=32, iters=12)
        return est.astype(np.float32)

    def distance_any(self, rgb):
        """Distância à mistura mais próxima dos dois tons, sem olhar a paridade:
        o gerador às vezes redesenha o xadrez com outra fase dentro de buracos
        fechados (entre arcos, entre galhos), e ali a paridade não vale."""
        return np.abs(rgb - self.mix(rgb)).max(2)

    def mix(self, rgb):
        a, b = self.lo_map, self.hi_map
        ab = b - a
        t = np.clip(((rgb - a) * ab).sum(2) / np.maximum((ab * ab).sum(2), 1e-6), 0, 1)
        return a + t[..., None] * ab

    def describe(self):
        return (f"período {self.px:.3f}×{self.py:.3f}px, fase ({self.ox:.2f}, {self.oy:.2f}), "
                f"deriva até {self.drift:.1f}px, "
                f"tons {tuple(int(v) for v in self.lo)} / {tuple(int(v) for v in self.hi)}, "
                f"casas limpas {self.coverage * 100:.1f}%")


# ------------------------------------------------------------------- recortes
def big_components(mask, min_area):
    """Só as manchas de fundo com pelo menos `min_area` px (1/10 de casa: os
    vãos dos arcos e entre teias são fundo; brilhos miúdos DENTRO do objeto
    continuam sendo objeto)."""
    lab, areas = label_components(mask)
    keep = np.zeros(len(areas) + 1, bool)
    keep[1:] = areas >= min_area
    return keep[lab + 1]


def dilate(mask, r):
    return box_blur(mask.astype(np.float32), r) > 1e-4


def edge_background(rgb, ck):
    """Fundo esperado em cada pixel; nas linhas da grade, a mistura dos dois
    tons mais próxima da cor do pixel."""
    return np.where(ck.edge[..., None], ck.mix(rgb), ck.B)


def defringe(rgb, alpha, bg, B, only=None):
    """Anel de 2 px colado ao fundo: a cor vem de dentro do objeto (sem halo do
    xadrez) e o alfa sai da projeção da cor do pixel entre fundo e objeto."""
    ring = (alpha > 0) & dilate(bg, 2)
    if only is not None:
        ring &= only
    core = (alpha > 0) & ~ring
    if not core.any() or not ring.any():
        return rgb, alpha
    inside = inpaint(rgb, core, radius=3, iters=4)
    fb = inside - B
    den = (fb * fb).sum(2)
    a_proj = np.clip(((rgb - B) * fb).sum(2) / np.maximum(den, 1e-6), 0, 1)
    ok = ring & (den > 20.0 ** 2)          # cor de dentro bem diferente do fundo
    rgb = np.where(ok[..., None], inside, rgb)
    alpha = np.where(ok, np.minimum(alpha, a_proj), alpha)
    return rgb, alpha


def matte_solid(rgb, ck, tol):
    """Objeto opaco sobre xadrez claro: fundo = manchas grandes com cor de
    xadrez (qualquer mistura dos dois tons, sem depender da paridade)."""
    bg = big_components(ck.distance_any(rgb) <= tol, 0.1 * ck.px * ck.py)
    alpha = (~bg).astype(np.float32)
    return defringe(rgb, alpha, bg, ck.mix(rgb)) + (bg,)


def matte_mist(rgb, ck, tol, t1=30.0, t2=80.0):
    """Sólido + névoa translúcida. Onde o xadrez aparece através da névoa, a
    diferença entre as casas claras e escuras vizinhas é (1 - alfa) vezes a
    diferença dos tons: os dois tons servem de fundo branco/preto."""
    d = ck.distance_any(rgb)
    bg = big_components(d <= tol, 0.1 * ck.px * ck.py)
    hi = (ck.is_hi & ~ck.edge).astype(np.float32)
    lo = (~ck.is_hi & ~ck.edge).astype(np.float32)
    r = int(round(0.75 * max(ck.px, ck.py)))
    m_hi = box_blur(rgb * hi[..., None], r) / np.maximum(box_blur(hi, r)[..., None], 1e-6)
    m_lo = box_blur(rgb * lo[..., None], r) / np.maximum(box_blur(lo, r)[..., None], 1e-6)
    dT = ck.hi_map - ck.lo_map
    k = ((m_hi - m_lo) * dT).sum(2) / np.maximum((dT * dT).sum(2), 1e-6)
    a_demod = np.clip(1.0 - np.abs(k), 0.0, 1.0)   # módulo: casa trocada não vira sólido
    ramp = np.clip((d - t1) / (t2 - t1), 0.0, 1.0)
    alpha = np.where(bg, 0.0, np.maximum(a_demod, ramp)).astype(np.float32)
    B = edge_background(rgb, ck)
    # cor da névoa sem o fundo: F = (C - (1 - a) B) / a
    a3 = np.maximum(alpha, 1e-3)[..., None]
    col = np.clip((rgb - (1.0 - alpha[..., None]) * B) / a3, 0, 255)
    col = np.where((alpha > 0.03)[..., None], col, rgb)
    # defringe só no contorno dos sólidos (a borda da névoa já é suave)
    col, alpha = defringe(col, alpha, bg | (alpha < 0.03), B, only=ramp >= 0.5)
    return col, alpha, bg


def matte_light(rgb, ck, darken):
    """'Cor para alfa' contra o tom do xadrez em cada pixel: a luz (partículas,
    raios, névoa clara) fica como estava sobre o xadrez e some onde era só
    xadrez. darken=False guarda só o que CLAREIA (partículas)."""
    B = edge_background(rgb, ck)
    up = np.clip((rgb - B) / np.maximum(255.0 - B, 1e-3), 0, 1)
    down = np.clip((B - rgb) / np.maximum(B, 1e-3), 0, 1) if darken else np.zeros_like(up)
    alpha = np.maximum(up, down).max(2)
    alpha = np.where(alpha < 0.035, 0.0, alpha).astype(np.float32)   # ruído do xadrez
    a3 = np.maximum(alpha, 1e-3)[..., None]
    col = np.clip((rgb - (1.0 - alpha[..., None]) * B) / a3, 0, 255)
    return col, alpha, alpha == 0


def window_mean(arr, w, axis):
    """Média numa janela de largura w (fracionária) centrada em cada pixel."""
    a = np.moveaxis(arr, axis, 0).astype(np.float64)
    n = a.shape[0]
    c = np.concatenate([np.zeros((1,) + a.shape[1:]), np.cumsum(a, axis=0)], 0)
    mid = np.arange(n) + 0.5
    lo, hi = np.clip(mid - w / 2, 0, n), np.clip(mid + w / 2, 0, n)
    shape = (-1,) + (1,) * (a.ndim - 1)
    def at(e):
        i0 = np.minimum(np.floor(e).astype(np.int64), n - 1)
        return c[i0] + (c[i0 + 1] - c[i0]) * (e - i0).reshape(shape)
    return np.moveaxis((at(hi) - at(lo)) / (hi - lo).reshape(shape), 0, axis)


def matte_haze(rgb, ck, floor):
    """Névoa e raios pintados POR CIMA do xadrez escuro (quase não há casa
    limpa): a média em exatamente um período (duas casas) em x e em y apaga o
    xadrez com todas as harmônicas; o que sobra é névoa sobre o tom médio das
    casas, que vira alfa (só o que clareia). `floor` tira o véu uniforme que o
    gerador espalhou na imagem toda."""
    I = window_mean(window_mean(rgb, 2 * ck.px, 1), 2 * ck.py, 0)
    M = (ck.lo + ck.hi) / 2
    up = np.clip((I - M) / np.maximum(255.0 - M, 1e-3), 0, 1).max(2)
    col = np.clip((I - (1.0 - up[..., None]) * M) / np.maximum(up, 1e-3)[..., None], 0, 255)
    alpha = np.clip((up - floor) / (1 - floor), 0, 1).astype(np.float32)
    return col.astype(np.float32), alpha, alpha == 0


# --------------------------------------------------------------- reamostragem
def matte_glow(rgb, floor, knee=255.0):
    """Luz pintada sobre PRETO liso (arte do painel 3): o brilho é o alfa —
    "cor para alfa" contra o preto, sem xadrez para medir. `floor` = ruído do
    preto do original (fica 100% transparente)."""
    alpha = np.clip((rgb.max(2) - floor) / (knee - floor), 0, 1).astype(np.float32)
    col = np.clip(rgb / np.maximum(alpha[..., None], 1e-3), 0, 255)
    return np.where(alpha[..., None] > 0, col, 0).astype(np.float32), alpha


def pool_max(alpha, xe, ye):
    """Máximo de cada célula: cisco de 1 px do original continua 1 px nítido
    (a média por área o apagaria)."""
    xi = np.clip(np.floor(xe[:-1]).astype(np.int64), 0, alpha.shape[1] - 1)
    yi = np.clip(np.floor(ye[:-1]).astype(np.int64), 0, alpha.shape[0] - 1)
    return np.maximum.reduceat(np.maximum.reduceat(alpha, yi, axis=0), xi, axis=1)


def integrate(arr, edges, axis):
    """Média exata de cada intervalo [e_i, e_i+1) (pixel = constante): serve
    para reduzir, recortar e deformar (moldura mais fina) de uma vez só."""
    a = np.moveaxis(arr, axis, 0).astype(np.float64)
    n = a.shape[0]
    c = np.concatenate([np.zeros((1,) + a.shape[1:]), np.cumsum(a, axis=0)], 0)
    e = np.clip(np.asarray(edges, np.float64), 0, n)
    i0 = np.minimum(np.floor(e).astype(np.int64), n - 1)
    f = (e - i0).reshape((-1,) + (1,) * (a.ndim - 1))
    ce = c[i0] + (c[i0 + 1] - c[i0]) * f
    w = np.maximum(np.diff(e), 1e-9).reshape((-1,) + (1,) * (a.ndim - 1))
    return np.moveaxis((ce[1:] - ce[:-1]) / w, 0, axis)


def resample(rgb, alpha, xe, ye):
    """RGBA pré-multiplicado -> média por área -> RGB + alfa (OUT_W × OUT_H)."""
    pre = np.concatenate([rgb * alpha[..., None], alpha[..., None]], 2)
    out = integrate(integrate(pre, xe, 1), ye, 0)
    a = out[..., 3]
    col = np.where(a[..., None] > 1e-6, out[..., :3] / np.maximum(a[..., None], 1e-6), 0)
    return col, a


def thin_axis(n, b0, b1, s):
    """Bordas (n+1) de saída -> coordenada na fonte: as faixas da moldura (b0 no
    começo, b1 no fim) ficam `s` vezes mais finas, o miolo vazado estica para
    compensar e a derivada muda suave (sem dobra nos enfeites)."""
    u = np.linspace(0, n, 8 * n + 1)
    d0, d1 = s * b0, s * b1
    k_mid = (n - b0 - b1) / (n - d0 - d1)
    w = 0.25 * min(d0, d1)
    def smooth(x, a, b):
        t = np.clip((x - a) / max(b - a, 1e-6), 0, 1)
        return t * t * (3 - 2 * t)
    deriv = (1 / s) + (k_mid - 1 / s) * smooth(u, d0 - w, d0 + w)
    deriv = deriv + ((1 / s) - k_mid) * smooth(u, n - d1 - w, n - d1 + w)
    f = np.concatenate([[0.0], np.cumsum((deriv[1:] + deriv[:-1]) / 2 * np.diff(u))])
    f *= n / f[-1]
    return lambda q: np.interp(q, u, f)


def frame_borders(alpha):
    """Espessura das quatro faixas da moldura (mediana na faixa do meio)."""
    H, W = alpha.shape
    open_ = alpha < 0.5
    def first(run):   # 1º índice com um trecho vazado longo (vãos do enfeite não contam)
        n = max(24, len(run) // 16)
        r = np.convolve(run.astype(np.int32), np.ones(n, np.int32), "valid") == n
        idx = np.flatnonzero(r)
        return idx[0] if idx.size else len(run)
    rows = range(int(H * 0.35), int(H * 0.65))
    cols = range(int(W * 0.35), int(W * 0.65))
    bl = np.median([first(open_[y]) for y in rows])
    br = np.median([first(open_[y, ::-1]) for y in rows])
    bt = np.median([first(open_[:, x]) for x in cols])
    bb = np.median([first(open_[::-1, x]) for x in cols])
    return float(bl), float(br), float(bt), float(bb)


# ------------------------------------------------------------------- camadas
CHECKER = {   # tolerância e onde estão os tons de cada xadrez
    ("panel1", "1_distant"): dict(tol=10),
    ("panel1", "2_mid"): dict(tol=10),
    ("panel1", "4_foreground"): dict(tol=10),
    ("panel1", "5_particles"): dict(tol=7, tone_range=(15, 60)),
    ("panel1", "6_vfx"): dict(tol=5, tone_box=(0, 0, 100, 90)),
    ("panel1", "7_vignette"): dict(tol=8, tone_range=(90, 125)),
    ("panel2_conflito", "1_distant"): dict(tol=10),
    ("panel2_conflito", "2_mid"): dict(tol=10),
}


def process(panel, name, cfg, variant, log=print):
    """-> (rgb uint8 [OUT_H, OUT_W, 3], alfa uint8 ou None se opaca)"""
    kind = cfg["kind"]
    rgb = read_original(panel, name)
    H, W, _ = rgb.shape
    xe = np.linspace(0, W, OUT_W + 1)
    ye = np.linspace(0, H, OUT_H + 1)
    if W / H < OUT_W / OUT_H - 0.01 and not cfg.get("place"):   # quadrado: recorte 16:9, sem achatar
        ch = W * OUT_H / OUT_W
        y0 = cfg.get("crop_top", 0.0) * (H - ch)
        ye = np.linspace(y0, y0 + ch, OUT_H + 1)
        log(f"    recorte 16:9: y {y0:.0f}..{y0 + ch:.0f} de {H}")
    elif W / H > OUT_W / OUT_H + 0.01:                           # mais largo: recorte pelo meio
        cw = H * OUT_W / OUT_H
        xe = np.linspace((W - cw) / 2, (W + cw) / 2, OUT_W + 1)
        log(f"    recorte 16:9: x {(W - cw) / 2:.0f}..{(W + cw) / 2:.0f} de {W}")
    if kind == "opaque":
        col, _ = resample(rgb, np.ones((H, W), np.float32), xe, ye)
        return np.clip(np.rint(col), 0, 255).astype(np.uint8), None
    if kind == "glow":
        col, alpha = matte_glow(rgb, cfg["floor"], cfg.get("knee", 255.0))
        alpha *= cfg.get("opacity", 1.0)
        if cfg.get("place"):   # figura solta: (escala, ponto do original, ponto da camada)
            s, cx, cy, tx, ty = cfg["place"]
            xe = cx - tx * s + s * np.arange(OUT_W + 1, dtype=np.float64)
            ye = cy - ty * s + s * np.arange(OUT_H + 1, dtype=np.float64)
            log(f"    figura: {s} px do original por pixel; ({cx},{cy}) -> ({tx},{ty})")
        out_c, out_a = resample(col, alpha, xe, ye)
        if cfg.get("pool") == "max":
            out_a = pool_max(alpha, xe, ye)
        out_a = np.where(out_a < 0.02, 0.0, out_a)
        out_c = np.where((out_a > 0)[..., None], out_c, 0)
        return (np.clip(np.rint(out_c), 0, 255).astype(np.uint8),
                np.clip(np.rint(out_a * 255), 0, 255).astype(np.uint8))
    c = CHECKER[(panel, name)]
    ck = Checker(rgb, c["tol"], c.get("tone_range", (200, 256)), c.get("tone_box"))
    log(f"    xadrez: {ck.describe()}")
    if kind in ("solid", "frame"):
        col, alpha, bg = matte_solid(rgb, ck, c["tol"])
    elif kind == "mist":
        col, alpha, bg = matte_mist(rgb, ck, c["tol"])
    elif kind == "haze":
        col, alpha, bg = matte_haze(rgb, ck, cfg.get("floor", 0.0))
    else:
        col, alpha, bg = matte_light(rgb, ck, darken=cfg.get("darken", True))
        if cfg.get("floor"):   # véu escuro pintado sobre o xadrez inteiro: fora
            f = cfg["floor"]
            alpha = np.clip((alpha - f) / (1 - f), 0, 1).astype(np.float32)
    if cfg.get("keep_rows"):
        y0, y1 = cfg["keep_rows"]
        alpha[:y0] = 0
        alpha[y1:] = 0
    if kind == "frame":
        bl, br, bt, bb = frame_borders(alpha)
        s = cfg["thin"]
        log(f"    moldura: faixas E{bl:.0f} D{br:.0f} C{bt:.0f} B{bb:.0f} px -> x{s}")
        xe = thin_axis(W, bl, br, s)(xe)
        ye = thin_axis(H, bt, bb, s)(ye)
    if variant == "nitida" and kind in ("solid", "frame", "mist"):
        # pixel nítido: amostra o centro de cada célula (como o drawImage sem
        # suavização fazia em tempo real) e alfa binário nos sólidos
        xc = np.clip(((xe[1:] + xe[:-1]) / 2).astype(np.int64), 0, W - 1)
        yc = np.clip(((ye[1:] + ye[:-1]) / 2).astype(np.int64), 0, H - 1)
        out_c = col[yc][:, xc]
        out_a = alpha[yc][:, xc]
        avg_c, avg_a = resample(col, alpha, xe, ye)
        # alfa do centro só decide entre 0/1; a cor média evita "pixel solto"
        out_c = np.where((avg_a > 0.5)[..., None] & (out_a < 0.5)[..., None], avg_c, out_c)
        if kind == "mist":
            out_a = np.where(avg_a > 0.85, 1.0, np.where(avg_a < 0.06, 0.0, avg_a))
        else:
            out_a = (avg_a >= 0.5).astype(np.float32)
    else:
        out_c, out_a = resample(col, alpha, xe, ye)
        if kind in ("solid", "frame", "mist"):
            out_a = np.where(out_a > 0.92, 1.0, np.where(out_a < 0.06, 0.0, out_a))
        else:
            out_a = np.where(out_a < 0.02, 0.0, out_a)
    out_c = np.where((out_a > 0)[..., None], out_c, 0)
    return (np.clip(np.rint(out_c), 0, 255).astype(np.uint8),
            np.clip(np.rint(out_a * 255), 0, 255).astype(np.uint8))


def save_layer(path, rgb, alpha):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if alpha is None:
        im = Image.fromarray(rgb, "RGB")
    else:
        im = Image.fromarray(np.dstack([rgb, alpha]), "RGBA")
    im.save(path, optimize=True)
    return os.path.getsize(path)


def main():
    ap = argparse.ArgumentParser(description="Reparo das camadas da Noite Branca")
    ap.add_argument("--variant", choices=("nitida", "suave"), default="nitida")
    ap.add_argument("--out", default=GAME_DIR, help="pasta de saída (padrão: o jogo)")
    ap.add_argument("--report", action="store_true", help="só mede, não grava")
    ap.add_argument("--only", nargs="*", default=None, help="ex.: panel1/2_mid")
    args = ap.parse_args()
    total_before = total_after = 0
    for panel, name, cfg in LAYERS:
        tag = f"{panel}/{name}"
        if args.only and tag not in args.only:
            continue
        game_png = os.path.join(GAME_DIR, panel, name + ".png")
        orig = os.path.join(ORIG_DIR, panel, name + ".png")
        read_original(panel, name)   # garante a cópia de trabalho do original
        total_before += os.path.getsize(orig)
        print(f">> {tag} ({cfg['kind']})")
        if cfg["kind"] == "drop":
            if not args.report and os.path.exists(game_png) and os.path.abspath(args.out) == GAME_DIR:
                os.remove(game_png)
            print("    fora da pilha (chão visto de cima)")
            continue
        rgb, alpha = process(panel, name, cfg, args.variant)
        if alpha is not None:
            print(f"    transparente {np.mean(alpha == 0) * 100:.1f}%  meio-tom {np.mean((alpha > 0) & (alpha < 255)) * 100:.1f}%")
        if not args.report:
            size = save_layer(os.path.join(args.out, panel, name + ".png"), rgb, alpha)
            total_after += size
            print(f"    {OUT_W}x{OUT_H} {'RGBA' if alpha is not None else 'RGB'} — {size / 1024:.1f} KB")
    print(f"\noriginais: {total_before / 1048576:.1f} MB" + (f"  ->  saída: {total_after / 1024:.0f} KB" if total_after else ""))


if __name__ == "__main__":
    main()
