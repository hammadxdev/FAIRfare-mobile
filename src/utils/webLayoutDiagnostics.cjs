function measureElement(label, selector) {
  const element = typeof document !== "undefined" ? document.querySelector(selector) : null;
  if (!element) return { label, selector, found: false };
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return {
    label,
    selector,
    found: true,
    clientHeight: element.clientHeight,
    offsetHeight: element.offsetHeight,
    rectHeight: Math.round(rect.height),
    computedHeight: style.height,
    position: style.position,
    overflow: style.overflow,
    flex: style.flex,
    minHeight: style.minHeight,
    maxHeight: style.maxHeight,
    pointerEvents: style.pointerEvents,
  };
}

function describeElement(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return {
    tag: element.tagName,
    id: element.id || null,
    className: typeof element.className === "string" ? element.className.slice(0, 120) : null,
    rectTop: Math.round(rect.top),
    rectBottom: Math.round(rect.bottom),
    rectHeight: Math.round(rect.height),
    backgroundColor: style.backgroundColor,
    position: style.position,
    zIndex: style.zIndex,
    pointerEvents: style.pointerEvents,
  };
}

function collectWebLayoutDiagnostics() {
  if (typeof document === "undefined" || typeof window === "undefined") return [];
  const home = document.querySelector("#home-screen-canvas")?.getBoundingClientRect();
  const map = document.querySelector("#home-map-wrapper")?.getBoundingClientRect();
  const sheet = document.querySelector("#home-booking-sheet")?.getBoundingClientRect();
  const gapTop = map?.bottom ?? null;
  const gapBottom = sheet?.top ?? null;
  const gapY = Number.isFinite(gapTop) && Number.isFinite(gapBottom) && gapBottom > gapTop
    ? (gapTop + gapBottom) / 2
    : (home?.top ?? window.innerHeight / 2);
  const coveringElement = document.elementFromPoint(window.innerWidth / 2, gapY);
  return [
    { label: "viewport", width: window.innerWidth, height: window.innerHeight, visualViewportHeight: window.visualViewport?.height ?? null },
    measureElement("html", "html"),
    measureElement("body", "body"),
    measureElement("expo-root", "#root"),
    measureElement("home-screen", "#home-screen-canvas"),
    measureElement("map-wrapper", "#home-map-wrapper"),
    measureElement("map-surface", "#home-map-surface"),
    measureElement("booking-sheet", "#home-booking-sheet"),
    { label: "blank-region-sample", x: Math.round(window.innerWidth / 2), y: Math.round(gapY), coveringElement: describeElement(coveringElement) },
  ];
}

module.exports = { collectWebLayoutDiagnostics, measureElement, describeElement };
