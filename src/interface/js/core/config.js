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

window.continiumConfig = {
  apiBaseUrl,
};

export default window.continiumConfig;
