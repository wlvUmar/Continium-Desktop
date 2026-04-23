/**
 * Desktop/web runtime configuration.
 */

function readQueryParam(name) {
  try {
    return new URL(window.location.href).searchParams.get(name);
  } catch (_err) {
    return null;
  }
}

const apiBaseUrl = readQueryParam("api_base_url") || window.__CONTINIUM_CONFIG__?.apiBaseUrl || "";
const wallpaperB64 = readQueryParam("wallpaper_b64");
const wallpaperNonce = readQueryParam("wallpaper_nonce");

window.continiumConfig = {
  apiBaseUrl,
  wallpaperB64,
  wallpaperNonce,
};

export default window.continiumConfig;
