# Continium Desktop

Desktop application version of Continium built with PyQt6.

## Features

- 🖥️ Native desktop experience
- 🎯 System tray integration with custom preview
- 🎨 Desktop overlay support
- 📦 Cross-platform installers (Windows & macOS)

## Requirements

- Python 3.10+
- PyQt6
- PyQt6-WebEngine

## Installation

```bash
pip install -r requirements.txt
```

## Development

```bash
python src/main.py
```

## Building

```bash
# Windows
python build.py --platform windows

# macOS
python build.py --platform macos
```

## CI/CD

GitHub Actions automatically builds installers for:
- Windows: `.exe` installer (NSIS)
- macOS: `.dmg` installer

Installers are available in the Releases section.
