/**
 * Desktop bridge service for PyQt6 WebChannel.
 */

function bridgeReady() {
  return typeof window.qt !== "undefined" && window.qt.webChannelTransport && typeof QWebChannel !== "undefined";
}

function setBridge(channel) {
  window.bridge = channel.objects.bridge;
  window.dispatchEvent(new CustomEvent("bridge:ready", { detail: { connected: true } }));
  if (window.bridge && typeof window.bridge.emit === "function") {
    window.bridge.emit("app:ready", { timestamp: new Date().toISOString() });
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
