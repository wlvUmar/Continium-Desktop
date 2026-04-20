/**
 * Desktop bridge service for PyQt6 WebChannel.
 */

function bridgeReady() {
  return typeof window.qt !== "undefined" && window.qt.webChannelTransport && typeof QWebChannel !== "undefined";
}

function getCurrentThemeMode() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") {
    return saved;
  }
  const isDark = document.documentElement.classList.contains("dark-mode") || document.body.classList.contains("dark-mode");
  return isDark ? "dark" : "light";
}

window.emitUiTheme = function emitUiTheme(mode) {
  if (!window.bridge || typeof window.bridge.emit !== "function") return;
  const normalized = mode === "dark" ? "dark" : "light";
  window.bridge.emit("ui:theme", { mode: normalized });
};

function setBridge(channel) {
  window.bridge = channel.objects.bridge;
  window.dispatchEvent(new CustomEvent("bridge:ready", { detail: { connected: true } }));
  if (window.bridge && typeof window.bridge.emit === "function") {
    window.bridge.emit("app:ready", { timestamp: new Date().toISOString() });
    window.emitUiTheme(getCurrentThemeMode());
  }
}

function initBridge() {
  if (!bridgeReady()) {
    window.bridge = null;
    window.dispatchEvent(new CustomEvent("bridge:ready", { detail: { connected: false } }));
    return;
  }

  new QWebChannel(qt.webChannelTransport, (channel) => {
    setBridge(channel);
  });
}

window.addEventListener("app:ack", (event) => {
  console.info("Desktop bridge connected:", event.detail);
});

initBridge();
