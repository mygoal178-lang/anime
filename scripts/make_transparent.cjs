const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processImage() {
  const inputPath = path.join(__dirname, '../src/assets/images/zoro_hero_transparent_1786970710955.jpg');
  const outputPath = path.join(__dirname, '../src/assets/images/zoro_hero_cutout.png');

  if (!fs.existsSync(inputPath)) {
    console.error('Input image not found:', inputPath);
    return;
  }

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Image size: ${width}x${height}, channels: ${channels}`);

  // Create a new buffer for RGBA
  const outBuffer = Buffer.from(data);

  for (let i = 0; i < outBuffer.length; i += 4) {
    const r = outBuffer[i];
    const g = outBuffer[i + 1];
    const b = outBuffer[i + 2];

    const maxVal = Math.max(r, g, b);

    if (maxVal < 14) {
      outBuffer[i + 3] = 0; // completely transparent
    } else if (maxVal < 40) {
      // smooth feathering
      const alpha = Math.round(((maxVal - 14) / 26) * 255);
      outBuffer[i + 3] = alpha;
    }
  }

  await sharp(outBuffer, {
    raw: {
      width,
      height,
      channels: 4,
    }
  })
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

  console.log('Saved transparent cutout to:', outputPath);
}

processImage().catch(console.error);
