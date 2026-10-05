// FontFace mock for headless integration tests that exercise the real boot.
// Browser tests load the checked-in TTF through the actual FontFace API.
export function installFontFaceMock() {
  const doc = globalThis.document;
  if (doc) {
    const fonts = doc.fonts || {};
    if (typeof fonts.add !== "function") fonts.add = () => {};
    if (typeof fonts.delete !== "function") fonts.delete = () => true;
    doc.fonts = fonts;
  }
  const requested = [];
  globalThis.FontFace = class {
    constructor(family, source, descriptors = {}) {
      this.family = family;
      this.source = source;
      this.descriptors = descriptors;
      this.status = "unloaded";
      requested.push(source);
    }
    load() {
      this.status = "loaded";
      return Promise.resolve(this);
    }
  };
  return requested;
}
