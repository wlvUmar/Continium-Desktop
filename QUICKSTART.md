# Continium Desktop - Quick Start

## 🚀 Quick Start

```bash
# 1. Setup
python setup.py

# 2. Run
python src/main.py

# 3. Build (optional)
python build.py
```

## 📋 Features

- 🖥️ **Native Desktop App** - PyQt6-based desktop application
- 🌐 **Web UI** - Same beautiful interface from the web version
- 📍 **System Tray** - Minimize to tray, quick access menu
- 🎯 **Desktop Overlay** - Always-on-top transparent overlay
- 📦 **Auto Installers** - CI/CD builds Windows & macOS installers
- 🔄 **Cross-Platform** - Windows and macOS support

## 🛠️ Tech Stack

- **Python 3.10+**
- **PyQt6** - Desktop framework
- **PyQt6-WebEngine** - Web rendering (Chromium)
- **PyInstaller** - Executable packaging
- **GitHub Actions** - CI/CD

## 📁 What's Different from Web Version?

| Feature | Web | Desktop |
|---------|-----|---------|
| Platform | Browser | Windows/macOS |
| System Tray | ❌ | ✅ |
| Overlay | ❌ | ✅ |
| Offline | ❌ | ✅ |
| Installers | ❌ | ✅ Auto-built |
| UI | ✅ | ✅ Same UI |

## 🎯 Desktop-Only Features

### System Tray
- **Click** tray icon → Show/hide window
- **Right-click** → Context menu
  - Show Window
  - Toggle Overlay
  - Quit

### Desktop Overlay
- Transparent window that stays on top
- Perfect for quick glances while working
- Customizable content and position

## 📦 Building Installers

### Automatic (CI/CD)
1. Push code or create tag: `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Actions builds installers automatically
3. Download from Releases or Artifacts

### Manual
```bash
# Build for current platform
python build.py

# Platform-specific
python build.py --platform windows  # Creates .exe
python build.py --platform macos    # Creates .dmg
```

## 🔧 Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development guide.

## 📝 Requirements

- Python 3.10 or higher
- Windows 10+ or macOS 10.15+
- 100MB disk space
- Internet connection (for initial setup)

## 🤝 From Web to Desktop

This desktop version:
- ✅ Uses the exact same frontend code
- ✅ Maintains all UI features
- ✅ Adds desktop-native capabilities
- ✅ No backend changes needed (uses same API)

## 📄 License

[Add your license]

---

**Original Web Version**: [Link to original Continium repo]
