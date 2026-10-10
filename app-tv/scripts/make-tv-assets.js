// Generates the TV launcher / store images from the DailyDrop wordmark (src/shared/logoPath.ts):
// Android TV banner 320×180 + launcher icon, Apple TV app icons and Top Shelf placeholders, app icon, favicon.
// Renders with Playwright's Chromium:  NODE_PATH=$(npm root -g) node scripts/make-tv-assets.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const src = fs.readFileSync(path.join(__dirname, '../src/shared/logoPath.ts'), 'utf8');
const LOGO_PATH = src.match(/LOGO_PATH =\s*'([^']+)'/)[1];
const DOT = JSON.parse(src.match(/LOGO_DOT = (\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":'));
const OUT = path.join(__dirname, '../assets/tv');
const BG = '#14130f', INK = '#f3eee3', RED = '#e2765f', PAPER = '#ece4d8';

// [file, width, height, logo width as a fraction of the image width, tagline?]
const JOBS = [
  ['android-banner-320x180.png', 320, 180, 0.78, false],
  ['android-icon-512.png', 512, 512, 0.8, false],
  ['icon-1280x768.png', 1280, 768, 0.72, false],
  ['icon-800x480.png', 800, 480, 0.72, false],
  ['icon-400x240.png', 400, 240, 0.72, false],
  ['topshelf-1920x720.png', 1920, 720, 0.42, true],
  ['topshelf-3840x1440.png', 3840, 1440, 0.42, true],
  ['topshelf-wide-2320x720.png', 2320, 720, 0.36, true],
  ['topshelf-wide-4640x1440.png', 4640, 1440, 0.36, true],
  ['../icon.png', 1024, 1024, 0.8, false],
  ['../favicon.png', 48, 48, 0.94, false],
];

function html(w, h, frac, tagline) {
  const lw = Math.round(w * frac), lh = Math.round((lw * 243) / 894);
  const rule = Math.max(2, Math.round(h / 180));
  return `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;background:${BG};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,serif">
  <svg width="${lw}" height="${lh}" viewBox="0 0 894 243"><path d="${LOGO_PATH}" fill="${INK}"/><circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="${RED}"/></svg>
  ${tagline ? `<div style="margin-top:${Math.round(h * 0.05)}px;border-top:${rule}px solid ${PAPER}55;border-bottom:${rule}px solid ${PAPER}55;padding:${Math.round(h * 0.012)}px ${Math.round(w * 0.02)}px;color:${PAPER};font-size:${Math.round(h * 0.045)}px;letter-spacing:${Math.round(h * 0.006)}px">THE MORNING FRONT PAGE · 06:00</div>` : ''}
  </body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  for (const [file, w, h, frac, tag] of JOBS) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(html(w, h, frac, tag));
    await page.screenshot({ path: path.join(OUT, file), omitBackground: false });
    await page.close();
    console.log('wrote', file, w + 'x' + h);
  }
  await browser.close();
})();
