/**
 * Wallpaper Manager Service
 * Reads wallpaper from config and applies it to the app background.
 */

import config from '../core/config.js';

const wallpaperManager = {
    init() {
        this.applyWallpaper();
    },

    applyWallpaper() {
        const { wallpaperB64 } = config;
        
        if (!wallpaperB64) {
            this._clearWallpaper();
            return;
        }

        try {
            // decode url-safe base64
            const path = atob(wallpaperB64.replace(/-/g, '+').replace(/_/g, '/'));
            if (path) {
                const encodedPath = encodeURI(path.replace(/\\/g, '/'));
                // Use file:/// for local paths in QWebEngine
                const url = `file:///${encodedPath}`;
                
                document.body.style.backgroundImage = `url("${url}")`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
                document.body.classList.add('has-wallpaper');

                this._detectTone(url);
                console.log('WALLPAPER: Applied', url);
            }
        } catch (e) {
            console.error('WALLPAPER: Failed to apply:', e);
        }
    },

    _detectTone(url) {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 64, 64);

                const data = ctx.getImageData(0, 0, 64, 64).data;
                let r = 0, g = 0, b = 0;

                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                }

                const pixels = data.length / 4;
                const avgR = r / pixels / 255;
                const avgG = g / pixels / 255;
                const avgB = b / pixels / 255;

                const luminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
                const toneClass = luminance > 0.52 ? 'wallpaper-light' : 'wallpaper-dark';

                document.body.classList.remove('wallpaper-light', 'wallpaper-dark');
                document.body.classList.add(toneClass);

                console.log(`WALLPAPER: Detected luminance ${luminance.toFixed(3)}, applying ${toneClass}`);
            } catch (e) {
                console.error('WALLPAPER: Tone detection failed:', e);
                this._fallbackTone();
            }
        };
        img.onerror = () => {
            console.error('WALLPAPER: Failed to load image for tone detection');
            this._fallbackTone();
        };
        img.src = url;
    },

    _fallbackTone() {
        document.body.classList.remove('wallpaper-light', 'wallpaper-dark');
        document.body.classList.add('wallpaper-dark');
    },

    _clearWallpaper() {
        document.body.style.backgroundImage = '';
        document.body.classList.remove('has-wallpaper', 'wallpaper-light', 'wallpaper-dark');
    }
};

export default wallpaperManager;
