"""
Build script for creating desktop installers
"""
import os
import sys
import shutil
import platform
import subprocess
from pathlib import Path


class Builder:
    def __init__(self):
        self.root_dir = Path(__file__).resolve().parent
        self.dist_dir = self.root_dir / "dist"
        self.build_dir = self.root_dir / "build"

    def clean(self):
        """Clean build artifacts"""
        print("Cleaning build artifacts...")
        for dir_path in [self.dist_dir, self.build_dir]:
            if dir_path.exists():
                shutil.rmtree(dir_path)

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

    def build_windows(self):
        """Build Windows installer"""
        print("Building Windows installer...")

        cmd = [
            *self._pyinstaller_cmd(),
            "--name=Continium",
            "--windowed",
            "--onedir",
            "--paths=src",

            "--collect-all=PyQt6",  # 🔥 ADD THIS

            *self._icon_arg(self.root_dir / "resources" / "icon.ico"),

            f"--add-data={self._data_arg(self.root_dir / 'src' / 'interface', 'interface')}",
            f"--add-data={self._data_arg(self.root_dir / 'resources', 'resources')}",

            str(self.root_dir / "src" / "main.py"),
        ]

        subprocess.run(cmd, check=True, cwd=self.root_dir)

    def build_macos(self):
        """Build macOS installer"""
        print("Building macOS installer...")

        cmd = [
            *self._pyinstaller_cmd(),
            "--name=Continium",
            "--windowed",
            "--onedir",
            *self._icon_arg(self.root_dir / "resources" / "icon.icns"),
            f"--add-data={self._data_arg(self.root_dir / 'src' / 'interface', 'interface')}",
            f"--add-data={self._data_arg(self.root_dir / 'resources', 'resources')}",
            str(self.root_dir / "src" / "main.py"),
        ]

        subprocess.run(cmd, check=True, cwd=self.root_dir)

        # Create DMG
        self._create_dmg()

    def _create_dmg(self):
        """Create DMG installer for macOS"""
        app_path = self.dist_dir / "Continium.app"
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
            subprocess.run(cmd, check=True, cwd=self.root_dir)
            print(f"DMG created: {dmg_path}")
        except subprocess.CalledProcessError:
            print("DMG creation failed")
    
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
