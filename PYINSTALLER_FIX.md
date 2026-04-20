# PyInstaller Module Import Fix

## Problem
When running the compiled `.exe` file, you were getting:
```
ModuleNotFoundError: No module named 'core'
```

## Root Cause
PyInstaller was not properly bundling the local Python packages (`core`, `dal`, `services`, `utils`, `models`) from the `src/` directory. When using `--onefile` mode, all modules need to be explicitly declared and the path needs to be properly configured.

## Solution
Updated both `build.py` and `Continium.spec` to:

### 1. **build.py** Changes:
- Added `--hidden-import` flags for all local packages: `core`, `dal`, `services`, `utils`, `models`
- Added `--paths={src_directory}` to tell PyInstaller where to find the local packages
- Applied to both Windows (`build_windows()`) and macOS (`build_macos()`) build methods

### 2. **Continium.spec** Changes:
- Updated `hiddenimports` list to include: `['core', 'dal', 'services', 'utils', 'models']`
- Updated `pathex` from relative path `['src']` to absolute path to ensure correct module resolution

## How to Rebuild
To rebuild the executable with these fixes:

```powershell
# Clean and rebuild for Windows
python build.py --platform windows

# Or for macOS
python build.py --platform macos
```

## What These Changes Do
1. **Hidden Imports**: Tells PyInstaller to explicitly include these packages even if they're not detected by static analysis
2. **Path Addition**: Adds the `src/` directory to Python's module search path so imports like `from core.overlay import OverlayManager` work correctly
3. **Package Resolution**: Ensures PyInstaller collects all submodules from these packages when bundling

## Testing
After rebuilding, the `.exe` should start without module import errors.

