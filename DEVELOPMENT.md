# Development Guide

## Project Structure

```
Continium-Desktop/
├── src/
│   ├── main.py              # Application entry point
│   ├── core/                # Core application components
│   │   ├── window.py        # Main window with WebEngine
│   │   ├── tray.py          # System tray integration
│   │   └── overlay.py       # Desktop overlay manager
│   └── utils/               # Utility modules
│       └── bridge.py        # Python-JavaScript bridge
├── frontend/                # Web UI (copied from web version)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── resources/               # App icons and resources
├── tests/                   # Unit tests
├── .github/workflows/       # CI/CD pipelines
│   ├── build.yml           # Build installers
│   └── test.yml            # Run tests
├── requirements.txt         # Python dependencies
├── build.py                # Build script
└── setup.py                # Setup script
```

## Setup

1. **Install Python 3.10+**
   ```bash
   python --version  # Should be 3.10 or higher
   ```

2. **Run setup script**
   ```bash
   python setup.py
   ```

   Or manually:
   ```bash
   pip install -r requirements.txt
   ```

3. **Add app icons** (optional but recommended)
   - Create icons in `resources/` folder
   - See `resources/README.md` for instructions

## Development

### Running the app
```bash
python src/main.py
```

### Features implemented
- ✅ PyQt6 WebEngine for rendering the web UI
- ✅ System tray integration with context menu
- ✅ Desktop overlay (always-on-top transparent window)
- ✅ Minimize to tray behavior
- ✅ Python-JavaScript bridge for communication
- ✅ High DPI support

### Desktop-specific features

#### System Tray
- Click tray icon to show/hide window
- Right-click for context menu:
  - Show Window
  - Toggle Overlay
  - Quit

#### Overlay
- Always-on-top transparent window
- Customizable content
- Toggle via tray menu

#### Python-JavaScript Bridge
Use the bridge in `src/utils/bridge.py` to:
- Send data from Python to JavaScript
- Receive messages from JavaScript
- Handle API calls from the frontend

Example in JavaScript:
```javascript
// If bridge is injected
window.pybridge.send_to_python("Hello from JS");
```

## Building

### Build for current platform
```bash
python build.py
```

### Build for specific platform
```bash
# Windows
python build.py --platform windows

# macOS
python build.py --platform macos
```

### Clean build artifacts
```bash
python build.py --clean
```

## CI/CD

GitHub Actions automatically builds installers when you:
1. Push to `main` or `develop` branches
2. Create a pull request
3. Create a version tag (e.g., `v1.0.0`)

### Triggering a release

1. Tag your commit:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. GitHub Actions will:
   - Build Windows `.exe` installer
   - Build macOS `.dmg` installer
   - Create a GitHub Release with installers attached

### Artifacts

After each build, installers are available in:
- GitHub Actions > Workflow run > Artifacts
- GitHub Releases (for tagged versions)

## Testing

```bash
# Install test dependencies
pip install pytest pytest-qt

# Run tests
pytest tests/ -v
```

## Customization

### Changing the window behavior
Edit `src/core/window.py`:
- Window size: `setGeometry(x, y, width, height)`
- Window title: `setWindowTitle("Your Title")`
- WebEngine settings: Modify `_setup_webview()`

### Customizing the overlay
Edit `src/core/overlay.py`:
- Position and size: `setGeometry()` in `OverlayWindow`
- Styling: Modify the QSS styles
- Content: Update `update_content()` method

### Adding Python-JavaScript communication
1. Add methods to `src/utils/bridge.py`
2. Inject the bridge into the web view
3. Call methods from JavaScript

### Modifying the tray menu
Edit `src/core/tray.py`:
- Add new menu items in `_create_menu()`
- Connect to signals or slots

## Troubleshooting

### Windows: Missing DLLs
Install Visual C++ Redistributable:
https://aka.ms/vs/17/release/vc_redist.x64.exe

### macOS: App not opening
Remove quarantine attribute:
```bash
xattr -cr Continium.app
```

### Frontend not loading
Ensure `frontend/` folder is present and contains `index.html`

### Icons not showing
- Check `resources/` folder has icon files
- Rebuild with updated icons

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

[Add your license here]
