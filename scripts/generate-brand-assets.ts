import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { RAW } from '../src/theme/palette';

const root = process.cwd();
const assetsDir = join(root, 'assets');
const generatedDir = join(assetsDir, 'generated');
const brandDir = join(root, 'src/assets/brand');
const mascotSvgPath = join(assetsDir, 'icon.svg');
const wordmarkPath = join(assetsDir, 'Wordmark.png');

type InkSet = { body: string; accent: string; outline: string };

function colorizeSvg(source: string, colors: InkSet) {
  return source
    .replaceAll('fill="#000000"', `fill="${colors.body}"`)
    .replaceAll('fill="#ffffff"', `fill="${colors.accent}"`)
    .replaceAll('stroke="#ffffff"', `stroke="${colors.outline}"`);
}

async function renderMascot(source: string) {
  return sharp(Buffer.from(source)).png().toBuffer();
}

async function trimTransparent(source: Buffer) {
  return sharp(source).trim().png().toBuffer();
}

async function placeOnCanvas(
  artwork: Buffer,
  size: number,
  scale: number,
): Promise<Buffer> {
  const fitted = await sharp(artwork)
    .resize(Math.round(size * scale), Math.round(size * scale), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function writePng(path: string, image: Buffer) {
  await mkdir(dirname(path), { recursive: true });
  await sharp(image).png().toFile(path);
}

async function createIcon(
  artwork: Buffer,
  path: string,
  background: string,
  mascotScale = 0.78,
  size = 1024,
) {
  const foreground = await placeOnCanvas(artwork, size, mascotScale);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: foreground }])
    .flatten({ background })
    .removeAlpha()
    .png()
    .toFile(path);
}

async function createWordmarkMask() {
  const { data, info } = await sharp(wordmarkPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const toRgb = (hex: string) =>
    hex
      .slice(1)
      .match(/.{2}/g)!
      .map((channel) => Number.parseInt(channel, 16));
  const background = toRgb(RAW.violet);
  const ink = toRgb(RAW.orange);
  const delta = ink.map((value, index) => value - background[index]!);
  const denominator = delta.reduce((sum, value) => sum + value * value, 0);
  const pixels = Buffer.alloc(info.width * info.height * 4);

  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const sourceOffset = pixel * info.channels;
    const targetOffset = pixel * 4;
    const projection = delta.reduce((sum, value, channel) => {
      return (
        sum + (data[sourceOffset + channel]! - background[channel]!) * value
      );
    }, 0);
    const alpha = Math.max(0, Math.min(1, projection / denominator));
    pixels[targetOffset] = 255;
    pixels[targetOffset + 1] = 255;
    pixels[targetOffset + 2] = 255;
    pixels[targetOffset + 3] = Math.round(alpha * 255);
  }

  const bounds = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim()
    .png()
    .toBuffer();
  return bounds;
}

async function main() {
  await mkdir(generatedDir, { recursive: true });
  await mkdir(brandDir, { recursive: true });

  const svg = await readFile(mascotSvgPath, 'utf8');
  const originalWordmark = await readFile(wordmarkPath);
  const violetWheat = await trimTransparent(
    await renderMascot(
      colorizeSvg(svg, {
        body: RAW.wheat,
        accent: RAW.orange,
        outline: RAW.wheat,
      }),
    ),
  );
  const wheatSlate = await trimTransparent(
    await renderMascot(
      colorizeSvg(svg, {
        body: RAW.slate,
        accent: RAW.orange,
        outline: RAW.slate,
      }),
    ),
  );
  const mono = await trimTransparent(
    await renderMascot(
      colorizeSvg(svg, {
        body: RAW.wheat,
        accent: RAW.wheat,
        outline: RAW.wheat,
      }),
    ),
  );
  const darkMono = await trimTransparent(
    await renderMascot(
      colorizeSvg(svg, {
        body: RAW.violet,
        accent: RAW.violet,
        outline: RAW.violet,
      }),
    ),
  );
  const wordmark = await createWordmarkMask();

  await createIcon(
    violetWheat,
    join(generatedDir, 'icon-candidate-violet-wheat.png'),
    RAW.violet,
  );
  await createIcon(
    wheatSlate,
    join(generatedDir, 'icon-candidate-wheat-slate.png'),
    RAW.wheat,
  );
  await createIcon(
    violetWheat,
    join(generatedDir, 'icon-ios-1024.png'),
    RAW.violet,
  );
  await createIcon(
    violetWheat,
    join(generatedDir, 'icon-ios-dark-1024.png'),
    RAW.slate,
  );

  await writePng(
    join(generatedDir, 'adaptive-foreground-1024.png'),
    await placeOnCanvas(violetWheat, 1024, 0.64),
  );
  await writePng(
    join(generatedDir, 'adaptive-monochrome-1024.png'),
    await placeOnCanvas(mono, 1024, 0.64),
  );
  await writePng(
    join(generatedDir, 'ios-tinted-1024.png'),
    await placeOnCanvas(darkMono, 1024, 0.78),
  );
  await writePng(
    join(generatedDir, 'mascot-stamp.png'),
    await placeOnCanvas(darkMono, 192, 0.72),
  );
  const whiteMascot = await trimTransparent(
    await renderMascot(
      colorizeSvg(svg, {
        body: 'white',
        accent: 'white',
        outline: 'white',
      }),
    ),
  );
  await writePng(
    join(generatedDir, 'notification-icon-96.png'),
    await placeOnCanvas(whiteMascot, 96, 0.72),
  );
  await createIcon(
    violetWheat,
    join(generatedDir, 'favicon-48.png'),
    RAW.violet,
    0.82,
    48,
  );
  await writePng(
    join(generatedDir, 'splash-mascot.png'),
    await placeOnCanvas(darkMono, 1024, 0.55),
  );
  await writePng(
    join(generatedDir, 'splash-mascot-dark.png'),
    await placeOnCanvas(mono, 1024, 0.55),
  );
  await writePng(join(brandDir, 'wordmark.png'), wordmark);

  const shareMascot = await placeOnCanvas(violetWheat, 520, 0.88);
  const tintedWordmark = await sharp(wordmark)
    .tint(RAW.wheat)
    .resize({ width: 520 })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: RAW.violet,
    },
  })
    .composite([
      { input: shareMascot, left: 36, top: 55 },
      { input: tintedWordmark, left: 590, top: 225 },
    ])
    .flatten({ background: RAW.violet })
    .removeAlpha()
    .png()
    .toFile(join(generatedDir, 'share-og-1200x630.png'));

  const { width, height, channels, hasAlpha } = await sharp(
    join(generatedDir, 'icon-ios-1024.png'),
  ).metadata();
  if (width !== 1024 || height !== 1024 || channels === 4 || hasAlpha) {
    throw new Error('Generated iOS icon must be opaque RGB at 1024x1024.');
  }
}

main().catch((error: unknown) => {
  console.error('Brand asset generation failed.', error);
  process.exitCode = 1;
});
