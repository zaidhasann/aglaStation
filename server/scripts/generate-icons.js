// Generate placeholder PWA icons using Node Canvas-free SVG-to-PNG approach
const fs = require('fs');
const path = require('path');

function createSvgIcon(size, maskable = false) {
  const padding = maskable ? Math.round(size * 0.1) : 0;
  const innerSize = size - padding * 2;
  const bgColor = '#facc15';
  const textColor = '#020617';
  const fontSize = Math.round(innerSize * 0.55);
  const cornerRadius = maskable ? 0 : Math.round(size * 0.18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${maskable ? bgColor : '#020617'}" rx="0"/>
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" fill="${bgColor}" rx="${cornerRadius}"/>
  <text x="${size / 2}" y="${size / 2}" dominant-baseline="central" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="${fontSize}" fill="${textColor}">N</text>
</svg>`;
}

const iconsDir = path.join(__dirname, '..', '..', 'client', 'public', 'icons');

const icons = [
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-512x512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

// Write SVGs as fallback (since we can't do canvas PNG without extra deps)
icons.forEach(({ name, size, maskable }) => {
  const svgName = name.replace('.png', '.svg');
  const svg = createSvgIcon(size, maskable);
  fs.writeFileSync(path.join(iconsDir, svgName), svg);
  console.log(`✅ Generated ${svgName} (${size}x${size}${maskable ? ' maskable' : ''})`);
});

// Also write a favicon.svg
const faviconSvg = createSvgIcon(32, false);
fs.writeFileSync(path.join(iconsDir, '..', 'favicon.svg'), faviconSvg);
console.log('✅ Generated favicon.svg');

console.log('\nNote: SVG icons generated. For production PNG icons, convert with a tool like Inkscape or https://cloudconvert.com');
