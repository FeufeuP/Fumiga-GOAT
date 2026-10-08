#!/usr/bin/env python3
"""Inventário de imagens versionadas; não altera assets. Requer Pillow apenas no ambiente de arte.
Uso: python tools/inventory_visual_assets.py
A classificação é de arquivos/carregadores, não prova de uso em todos os estados do jogo.
"""
import csv
import hashlib
import io
import re
import subprocess
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/arte'
IMAGE_EXT = {'.png', '.jpg', '.jpeg', '.ico', '.webp', '.gif', '.svg'}


def tracked():
    return sorted(x for x in subprocess.check_output(
        ['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0') if x)


def source_links():
    """Resolve as chamadas simples do pipeline existente, sem executá-lo."""
    variables = {'ROOT': '.'}
    links = {}
    def expand(value):
        for _ in range(4):
            value = re.sub(r'\$(\w+)', lambda m: variables.get(m[1], m[0]), value)
        return value.removeprefix('./')
    for line in (ROOT / 'tools/prepare_assets.sh').read_text().splitlines():
        for key, value in re.findall(r'(\w+)="([^"]*)"', line):
            if key != 'ROOT' and '$(' not in value:
                variables[key] = expand(value)
        m = re.match(r'^(species|animal|prop|icn)\s+"([^"]+)"\s+(\S+)', line)
        if m:
            folder = {'species': 'ants', 'animal': 'animals', 'prop': 'props', 'icn': 'icons'}[m[1]]
            links[f'game/assets/sprites/{folder}/{m[3]}'] = expand(m[2])
    links['game/assets/sprites/ants/queen.png'] = 'formigas/rework-rainha.png'
    return links


def classify(path):
    name = Path(path).name
    if path.startswith('game/assets/sprites/ants/'):
        return ('Inimigos comuns', 'F6') if name.startswith('e_') else ('Rainha e castas', 'F2')
    if path.startswith('game/assets/sprites/animals/'):
        return 'Chefes animais / folhas direcionais', 'F4'
    if path.startswith('game/assets/sprites/props/'):
        if name.startswith('nest'): return 'Formigueiro exterior / dano', 'F7'
        if name.startswith('crys'): return 'Recursos / cristais', 'F2'
        if name.startswith('rock'): return 'Cenário / pedras', 'F6'
        if name.startswith('tree'): return 'Cenário / árvores', 'F6'
        if name.startswith('bush'): return 'Cenário / arbustos', 'F6'
        return 'Cenário / outros props', 'F6'
    if path.startswith('game/assets/sprites/icons/'): return 'Ícones', 'F1'
    if path.startswith('game/assets/sprites/fx/'): return 'VFX / névoa', 'F2'
    if path.startswith('game/assets/ui/'):
        if name.startswith('lore_'): return 'HUD / atlas orgânicos', 'F1'
        if name.startswith('tree_'): return 'Árvore ancestral', 'F3'
        if name.startswith('maca_'): return 'Maçãs', 'F3'
        if name.startswith('santuario_'): return 'Santuários', 'F3'
        if name.startswith('flor'): return 'Flores regulares e supremas', 'F3'
        return 'UI / outros', 'F3'
    if path.startswith('game/assets/parallax/'): return 'TITLE / parallax', 'F5'
    if path.startswith('game/assets/cutscenes/'): return 'Cutscenes / camadas', 'F5'
    if path.startswith('game/assets/loading/'): return 'Carregamento / ilustrações', 'F5'
    if path.startswith('app/'): return 'Distribuição / PWA', 'F9'
    if path.startswith('installers/'): return 'Distribuição / nativos', 'F9'
    if path.startswith('playtest/'): return 'Documentação / captura', 'F9'
    if path.startswith('Imagens inspiração/'): return 'Referência visual / não runtime', 'ACERVO'
    return 'Acervo-fonte / ' + path.split('/')[0], 'ACERVO'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    paths = tracked()
    source = (ROOT / 'game/js/assets.js').read_text()
    manifest = {f'game/assets/{rel}': key for key, rel in re.findall(
        r'^\s+(\w+): "([^"]+\.png)"', source, re.M)}
    links = source_links()
    inverse = {}
    for dest, origin in links.items(): inverse.setdefault(origin, []).append(dest)
    images = []
    ledger = []
    for path in paths:
        data = (ROOT / path).read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        ext = Path(path).suffix.lower()
        try:
            text = data.decode('utf-8')
            kind, lines = 'texto UTF-8', len(text.splitlines())
        except UnicodeDecodeError:
            kind, lines = 'binário', ''
        ledger.append({'caminho': path, 'bytes': len(data), 'sha256': sha,
                       'tipo': kind, 'linhas': lines,
                       'metodo': 'leitura automatizada de bytes; não revisão manual integral'})
        if ext not in IMAGE_EXT: continue
        with Image.open(io.BytesIO(data)) as im:
            im.load()
            width, height, mode = im.width, im.height, im.mode
            alpha = 'sim' if 'A' in im.getbands() or 'transparency' in im.info else 'não'
        category, phase = classify(path)
        key = manifest.get(path, '')
        source_file = links.get(path, '')
        loader = 'acervo; não é carregador do jogo'
        if key: loader = 'game/js/assets.js:MANIFEST (carregado; uso visual exige consumidor)'
        elif '/cutscenes/' in path: loader = 'game/js/cutscenes.js:layerUrl / preload.js'
        elif '/loading/' in path: loader = 'game/js/loading_screen.js:LOADING_IMAGE_FILES'
        elif '/ui/santuario_' in path: loader = 'game/js/assets.js:loadSantuario / preload.js'
        elif '/ui/lore_' in path: loader = 'game/js/lore_hud.js:loadLoreHUD'
        elif path.startswith('game/assets/'): loader = 'sem carregador localizado; auditar antes de excluir ou recriar'
        elif path.startswith('app/'): loader = 'HTML / manifests web / app'
        elif path.startswith('installers/'): loader = 'configuração dos instaladores'
        elif path.startswith('playtest/'): loader = 'PLAYTEST.md'
        action = 'recriar após aprovação; preservar contrato; substituir no mesmo caminho'
        if phase == 'ACERVO':
            action = 'preservar original; refazer somente derivado em uso, sem apagar banco de arte'
        if loader.startswith('sem carregador'): action = 'decidir manter/arquivar; não recriar automaticamente'
        if path.endswith('boar_attack.png'):
            action = 'carregado no MANIFEST, fora de BOSS_ANIMS; decidir uso antes de produzir'
        if path.startswith('playtest/'): action = 'recapturar após integração, não gerar por IA'
        images.append({'caminho': path, 'categoria': category, 'fase': phase,
                       'largura': width, 'altura': height, 'modo': mode, 'canal_alfa': alpha,
                       'bytes': len(data), 'sha256': sha, 'chave_manifest': key,
                       'carregador_ou_referencia': loader, 'fonte_pipeline': source_file,
                       'derivados_pipeline': ';'.join(inverse.get(path, [])),
                       'acao_planejada': action})
    duplicates = Counter(r['sha256'] for r in images)
    for row in images: row['arquivos_com_mesmos_bytes'] = duplicates[row['sha256']]
    for name, rows in [('inventario-imagens.csv', images), ('varredura-repositorio.csv', ledger)]:
        with (OUT / name).open('w', newline='', encoding='utf-8') as out:
            writer = csv.DictWriter(out, fieldnames=list(rows[0]), lineterminator='\n')
            writer.writeheader()
            writer.writerows(rows)
    print(f'{len(paths)} arquivos; {len(images)} imagens; {sum(r["bytes"] for r in images)} bytes de imagem')
    for category, count in sorted(Counter(r['categoria'] for r in images).items()):
        print(f'{count:4} {category}')
    print(f'{len(links)} vínculos fonte → derivado no pipeline; nenhum asset alterado')


if __name__ == '__main__':
    main()
