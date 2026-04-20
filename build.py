"""
Build script for creating desktop installers
"""
import os
import sys
import shutil
import platform
import subprocess
import stat
import time
from pathlib import Path


class Builder:
    def __init__(self):
        self.root_dir = Path(__file__).resolve().parent
        self.dist_dir = self.root_dir / "dist"
        self.build_dir = self.root_dir / "build"

    @property
    def windows_bundle_dir(self) -> Path:
        return self.dist_dir / "Continium"

    @property
    def macos_bundle_path(self) -> Path:
        return self.dist_dir / "Continium.app"

    def clean(self):
        """Clean build artifacts"""
        print("Cleaning build artifacts...")
        for dir_path in [self.dist_dir, self.build_dir]:
            if dir_path.exists():
                self._rmtree_with_retries(dir_path)

    def _rmtree_with_retries(self, dir_path: Path, retries: int = 6, delay: float = 0.5) -> None:
        """Remove a directory tree with retries for transient Windows file locks."""

        def _onerror(func, path, exc_info):
            # Best effort: clear readonly bits then retry the failed operation once.
            try:
                os.chmod(path, stat.S_IWRITE)
            except OSError:
                pass
            try:
                func(path)
            except OSError:
                pass

        last_err: Exception | None = None
        for attempt in range(1, retries + 1):
            try:
                shutil.rmtree(dir_path, onerror=_onerror)
                return
            except PermissionError as exc:
                last_err = exc
                if attempt < retries:
                    print(f"Retry {attempt}/{retries} removing {dir_path} after file lock: {exc}")
                    time.sleep(delay)
                    continue
            except OSError as exc:
                last_err = exc
                if attempt < retries:
                    print(f"Retry {attempt}/{retries} removing {dir_path}: {exc}")
                    time.sleep(delay)
                    continue

        raise RuntimeError(
            f"Failed to remove '{dir_path}'. A file is likely locked by a running app, Explorer, or AV. "
            "Close Continium.exe and retry."
        ) from last_err

    def _icon_arg(self, icon_path: Path) -> list[str]:
        """Return a PyInstaller icon flag when the icon file exists."""
        if icon_path.exists():
            return [f"--icon={icon_path.resolve()}"]
        print(f"Icon not found, building without it: {icon_path}")
        return []

    def _data_arg(self, source: Path, target: str) -> str:
        """Format a PyInstaller data argument for the current platform."""
        return f"{source.resolve()}{os.pathsep}{target}"

    def _pyinstaller_cmd(self) -> list[str]:
        """Return the PyInstaller invocation for the active interpreter."""
        return [sys.executable, "-m", "PyInstaller"]

    def _common_pyinstaller_args(self) -> list[str]:
        """Return shared PyInstaller options for all desktop targets."""
        return [
            "--noconfirm",
            "--name=Continium",
            "--windowed",
            "--onedir",
            "--paths=src",
            "--collect-all=PyQt6",
            f"--add-data={self._data_arg(self.root_dir / 'src' / 'interface', 'interface')}",
            f"--add-data={self._data_arg(self.root_dir / 'resources', 'resources')}",
        ]

    def _run(self, cmd: list[str]) -> None:
        subprocess.run(cmd, check=True, cwd=self.root_dir)

    def _ensure_exists(self, path: Path, message: str) -> None:
        if not path.exists():
            raise FileNotFoundError(message)

    def build_windows(self):
        """Build Windows installer"""
        print("Building Windows installer...")

        cmd = [
            *self._pyinstaller_cmd(),
            *self._common_pyinstaller_args(),
            *self._icon_arg(self.root_dir / "resources" / "icon.ico"),
            str(self.root_dir / "src" / "main.py"),
        ]

        self._run(cmd)
        self._ensure_exists(
            self.windows_bundle_dir / "Continium.exe",
            f"Windows bundle not found: {self.windows_bundle_dir / 'Continium.exe'}",
        )

    def build_macos(self):
        """Build macOS installer"""
        print("Building macOS installer...")

        cmd = [
            *self._pyinstaller_cmd(),
            *self._common_pyinstaller_args(),
            *self._icon_arg(self.root_dir / "resources" / "icon.icns"),
            str(self.root_dir / "src" / "main.py"),
        ]

        self._run(cmd)
        self._ensure_exists(
            self.macos_bundle_path,
            f"macOS app bundle not found: {self.macos_bundle_path}",
        )

        # Create DMG
        self._create_dmg()

    def _create_dmg(self):
        """Create DMG installer for macOS"""
        app_path = self.macos_bundle_path
        dmg_path = self.dist_dir / "Continium.dmg"

        if not app_path.exists():
            print("App bundle not found, skipping DMG creation")
            return

        cmd = [
            "hdiutil", "create",
            "-volname", "Continium",
            "-srcfolder", str(app_path),
            "-ov", "-format", "UDZO",
            str(dmg_path)
        ]

        try:
            self._run(cmd)
            print(f"DMG created: {dmg_path}")
        except subprocess.CalledProcessError:
            print("DMG creation failed")
            raise

    def build(self, target_platform=None):
        """Build for specified platform"""
        if target_platform is None:
            target_platform = platform.system().lower()

        self.clean()

        if target_platform == "windows":
            self.build_windows()
        elif target_platform == "darwin" or target_platform == "macos":
            self.build_macos()
        else:
            print(f"Unsupported platform: {target_platform}")
            sys.exit(1)

        print(f"\nBuild complete! Check the dist/ folder")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Build Continium Desktop")
    parser.add_argument("--platform", choices=["windows", "macos", "darwin"], 
                       help="Target platform (default: current platform)")
    parser.add_argument("--clean", action="store_true", 
                       help="Only clean build artifacts")
    
    args = parser.parse_args()
    
    builder = Builder()
    
    if args.clean:
        builder.clean()
    else:
        builder.build(args.platform)
