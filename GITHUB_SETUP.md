# GitHub Repository Setup Guide

## Quick Setup (Recommended)

### Option 1: Using GitHub CLI (gh)
```bash
cd C:\Users\User\Desktop\Continium-Desktop

# Login to GitHub
gh auth login

# Create repository
gh repo create Continium-Desktop --public --source=. --remote=origin --push

# Done! Your repo is live and CI/CD will start building.
```

### Option 2: Using GitHub Website
1. Go to https://github.com/new
2. Repository name: `Continium-Desktop`
3. Description: `Desktop version of Continium - PyQt6 app with system tray and overlay`
4. Choose Public or Private
5. **DON'T** initialize with README (we already have one)
6. Click "Create repository"

Then run:
```bash
cd C:\Users\User\Desktop\Continium-Desktop
git remote add origin https://github.com/YOUR_USERNAME/Continium-Desktop.git
git branch -M main
git push -u origin main
```

## After First Push

✅ GitHub Actions will automatically:
- Run tests on Windows, macOS, and Linux
- Build installers for Windows and macOS
- Upload artifacts

## Creating Your First Release

```bash
# Tag the current version
git tag -a v1.0.0 -m "First release: Continium Desktop MVP"
git push origin v1.0.0
```

This triggers:
- ✅ Builds Windows installer (.exe)
- ✅ Builds macOS installer (.dmg)
- ✅ Creates GitHub Release with installers attached
- ✅ Users can download and install directly

## Repository Settings (Recommended)

After creating the repo, configure:

1. **About Section**
   - Description: "Desktop productivity app with system tray and overlay"
   - Topics: `desktop-app`, `pyqt6`, `windows`, `macos`, `productivity`

2. **Branch Protection** (optional)
   - Settings → Branches → Add rule
   - Branch name: `main`
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass

3. **GitHub Pages** (optional, for docs)
   - Settings → Pages
   - Source: Deploy from branch
   - Branch: main / docs folder

## Making the Repo Professional

### Add these badges to README.md:

```markdown
# Continium Desktop

[![Build Status](https://github.com/YOUR_USERNAME/Continium-Desktop/workflows/Build%20Desktop%20Installers/badge.svg)](https://github.com/YOUR_USERNAME/Continium-Desktop/actions)
[![Tests](https://github.com/YOUR_USERNAME/Continium-Desktop/workflows/Tests/badge.svg)](https://github.com/YOUR_USERNAME/Continium-Desktop/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
```

### Add a LICENSE file:

Choose a license and create `LICENSE` file:
- MIT License (permissive, recommended for open source)
- GPL (copyleft)
- Apache 2.0 (permissive with patent grant)

Quick add:
```bash
# For MIT license
curl -o LICENSE https://raw.githubusercontent.com/licenses/license-templates/master/templates/mit.txt
# Edit the file to add your name and year
```

## Invite Collaborators

If your team of 7 wants to contribute:

1. Settings → Collaborators → Add people
2. Enter their GitHub usernames
3. They'll receive an invitation

Or create an Organization:
1. Your profile → Organizations → New organization
2. Free plan is fine
3. Transfer the repository to the organization

## Next Steps

1. ✅ Push to GitHub
2. ✅ Watch Actions tab for first build
3. ✅ Download built installers from Artifacts
4. ✅ Test on Windows and macOS
5. ✅ Create first release tag
6. ✅ Share download link with users!

## Monitoring Builds

Check build status:
- Actions tab: https://github.com/YOUR_USERNAME/Continium-Desktop/actions
- Each push triggers builds
- Green ✓ = success
- Red ✗ = check logs

## Troubleshooting CI/CD

If builds fail:

1. **Check Actions logs**
   - Click on failed workflow
   - Expand failed step
   - Read error message

2. **Common issues**
   - Missing dependencies → Update requirements.txt
   - Icon files missing → Add to resources/
   - Path issues → Check file paths in build.yml

3. **Test locally first**
   ```bash
   python build.py
   ```

## Download Your Installers

### From Actions (every commit)
1. Go to Actions tab
2. Click on workflow run
3. Scroll to Artifacts
4. Download zip files

### From Releases (tagged versions)
1. Go to Releases
2. Click on latest release
3. Download .exe (Windows) or .dmg (macOS)

---

**Ready to push?**
```bash
cd C:\Users\User\Desktop\Continium-Desktop
git remote add origin https://github.com/YOUR_USERNAME/Continium-Desktop.git
git branch -M main
git push -u origin main
```

Then watch the magic happen in the Actions tab! 🚀
