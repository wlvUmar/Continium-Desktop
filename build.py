"""
Production build script for Continium Desktop
- PyInstaller onedir builds (installer-friendly)
- Clean resource handling
- Cross-platform support
"""

from __future__ import annotations

import sys
import os
import shutil
import platform
import subprocess
from pathlib import Path


APP_NAME = "Continium"


class Builder:
    def __init__(self):
        self.root = Path(__file__).resolve().parent
        self.src = self.root / "src"
        self.dist = self.root / "dist"
        self.build_dir = self.root / "build"

    # ---------------------------
    # CLEAN
    # ---------------------------
    def clean(self):
        print("Cleaning build artifacts...")

        for path in [self.dist, self.build_dir]:
            if path.exists():
                shutil.rmtree(path)

    # ---------------------------
    # HELPERS
    # ---------------------------
    def pyinstaller(self):
        return [sys.executable, "-m", "PyInstaller"]

    def data(self, src: Path, dest: str) -> str:
        return f"{src.resolve()}{os.pathsep}{dest}"

    def icon(self) -> list[str]:
        ico = self.root / "resources" / "icon.ico"
        if ico.exists():
            return [f"--icon={ico.resolve()}"]
        return []

    # ---------------------------
    # WINDOWS BUILD
    # ---------------------------
    def build_windows(self):
        print("Building Windows (onedir)...")

        cmd = [
            *self.pyinstaller(),

            # core settings
            "--name=Continium",
            "--windowed",
            "--onedir",

            # icon
            *self.icon(),

            # main entry
            str(self.src / "main.py"),

            # interface (frontend)
            f"--add-data={self.data(self.src / 'interface', 'interface')}",

            # resources
            f"--add-data={self.data(self.root / 'resources', 'resources')}",

            # backend modules
            f"--add-data={self.data(self.src / 'core', 'core')}",
            f"--add-data={self.data(self.src / 'dal', 'dal')}",
            f"--add-data={self.data(self.src / 'services', 'services')}",
            f"--add-data={self.data(self.src / 'utils', 'utils')}",
            f"--add-data={self.data(self.src / 'models', 'models')}",

            # import hints
            "--hidden-import=core",
            "--hidden-import=dal",
            "--hidden-import=services",
            "--hidden-import=utils",
            "--hidden-import=models",

            # correct import root
            f"--paths={self.src}",
        ]

        subprocess.run(cmd, check=True, cwd=self.root)

    # ---------------------------
    # MACOS BUILD
    # ---------------------------
    def build_macos(self):
        print("Building macOS (onedir)...")

        cmd = [
            *self.pyinstaller(),
            "--name=Continium",
            "--windowed",
            "--onedir",
            *self.icon(),
            str(self.src / "main.py"),

            f"--add-data={self.data(self.src / 'interface', 'interface')}",
            f"--add-data={self.data(self.root / 'resources', 'resources')}",
            f"--add-data={self.data(self.src / 'core', 'core')}",
            f"--add-data={self.data(self.src / 'dal', 'dal')}",
            f"--add-data={self.data(self.src / 'services', 'services')}",
            f"--add-data={self.data(self.src / 'utils', 'utils')}",
            f"--add-data={self.data(self.src / 'models', 'models')}",

            "--hidden-import=core",
            "--hidden-import=dal",
            "--hidden-import=services",
            "--hidden-import=utils",
            "--hidden-import=models",

            f"--paths={self.src}",
        ]

        subprocess.run(cmd, check=True, cwd=self.root)

    # ---------------------------
    # RUN
    # ---------------------------
    def build(self, target=None):
        target = target or platform.system().lower()

        self.clean()

        if target == "windows":
            self.build_windows()
        elif target in ("darwin", "macos"):
            self.build_macos()
        else:
            raise ValueError(f"Unsupported platform: {target}")

        print("\nBuild complete → check dist/")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--platform", choices=["windows", "macos"])
    parser.add_argument("--clean", action="store_true")

    args = parser.parse_args()

    b = Builder()

    if args.clean:
        b.clean()
    else:
        b.build(args.platform)