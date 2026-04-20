"""Windows wallpaper utility to capture and provide desktop background."""

from __future__ import annotations

import os
import platform


def get_windows_wallpaper_path() -> str | None:
    """
    Get the path to the current Windows desktop wallpaper.
    Returns the wallpaper file path or None if not available.
    """
    if platform.system() != "Windows":
        return None

    candidates: list[str] = []

    # 1) Ask Windows directly for the current desktop wallpaper.
    try:
        from ctypes import create_unicode_buffer, wintypes, windll

        SPI_GETDESKWALLPAPER = 0x0073
        buffer = create_unicode_buffer(wintypes.MAX_PATH)
        ok = bool(windll.user32.SystemParametersInfoW(SPI_GETDESKWALLPAPER, len(buffer), buffer, 0))
        if ok and buffer.value:
            candidates.append(buffer.value)
    except Exception:
        pass

    # 2) TranscodedWallpaper is often the currently displayed asset.
    appdata = os.getenv("APPDATA")
    if appdata:
        candidates.append(os.path.join(appdata, "Microsoft", "Windows", "Themes", "TranscodedWallpaper"))

    # 3) Registry fallback.
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Control Panel\Desktop") as key:
            registry_wallpaper, _ = winreg.QueryValueEx(key, "Wallpaper")
            if registry_wallpaper:
                candidates.append(registry_wallpaper)
    except Exception:
        pass

    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate.replace("\\", "/")

    return None


