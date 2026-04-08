# 📦 Building EXE File - Quick Guide

## 🚀 Fastest Way (3 Commands)

```bash
cd C:\Users\User\Desktop\Continium-Desktop

# 1. Install dependencies (one-time only)
pip install -r requirements.txt

# 2. Build EXE
python build.py --platform windows

# 3. Find your EXE
# Location: dist/Continium.exe
```

**That's it!** Your EXE will be in the `dist/` folder.

---

## 📋 Detailed Steps

### Step 1: Install Dependencies

```bash
# Option A: Using setup script
python setup.py

# Option B: Manual install
pip install -r requirements.txt
pip install pyinstaller
```

### Step 2: Build the EXE

Choose one method:

#### **Method A: Using Build Script (Recommended)**
```bash
python build.py --platform windows
```

#### **Method B: Using PyInstaller Directly**
```bash
pyinstaller --name=Continium ^
    --windowed ^
    --onefile ^
    --icon=resources/icon.ico ^
    --add-data "frontend;frontend" ^
    --add-data "resources;resources" ^
    src/main.py
```

#### **Method C: Using Spec File (Most Control)**
```bash
# Build using custom spec file
pyinstaller Continium.spec
```

### Step 3: Test the EXE

```bash
# Run the generated EXE
dist\Continium.exe
```

---

## 📁 Output Location

After building, you'll find:
```
dist/
├── Continium.exe    ← Your standalone executable! 
```

You can distribute this single .exe file to users!

---

## 🎛️ Build Options Explained

| Option | What it does |
|--------|--------------|
| `--windowed` | No console window (GUI only) |
| `--onefile` | Single EXE file (not a folder) |
| `--icon` | Sets the app icon |
| `--add-data` | Includes frontend/resources |
| `--name` | Output filename |

---

## 🐛 Troubleshooting

### ❌ "command not found: pyinstaller"
**Fix:** 
```bash
pip install pyinstaller
```

### ❌ "No module named PyQt6"
**Fix:**
```bash
pip install PyQt6 PyQt6-WebEngine
```

### ❌ "icon.ico not found"
**Fix:** Create a placeholder icon or remove the `--icon` parameter:
```bash
pyinstaller --name=Continium --windowed --onefile --add-data "frontend;frontend" --add-data "resources;resources" src/main.py
```

### ❌ Frontend not loading in EXE
**Fix:** Make sure you have `--add-data "frontend;frontend"` in your build command

### ❌ EXE is too large
**Solutions:**
- Remove `--onefile` to create a folder distribution (smaller)
- Use UPX compression (built into PyInstaller)
- Exclude unused modules

---

## 📦 Distribution Options

### Option 1: Single EXE (Current)
- **Pros:** Easy to distribute, one file
- **Cons:** Larger file size (~150-200 MB)
- **Use:** `--onefile` flag

### Option 2: Folder Distribution
- **Pros:** Smaller, faster startup
- **Cons:** Multiple files to distribute
- **Use:** Remove `--onefile` flag

### Option 3: Installer (Best for Users)
Create an installer using NSIS:
```bash
# Install NSIS first: https://nsis.sourceforge.io/
makensis installer/windows/installer.nsi
```

---

## 🎯 Build Variations

### Debug Build (with console)
```bash
pyinstaller --name=Continium-Debug --onefile --add-data "frontend;frontend" --add-data "resources;resources" src/main.py
```

### Optimized Build (smaller size)
```bash
pyinstaller --name=Continium --windowed --onefile --strip --upx-dir=/path/to/upx --add-data "frontend;frontend" --add-data "resources;resources" src/main.py
```

### Development Build (faster)
```bash
# Without --onefile for faster rebuilds
pyinstaller --name=Continium --windowed --add-data "frontend;frontend" --add-data "resources;resources" src/main.py
```

---

## ⚡ Quick Reference

| Command | Result |
|---------|--------|
| `python build.py` | Build for current OS |
| `python build.py --platform windows` | Build Windows EXE |
| `python build.py --clean` | Clean build files |
| `pyinstaller Continium.spec` | Build from spec file |

---

## 📊 Expected Results

- **Build time:** 2-5 minutes
- **EXE size:** 150-200 MB (includes Python + PyQt6)
- **Startup time:** 2-3 seconds
- **Location:** `dist/Continium.exe`

---

## ✅ Testing Checklist

After building:
- [ ] Run `dist\Continium.exe`
- [ ] Check if window opens
- [ ] Test system tray icon
- [ ] Test overlay toggle
- [ ] Verify frontend loads correctly
- [ ] Test all features

---

## 🚀 Next Steps

1. Build the EXE: `python build.py --platform windows`
2. Test it: `dist\Continium.exe`
3. Share it with others!

Optional:
- Create an installer using NSIS
- Sign the EXE for Windows SmartScreen
- Upload to GitHub Releases

---

**Need help?** Check the error messages or open an issue on GitHub.
