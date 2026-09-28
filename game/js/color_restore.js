// Restaura gradualmente a saturação original de uma imagem, sem Canvas.filter.
// O canvas e os buffers são reutilizados; pixels só são processados quando a
// imagem ou o progresso mudam (nunca por frame). Compatível com canvas mobile.
export function createColorRestorer() {
  let source = null, canvas = null, context = null;
  let original = null, output = null, gray = null, applied = -1, bakes = 0;

  function prepare(image) {
    source = image; canvas = context = original = output = gray = null; applied = -1;
    if (typeof document === "undefined" || !image?.width || !image?.height) return;
    const cv = document.createElement("canvas");
    cv.width = image.width; cv.height = image.height;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, cv.width, cv.height);
    if (!data || data.data.length !== cv.width * cv.height * 4 ||
        typeof ctx.createImageData !== "function" || typeof ctx.putImageData !== "function") return;
    original = data.data;
    output = ctx.createImageData(cv.width, cv.height);
    gray = new Uint8Array(cv.width * cv.height);
    for (let p = 0; p < gray.length; p++) {
      const k = p * 4;
      if (original[k + 3]) gray[p] = Math.round(original[k] * .2126 + original[k + 1] * .7152 + original[k + 2] * .0722);
    }
    canvas = cv; context = ctx;
  }

  function restore(image, saturation = 0) {
    if (image !== source) prepare(image);
    if (!canvas) return null;
    const amount = Math.max(0, Math.min(1, Number.isFinite(saturation) ? saturation : 0));
    if (Math.abs(amount - applied) < .0001) return canvas;
    const dst = output.data;
    for (let p = 0; p < gray.length; p++) {
      const k = p * 4, alpha = original[k + 3];
      if (!alpha) { dst[k + 3] = 0; continue; }
      const g = gray[p];
      dst[k] = Math.round(g + (original[k] - g) * amount);
      dst[k + 1] = Math.round(g + (original[k + 1] - g) * amount);
      dst[k + 2] = Math.round(g + (original[k + 2] - g) * amount);
      dst[k + 3] = alpha;
    }
    context.putImageData(output, 0, 0);
    applied = amount; bakes++;
    return canvas;
  }
  restore.info = () => ({ bakes, width: canvas?.width || 0, height: canvas?.height || 0, saturation: applied });
  return restore;
}
