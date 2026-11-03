// ============================================================================
// FUMIGA-GOAT — câmera com zoom e shake
//
// F0b (2026-10-26): o zoom do mundo é INTEIRO (1x, 2x, 3x no buffer de
// 320x180). Zoom fracionário fazia o pixel tremer: o sprite caía em meio pixel
// de arte e o vizinho-mais-próximo sortearia outra linha a cada quadro. A
// posição continua contínua por baixo — a suavidade vem da composição do
// buffer, que devolve o resto fracionário como deslocamento inteiro de tela.
// ============================================================================
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H } from "./config.js";
import { clamp, rand, TAU } from "./utils.js";
import { G } from "./state.js";
import { ZOOM_LEVELS, ZOOM_DEFAULT, nearestZoom, stepZoom } from "./pixel_celeste.js";

export const cam = {
  x: WORLD_W / 2, y: WORLD_H / 2,
  zoom: ZOOM_DEFAULT, minZoom: ZOOM_LEVELS[0], maxZoom: ZOOM_LEVELS[ZOOM_LEVELS.length - 1],
  trauma: 0, offsetX: 0, offsetY: 0,
};

export function camReset() {
  cam.x = WORLD_W / 2; cam.y = WORLD_H / 2;
  cam.zoom = ZOOM_DEFAULT; cam.trauma = 0; cam.offsetX = cam.offsetY = 0;
}

/** Prende um zoom contínuo (roda do mouse, pinça) na escada permitida. */
export function quantizeZoom(z) {
  return clamp(nearestZoom(z), cam.minZoom, cam.maxZoom);
}

export function shake(amount) { cam.trauma = Math.min(1.2, cam.trauma + amount); }

export function updateCam(dt, moveX, moveY) {
  const spd = 620 / cam.zoom;
  cam.x += moveX * spd * dt;
  cam.y += moveY * spd * dt;
  clampCam();
  if (cam.trauma > 0.001) {
    cam.trauma = Math.max(0, cam.trauma - dt * 1.6);
    // OPÇÕES → VÍDEO → TREMOR DE TELA: desligado = trauma decai mas a
    // câmera não balança (antes a opção existia e não fazia nada).
    if (G.save && G.save.settings && G.save.settings.screenshake === false) {
      cam.offsetX = cam.offsetY = 0;
      return;
    }
    const m = cam.trauma * cam.trauma * 9;
    cam.offsetX = rand(-m, m);
    cam.offsetY = rand(-m, m);
  } else { cam.offsetX = cam.offsetY = 0; }
}

export function zoomCam(dir, mx, my) {
  const before = screenToWorld(mx, my);
  // F0b: um degrau inteiro por giro da roda, ancorado no cursor como antes.
  cam.zoom = stepZoom(cam.zoom, dir);
  const after = screenToWorld(mx, my);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  clampCam();
}

/** Pan manual (arrastar com o mouse). */
export function panCam(dx, dy) {
  cam.x += dx;
  cam.y += dy;
  clampCam();
}

function clampCam() {
  const vw = VIEW_W / 2 / cam.zoom, vh = VIEW_H / 2 / cam.zoom;
  cam.x = clamp(cam.x, vw - 160, WORLD_W - vw + 160);
  cam.y = clamp(cam.y, vh - 160, WORLD_H - vh + 160);
}

export function screenToWorld(sx, sy) {
  return {
    x: cam.x + (sx - VIEW_W / 2) / cam.zoom,
    y: cam.y + (sy - VIEW_H / 2) / cam.zoom,
  };
}

export function worldToScreen(wx, wy) {
  return {
    x: (wx - cam.x) * cam.zoom + VIEW_W / 2 + cam.offsetX,
    y: (wy - cam.y) * cam.zoom + VIEW_H / 2 + cam.offsetY,
  };
}

export function visibleWorldRect(margin = 64) {
  const vw = VIEW_W / cam.zoom, vh = VIEW_H / cam.zoom;
  return {
    x0: cam.x - vw / 2 - margin, y0: cam.y - vh / 2 - margin,
    x1: cam.x + vw / 2 + margin, y1: cam.y + vh / 2 + margin,
  };
}
