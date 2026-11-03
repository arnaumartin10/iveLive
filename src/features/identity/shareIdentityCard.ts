/**
 * Generates a 1080×1350 identity card image (offscreen Skia) and shares it.
 * Shows: prototype title, musical age, top 3 genres, avatar, @username.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  FontWeight,
  ImageFormat,
  PaintStyle,
  Skia,
  type SkCanvas,
  type SkImage,
} from '@shopify/react-native-skia';
import type { ProfileBasics } from '../profile/types';
import type { ComputedIdentity, MusicIdentityData } from './types';
import { MACRO_GENRES } from '../genres/macroGenres';
import { drawGenreSwatch } from '../genres/drawGenreSwatch';
import {
  drawMascotStamp,
  loadMascotStamp,
} from '../../components/brand/mascotStamp';
import { RAW } from '../../theme/palette';

const WIDTH = 1080;
const HEIGHT = 1350;

async function loadImage(
  uri: string | null | undefined,
): Promise<SkImage | null> {
  if (!uri) return null;
  try {
    const res = await fetch(uri);
    if (!res.ok) return null;
    const data = Skia.Data.fromBytes(new Uint8Array(await res.arrayBuffer()));
    return Skia.Image.MakeImageFromEncoded(data);
  } catch {
    return null;
  }
}

function drawText(
  canvas: SkCanvas,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = FontWeight.Bold,
) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setAntiAlias(true);
  const typeface = Skia.FontMgr.System().matchFamilyStyle('sans-serif', {
    weight,
    width: 5,
    slant: 0,
  });
  const font = Skia.Font(typeface, size);
  canvas.drawText(text, x, y, paint, font);
}

function drawCircleImage(
  canvas: SkCanvas,
  image: SkImage,
  cx: number,
  cy: number,
  radius: number,
) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const path = Skia.Path.Make();
  path.addCircle(cx, cy, radius);
  canvas.save();
  canvas.clipPath(path, 1, true);
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(cx - radius, cy - radius, radius * 2, radius * 2),
    paint,
  );
  canvas.restore();
}

function drawRoundRect(
  canvas: SkCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  alpha = 1,
) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(alpha);
  paint.setAntiAlias(true);
  const rrect = Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r);
  canvas.drawRRect(rrect, paint);
}

function drawRoundRectOutline(
  canvas: SkCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  strokeWidth: number,
) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  try {
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), paint);
  } finally {
    paint.dispose();
  }
}

export async function shareIdentityCard(
  profile: ProfileBasics,
  rawData: MusicIdentityData,
  computed: ComputedIdentity,
) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  const surface = Skia.Surface.MakeOffscreen(WIDTH, HEIGHT);
  if (!surface) throw new Error('Could not create the identity card surface.');
  const canvas = surface.getCanvas();

  // ── Printed poster background ──────────────────────────────────────────────
  const topGenres = Object.entries(rawData.genre_distribution)
    .filter(([g]) => g !== 'unclassified' && g !== 'other')
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([g]) => MACRO_GENRES[g as keyof typeof MACRO_GENRES]?.label ?? g);

  const c1 = RAW.orange;

  // Warm stock with a restrained halftone field instead of a gradient.
  const bgPaint = Skia.Paint();
  bgPaint.setColor(Skia.Color(RAW.wheat));
  canvas.drawRect(Skia.XYWHRect(0, 0, WIDTH, HEIGHT), bgPaint);
  const dotPaint = Skia.Paint();
  dotPaint.setColor(Skia.Color(RAW.mauve));
  dotPaint.setAlphaf(0.18);
  for (let y = 44; y < 300; y += 22) {
    for (let x = WIDTH - 330; x < WIDTH - 70; x += 22) {
      canvas.drawCircle(x, y, 3, dotPaint);
    }
  }

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const avatarImage = await loadImage(profile.avatar_url);
  const avatarRadius = 90;
  if (avatarImage) {
    drawCircleImage(canvas, avatarImage, 140, 140, avatarRadius);
  } else {
    drawRoundRect(
      canvas,
      50,
      50,
      avatarRadius * 2,
      avatarRadius * 2,
      avatarRadius,
      RAW.mauve,
    );
  }

  // ── Username ───────────────────────────────────────────────────────────────
  drawText(
    canvas,
    profile.display_name ?? profile.username,
    260,
    110,
    48,
    RAW.violet,
    FontWeight.Bold,
  );
  drawText(
    canvas,
    `@${profile.username}`,
    262,
    165,
    28,
    RAW.mauve,
    FontWeight.Medium,
  );

  // ── Divider ────────────────────────────────────────────────────────────────
  const divPaint = Skia.Paint();
  divPaint.setColor(Skia.Color(RAW.violet));
  canvas.drawRect(Skia.XYWHRect(80, 260, WIDTH - 160, 1), divPaint);

  // ── Prototype title ────────────────────────────────────────────────────────
  const title = computed.prototype?.title ?? 'The Music Lover';
  const tagline = computed.prototype?.tagline ?? 'Every show has a story.';
  const mascotStamp = await loadMascotStamp();

  drawText(canvas, title, 80, 340, 56, RAW.violet, FontWeight.Black);

  // Wrap tagline manually (simple split at ~48 chars)
  const tagWords = tagline.split(' ');
  let line = '';
  let lineY = 410;
  for (const word of tagWords) {
    if ((line + word).length > 44) {
      drawText(
        canvas,
        line.trim(),
        82,
        lineY,
        28,
        RAW.mauve,
        FontWeight.Medium,
      );
      lineY += 38;
      line = word + ' ';
    } else {
      line += word + ' ';
    }
  }
  if (line.trim())
    drawText(canvas, line.trim(), 82, lineY, 28, RAW.mauve, FontWeight.Medium);

  // ── Musical Age ────────────────────────────────────────────────────────────
  const ageY = 540;
  drawRoundRect(canvas, 80, ageY - 10, 520, 120, 20, RAW.wheat);
  if (computed.musicalAge) {
    drawText(
      canvas,
      'MUSICAL AGE',
      108,
      ageY + 26,
      20,
      RAW.mauve,
      FontWeight.Bold,
    );
    drawText(
      canvas,
      String(computed.musicalAge.year),
      108,
      ageY + 88,
      58,
      c1,
      FontWeight.Black,
    );
    drawText(
      canvas,
      computed.musicalAge.formattedText,
      250,
      ageY + 88,
      22,
      RAW.violet,
      FontWeight.Medium,
    );
  } else {
    drawText(
      canvas,
      'MUSICAL AGE',
      108,
      ageY + 26,
      20,
      RAW.mauve,
      FontWeight.Bold,
    );
    drawText(canvas, '—', 108, ageY + 88, 58, RAW.mauve, FontWeight.Black);
  }

  // ── Top 3 Genre pills ──────────────────────────────────────────────────────
  const pillY = 700;
  let pillX = 80;
  for (let i = 0; i < Math.min(3, topGenres.length); i++) {
    const genre = Object.entries(rawData.genre_distribution)
      .filter(([g]) => g !== 'unclassified' && g !== 'other')
      .sort((a, b) => b[1].count - a[1].count)[i];
    if (!genre) continue;
    const config = MACRO_GENRES[genre[0] as keyof typeof MACRO_GENRES];
    const label = config?.label ?? genre[0];
    const fontSize = 18;
    const pillWidth = label.length * 12 + 76;
    drawRoundRect(canvas, pillX + 3, pillY + 3, pillWidth, 50, 4, RAW.slate);
    drawRoundRect(canvas, pillX, pillY, pillWidth, 50, 4, RAW.violet);
    drawRoundRectOutline(
      canvas,
      pillX,
      pillY,
      pillWidth,
      50,
      4,
      RAW.wheat,
      1.5,
    );
    drawGenreSwatch(
      canvas,
      genre[0],
      pillX + 12,
      pillY + 14,
      22,
      RAW.violet,
      RAW.wheat,
    );
    drawText(
      canvas,
      label.toUpperCase(),
      pillX + 44,
      pillY + 32,
      fontSize,
      RAW.wheat,
      FontWeight.Bold,
    );
    pillX += pillWidth + 16;
  }

  // ── Era label ──────────────────────────────────────────────────────────────
  if (computed.eraLabel) {
    drawRoundRect(canvas, 80, 790, 340, 56, 28, RAW.orange, 0.18);
    drawText(
      canvas,
      computed.eraLabel.toUpperCase(),
      104,
      827,
      22,
      RAW.violet,
      FontWeight.Bold,
    );
  }

  // ── Footer branding ────────────────────────────────────────────────────────
  const footerPaint = Skia.Paint();
  footerPaint.setColor(Skia.Color(c1));
  canvas.drawRect(Skia.XYWHRect(80, 1230, WIDTH - 160, 3), footerPaint);
  drawText(canvas, 'IVE LIVE', 80, 1300, 42, RAW.violet, FontWeight.Black);
  drawText(
    canvas,
    `Your music identity · @${profile.username}`,
    82,
    1342,
    26,
    RAW.mauve,
    FontWeight.Medium,
  );
  drawMascotStamp(canvas, mascotStamp, WIDTH - 194, 1090, 112, 112, 0.16);

  // ── Save & share ───────────────────────────────────────────────────────────
  const snapshot = surface.makeImageSnapshot();
  const file = new File(Paths.cache, `ivelive-identity-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(snapshot.encodeToBytes(ImageFormat.PNG, 100));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'image/png',
    dialogTitle: 'Share your music identity',
  });
}
