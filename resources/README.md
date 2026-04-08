# Icon Placeholders

The `icon.png`, `icon.ico`, and `icon.icns` files should be created from your app's logo.

## How to create icons:

### For Windows (.ico):
1. Create a 256x256 PNG icon
2. Convert to ICO format using an online tool or:
   ```bash
   # Using ImageMagick
   convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
   ```

### For macOS (.icns):
1. Create icon.iconset directory with different sizes:
   - icon_16x16.png
   - icon_32x32.png
   - icon_128x128.png
   - icon_256x256.png
   - icon_512x512.png
2. Convert to ICNS:
   ```bash
   iconutil -c icns icon.iconset
   ```

### Quick solution:
Use an online converter like CloudConvert or IconConverter to create all formats from a single PNG.
