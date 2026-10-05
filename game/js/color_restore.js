// Restaura gradualmente a saturação original de uma imagem, sem Canvas.filter.
// O canvas e os buffers são reutilizados; pixels só são processados quando a
// imagem ou o progresso mudam (nunca por frame). Compatível com canvas mobile.
//
// Regra 14 (pré-carregamento do TITLE): o mesmo trabalho existe em FATIAS
// (`restore.steps`, um gerador) para o preload.js avançar poucos ms por quadro;
// `restore()` termina na hora o que faltar. Uma imagem nova é preparada num
// canvas fora de vista e só entra já com a cor aplicada (nada pela metade).
// `lean`: depois de assar guarda só o canvas, sem os buffers de pixels — para
// manter vários restauradores vivos ao mesmo tempo (um por santuário).
// `restore.lean(false)` volta a guardá-los enquanto a tela está aberta, para
// compras seguidas recolorirem sem preparar tudo de novo.
// `drawSource`: o pré-carregamento passa um ImageBitmap já decodificado fora da
// thread principal; o cache continua chaveado pela imagem original.
import { drainSteps } from "./utils.js";

const SLICE = 1 << 15;   // pixels por fatia: ~1 ms num celular médio
const EPS = .0001;
const level = (s) => Math.max(0, Math.min(1, Number.isFinite(s) ? s : 0));

export function createColorRestorer({ lean = false } = {}) {
  let source = null, canvas = null, context = null, failed = null;
  let original = null, output = null, gray = null, applied = -1, bakes = 0;

  const ready = (image, amount) => image === source && !!canvas && Math.abs(amount - applied) < EPS;
  function fail(image) {
    source = failed = image; canvas = context = original = output = gray = null; applied = -1;
  }

  function* steps(image, saturation = 0, drawSource = image) {
    const amount = level(saturation);
    if (ready(image, amount) || image === failed) return;
    const startBakes = bakes;
    let cv = canvas, ctx = context, px = original, out = output, g = gray;
    if (image !== source || !px) {
      if (typeof document === "undefined" || !image?.width || !image?.height) return fail(image);
      cv = document.createElement("canvas");
      cv.width = image.width; cv.height = image.height;
      ctx = cv.getContext("2d", { willReadFrequently: true });
      if (!ctx) return fail(image);
      ctx.drawImage(drawSource || image, 0, 0);
      const data = ctx.getImageData(0, 0, cv.width, cv.height);
      // Os testes de lógica usam um canvas simulado sem pixels reais.
      if (!data || data.data.length !== cv.width * cv.height * 4 ||
          typeof ctx.createImageData !== "function" || typeof ctx.putImageData !== "function") return fail(image);
      px = data.data;
      out = ctx.createImageData(cv.width, cv.height);
      g = new Uint8Array(cv.width * cv.height);
      for (let p0 = 0; p0 < g.length; p0 += SLICE) {
        yield;
        const p1 = Math.min(g.length, p0 + SLICE);
        for (let p = p0; p < p1; p++) {
          const k = p * 4;
          if (px[k + 3]) g[p] = Math.round(px[k] * .2126 + px[k + 1] * .7152 + px[k + 2] * .0722);
        }
      }
    }
    const dst = out.data;
    for (let p0 = 0; p0 < g.length; p0 += SLICE) {
      yield;
      const p1 = Math.min(g.length, p0 + SLICE);
      for (let p = p0; p < p1; p++) {
        const k = p * 4, alpha = px[k + 3];
        if (!alpha) { dst[k + 3] = 0; continue; }
        const v = g[p];
        dst[k] = Math.round(v + (px[k] - v) * amount);
        dst[k + 1] = Math.round(v + (px[k + 1] - v) * amount);
        dst[k + 2] = Math.round(v + (px[k + 2] - v) * amount);
        dst[k + 3] = alpha;
      }
    }
    // O desenho assou esta mesma imagem enquanto as fatias esperavam: vale o dele.
    if (image === source && bakes !== startBakes) return;
    ctx.putImageData(out, 0, 0);
    source = image; canvas = cv; context = ctx; applied = amount; bakes++; failed = null;
    if (lean) original = output = gray = null;
    else { original = px; output = out; gray = g; }
  }
  function setLean(on) {
    lean = !!on;
    if (lean) original = output = gray = null;   // gerador em curso guarda as próprias referências
  }

  function restore(image, saturation = 0) {
    // Caminho do desenho por frame: pronto = nenhuma alocação nem pixel tocado.
    if (image === failed) return null;
    if (!ready(image, level(saturation))) drainSteps(steps(image, saturation));
    return image === source ? canvas : null;
  }
  restore.steps = steps;
  restore.lean = setLean;
  restore.info = () => ({ bakes, width: canvas?.width || 0, height: canvas?.height || 0, saturation: applied });
  return restore;
}
