import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  FontWeight,
  ImageFormat,
  PaintStyle,
  Skia,
} from '@shopify/react-native-skia';
import type { SkCanvas } from '@shopify/react-native-skia';
import type { WrappedData, WrappedSlideId } from './buildWrappedData';
import { WRAPPED_SHARE_SIZES } from './shareDimensions';
import {
  drawMascotStamp,
  loadMascotStamp,
} from '../../components/brand/mascotStamp';
import { RAW } from '../../theme/palette';
import { drawGenreSwatch } from '../genres/drawGenreSwatch';

export { WRAPPED_SHARE_SIZES } from './shareDimensions';

type ShareImageOptions = {
  slide: WrappedSlideId;
  username: string;
  avatarUrl?: string | null;
  wallImageUris?: string[];
  summary?: boolean;
};

function fillRect(
  canvas: SkCanvas,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  alpha = 1,
) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(alpha);
  try {
    canvas.drawRect(Skia.XYWHRect(x, y, width, height), paint);
  } finally {
    paint.dispose();
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
  maxWidth = 900,
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
  let output = text;
  while (output.length > 1 && font.measureText(output).width > maxWidth) {
    output = `${output.slice(0, -2)}…`;
  }
  canvas.drawText(output, x, y, paint, font);
}

async function fetchSkiaImage(uri: string | null | undefined) {
  if (!uri) return null;
  try {
    const response = await fetch(uri);
    if (!response.ok) return null;
    const encoded = Skia.Data.fromBytes(
      new Uint8Array(await response.arrayBuffer()),
    );
    return Skia.Image.MakeImageFromEncoded(encoded);
  } catch {
    return null;
  }
}

function drawPaperPattern(
  canvas: SkCanvas,
  width: number,
  height: number,
  accent: string,
) {
  fillRect(canvas, 0, 0, width, height, RAW.wheat);
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(accent));
  paint.setAlphaf(0.13);
  for (let y = 32; y < Math.min(height, 520); y += 24) {
    for (let x = Math.max(0, width - 360); x < width - 40; x += 24) {
      canvas.drawCircle(x, y, 3, paint);
    }
  }
}

function drawBar(
  canvas: SkCanvas,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  fillRect(canvas, x, y, Math.max(3, width), height, color);
}

function strokeRect(
  canvas: SkCanvas,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(1.5);
  try {
    canvas.drawRect(Skia.XYWHRect(x, y, width, height), paint);
  } finally {
    paint.dispose();
  }
}

function drawTextPlate(
  canvas: SkCanvas,
  label: string,
  x: number,
  baseline: number,
  fontSize: number,
  maxWidth: number,
): number {
  const padding = 12;
  const labelWidth = Math.min(
    maxWidth - padding * 2,
    label.length * fontSize * 0.66,
  );
  const plateWidth = labelWidth + padding * 2;
  const plateHeight = fontSize + 18;
  const top = baseline - fontSize - 9;
  fillRect(canvas, x + 3, top + 3, plateWidth, plateHeight, RAW.slate);
  fillRect(canvas, x, top, plateWidth, plateHeight, RAW.violet);
  strokeRect(canvas, x, top, plateWidth, plateHeight, RAW.wheat);
  drawText(
    canvas,
    label.toUpperCase(),
    x + padding,
    baseline,
    fontSize,
    RAW.wheat,
    FontWeight.Bold,
    labelWidth,
  );
  return plateWidth;
}

function drawGenrePlate(
  canvas: SkCanvas,
  slug: string,
  label: string,
  x: number,
  baseline: number,
  fontSize: number,
  maxWidth: number,
): number {
  const padding = 12;
  const swatchSize = Math.min(28, fontSize * 0.6);
  const labelWidth = Math.min(
    maxWidth - swatchSize - padding * 3,
    label.length * fontSize * 0.66,
  );
  const plateWidth = labelWidth + swatchSize + padding * 3;
  const plateHeight = fontSize + 18;
  const top = baseline - fontSize - 9;
  fillRect(canvas, x + 3, top + 3, plateWidth, plateHeight, RAW.slate);
  fillRect(canvas, x, top, plateWidth, plateHeight, RAW.violet);
  strokeRect(canvas, x, top, plateWidth, plateHeight, RAW.wheat);
  drawGenreSwatch(
    canvas,
    slug,
    x + padding,
    baseline - swatchSize - 2,
    swatchSize,
    RAW.violet,
    RAW.wheat,
  );
  drawText(
    canvas,
    label.toUpperCase(),
    x + padding * 2 + swatchSize,
    baseline,
    fontSize,
    RAW.wheat,
    FontWeight.Bold,
    labelWidth,
  );
  return plateWidth;
}

export async function createWrappedImage(
  data: WrappedData,
  options: ShareImageOptions,
) {
  const size = options.summary
    ? WRAPPED_SHARE_SIZES.summary
    : WRAPPED_SHARE_SIZES.story;
  const surface = Skia.Surface.MakeOffscreen(size.width, size.height);
  if (!surface) throw new Error('Could not create the Wrapped share image.');
  const canvas = surface.getCanvas();
  const accent = data.genreColors[0] ?? RAW.orange;
  drawPaperPattern(canvas, size.width, size.height, accent);
  const mascotStamp = await loadMascotStamp();

  const titleColor = RAW.violet;
  const imageUri =
    options.summary ||
    options.slide === 'top-artist' ||
    options.slide === 'outro'
      ? data.topArtist?.imageUrl
      : options.slide === 'intro'
        ? options.avatarUrl
        : null;
  const image = await fetchSkiaImage(imageUri);
  const artistImages =
    options.slide === 'top-artists'
      ? await Promise.all(
          data.topArtists.map((artist) => fetchSkiaImage(artist.imageUrl)),
        )
      : [];
  const wallImages =
    options.slide === 'wall-of-fame'
      ? await Promise.all(
          (options.wallImageUris ?? []).slice(0, 9).map(fetchSkiaImage),
        )
      : [];

  if (
    image &&
    (options.summary ||
      options.slide === 'top-artist' ||
      options.slide === 'outro' ||
      options.slide === 'intro')
  ) {
    const diameter = options.summary
      ? 350
      : options.slide === 'intro'
        ? 280
        : 410;
    const x = (size.width - diameter) / 2;
    const y = options.summary ? 170 : options.slide === 'intro' ? 360 : 240;
    const imagePaint = Skia.Paint();
    imagePaint.setAntiAlias(true);
    canvas.save();
    const clip = Skia.Path.Make();
    clip.addCircle(size.width / 2, y + diameter / 2, diameter / 2);
    canvas.clipPath(clip, 1, true);
    canvas.drawImageRect(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect(x, y, diameter, diameter),
      imagePaint,
    );
    canvas.restore();
  }

  if (options.summary) {
    drawText(
      canvas,
      'IVE LIVE WRAPPED',
      72,
      630,
      34,
      titleColor,
      FontWeight.Bold,
    );
    drawText(
      canvas,
      `${data.totalShows}`,
      72,
      790,
      150,
      titleColor,
      FontWeight.Black,
    );
    drawText(
      canvas,
      'live shows',
      82,
      870,
      48,
      titleColor,
      FontWeight.SemiBold,
    );
    drawText(
      canvas,
      `${data.uniqueArtists} artists  ·  ${data.uniqueVenues} venues`,
      82,
      960,
      34,
      titleColor,
      FontWeight.Normal,
    );
    if (data.topGenres.length) {
      drawText(canvas, 'YOUR SOUND', 82, 1010, 20, titleColor);
      let x = 82;
      data.topGenres.slice(0, 3).forEach((genre) => {
        x +=
          drawGenrePlate(canvas, genre.slug, genre.label, x, 1060, 18, 260) +
          12;
      });
    } else {
      drawText(canvas, 'Live music', 82, 1050, 30, titleColor);
    }
    drawText(
      canvas,
      data.personality.title,
      82,
      1140,
      44,
      titleColor,
      FontWeight.Bold,
    );
  } else {
    switch (options.slide) {
      case 'intro':
        drawText(
          canvas,
          data.year == null
            ? 'Your live music story'
            : `Your ${data.year} in live music`,
          72,
          1150,
          72,
          titleColor,
          FontWeight.Bold,
        );
        drawText(
          canvas,
          `@${options.username}`,
          82,
          1260,
          36,
          titleColor,
          FontWeight.Medium,
        );
        break;
      case 'total':
        drawText(
          canvas,
          `${data.totalShows}`,
          72,
          800,
          200,
          titleColor,
          FontWeight.Black,
        );
        drawText(
          canvas,
          'shows that became your story',
          82,
          900,
          52,
          titleColor,
          FontWeight.SemiBold,
        );
        drawText(
          canvas,
          `Across ${data.uniqueVenues} venues and ${data.uniqueArtists} artists`,
          82,
          1010,
          36,
          titleColor,
          FontWeight.Medium,
        );
        break;
      case 'top-artist':
        drawText(
          canvas,
          'YOUR MOST-SEEN ARTIST',
          82,
          790,
          32,
          titleColor,
          FontWeight.SemiBold,
        );
        drawText(
          canvas,
          data.topArtist?.name ?? 'A favorite artist',
          82,
          880,
          70,
          titleColor,
          FontWeight.Black,
        );
        drawText(
          canvas,
          `${data.topArtist?.count ?? 0} nights together`,
          82,
          965,
          40,
          titleColor,
          FontWeight.SemiBold,
        );
        drawText(
          canvas,
          `${data.topArtist?.firstSeen ?? 'First show'}  →  ${data.topArtist?.lastSeen ?? 'Latest show'}`,
          82,
          1050,
          28,
          titleColor,
          FontWeight.Medium,
        );
        break;
      case 'top-artists':
        drawText(
          canvas,
          'THE SOUNDTRACK',
          82,
          250,
          56,
          titleColor,
          FontWeight.Black,
        );
        data.topArtists.forEach((artist, index) => {
          const y = 410 + index * 150;
          const artistImage = artistImages[index];
          if (artistImage) {
            const imagePaint = Skia.Paint();
            imagePaint.setAntiAlias(true);
            canvas.drawImageRect(
              artistImage,
              Skia.XYWHRect(0, 0, artistImage.width(), artistImage.height()),
              Skia.XYWHRect(82, y - 78, 66, 66),
              imagePaint,
            );
          }
          drawText(
            canvas,
            `${index + 1}`.padStart(2, '0'),
            82,
            y,
            40,
            accent,
            FontWeight.Bold,
          );
          drawText(
            canvas,
            artist.name,
            170,
            y,
            44,
            titleColor,
            FontWeight.Bold,
          );
          drawText(
            canvas,
            `${artist.count} shows`,
            170,
            y + 50,
            30,
            titleColor,
            FontWeight.Normal,
          );
        });
        break;
      case 'genres':
        drawText(
          canvas,
          'YOUR TOP GENRES',
          82,
          270,
          56,
          titleColor,
          FontWeight.Black,
        );
        data.topGenres.forEach((genre, index) => {
          const y = 460 + index * 250;
          drawGenrePlate(canvas, genre.slug, genre.label, 82, y, 46, 850);
          drawText(
            canvas,
            `${genre.percentage}%`,
            82,
            y + 80,
            38,
            titleColor,
            FontWeight.SemiBold,
          );
          drawBar(
            canvas,
            82,
            y + 110,
            (850 * genre.percentage) / 100,
            18,
            genre.color,
          );
        });
        break;
      case 'venues':
        drawText(
          canvas,
          'WHERE YOU WENT',
          82,
          270,
          56,
          titleColor,
          FontWeight.Black,
        );
        data.venueMix.forEach((venue, index) => {
          const y = 430 + index * 120;
          drawTextPlate(
            canvas,
            `${venue.label}  ·  ${venue.count} shows`,
            82,
            y,
            36,
            850,
          );
          drawBar(
            canvas,
            82,
            y + 24,
            (850 * venue.percentage) / 100,
            16,
            venue.color,
          );
        });
        if (data.mostVisitedVenue)
          drawText(
            canvas,
            `Most visited: ${data.mostVisitedVenue.name}`,
            82,
            1160,
            34,
            titleColor,
            FontWeight.SemiBold,
          );
        break;
      case 'month':
        drawText(
          canvas,
          'YOUR BUSIEST MONTH',
          82,
          270,
          56,
          titleColor,
          FontWeight.Black,
        );
        drawText(
          canvas,
          data.busiestMonth
            ? new Intl.DateTimeFormat('en', { month: 'long' }).format(
                new Date(2025, data.busiestMonth.month - 1, 1),
              )
            : 'The live calendar',
          82,
          380,
          64,
          titleColor,
          FontWeight.Bold,
        );
        data.showsByMonth.forEach((value, index) =>
          drawBar(
            canvas,
            82 + index * 78,
            850 - value * 10,
            48,
            value * 10,
            index + 1 === data.busiestMonth?.month ? RAW.orange : accent,
          ),
        );
        drawText(
          canvas,
          `Busiest weekday: ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(data.busiestWeekday?.weekday ?? 1) - 1]}`,
          82,
          1040,
          36,
          titleColor,
          FontWeight.SemiBold,
        );
        break;
      case 'records':
        drawText(
          canvas,
          'THE RECORDS',
          82,
          270,
          56,
          titleColor,
          FontWeight.Black,
        );
        drawText(
          canvas,
          `${data.longestStreakWeeks} weeks`,
          82,
          480,
          58,
          titleColor,
          FontWeight.Bold,
        );
        drawText(
          canvas,
          'Longest streak',
          82,
          535,
          30,
          titleColor,
          FontWeight.Normal,
        );
        drawText(
          canvas,
          `${data.mostShowsInOneWeek} shows`,
          82,
          700,
          58,
          titleColor,
          FontWeight.Bold,
        );
        drawText(
          canvas,
          'Most in one week',
          82,
          755,
          30,
          titleColor,
          FontWeight.Normal,
        );
        drawText(
          canvas,
          `${data.longestGapDays} days`,
          82,
          920,
          58,
          titleColor,
          FontWeight.Bold,
        );
        drawText(
          canvas,
          'Longest gap',
          82,
          975,
          30,
          titleColor,
          FontWeight.Normal,
        );
        break;
      case 'taste':
        drawText(
          canvas,
          `TASTE DIVERSITY  ${data.tasteScore}/100`,
          82,
          300,
          54,
          titleColor,
          FontWeight.Black,
        );
        drawText(
          canvas,
          data.personality.title,
          82,
          480,
          58,
          titleColor,
          FontWeight.Bold,
        );
        drawText(
          canvas,
          data.personality.description,
          82,
          570,
          34,
          titleColor,
          FontWeight.Normal,
        );
        drawText(
          canvas,
          `${data.dominantGenre?.percentage ?? 0}% ${data.dominantGenre?.label ?? 'music'}`,
          82,
          1050,
          40,
          titleColor,
          FontWeight.SemiBold,
        );
        break;
      case 'ratings':
        drawText(
          canvas,
          'YOUR RATINGS',
          82,
          270,
          56,
          titleColor,
          FontWeight.Black,
        );
        drawText(
          canvas,
          data.ratingLabel ?? 'Every show counts',
          82,
          390,
          54,
          titleColor,
          FontWeight.Bold,
        );
        data.ratingHistogram.forEach((value, index) =>
          drawBar(
            canvas,
            82 + index * 90,
            900 - value * 8,
            58,
            value * 8,
            index === 9 ? RAW.orange : accent,
          ),
        );
        drawText(
          canvas,
          `${data.fiveStarCount} five-star shows`,
          82,
          1040,
          38,
          titleColor,
          FontWeight.SemiBold,
        );
        break;
      case 'wall-of-fame':
        drawText(
          canvas,
          'WALL OF FAME',
          82,
          270,
          56,
          titleColor,
          FontWeight.Black,
        );
        drawText(
          canvas,
          `${data.fiveStarCount} five-star nights`,
          82,
          360,
          40,
          titleColor,
          FontWeight.SemiBold,
        );
        wallImages.forEach((wallImage, index) => {
          if (!wallImage) return;
          const column = index % 3;
          const row = Math.floor(index / 3);
          const tileSize = 260;
          const x = 82 + column * 280;
          const y = 470 + row * 285;
          const imagePaint = Skia.Paint();
          imagePaint.setAntiAlias(true);
          canvas.drawImageRect(
            wallImage,
            Skia.XYWHRect(0, 0, wallImage.width(), wallImage.height()),
            Skia.XYWHRect(x, y, tileSize, tileSize),
            imagePaint,
          );
          drawText(
            canvas,
            '★',
            x + tileSize - 46,
            y + 48,
            38,
            RAW.orange,
            FontWeight.Bold,
          );
        });
        break;
      case 'badges':
        drawText(
          canvas,
          'BADGES EARNED',
          82,
          270,
          56,
          titleColor,
          FontWeight.Black,
        );
        data.earnedBadges
          .slice(0, 8)
          .forEach((badge, index) =>
            drawText(
              canvas,
              `★  ${badge}`,
              82,
              430 + index * 92,
              38,
              titleColor,
              FontWeight.SemiBold,
            ),
          );
        break;
      case 'outro':
        drawText(
          canvas,
          'YOUR LIVE MUSIC STORY',
          82,
          670,
          50,
          titleColor,
          FontWeight.SemiBold,
        );
        drawText(
          canvas,
          `${data.totalShows} shows`,
          82,
          800,
          88,
          titleColor,
          FontWeight.Black,
        );
        drawText(
          canvas,
          `${data.uniqueArtists} artists  ·  ${data.uniqueVenues} venues`,
          82,
          890,
          34,
          titleColor,
          FontWeight.Medium,
        );
        drawText(
          canvas,
          data.personality.title,
          82,
          1020,
          50,
          titleColor,
          FontWeight.Bold,
        );
        break;
    }
  }

  fillRect(canvas, 70, size.height - 150, 300, 2, RAW.orange, 0.75);
  drawText(
    canvas,
    `@${options.username}`,
    630,
    size.height - 90,
    28,
    titleColor,
    FontWeight.Medium,
    230,
  );
  const stampSize = 94;
  drawMascotStamp(
    canvas,
    mascotStamp,
    size.width - stampSize - 62,
    size.height - stampSize - 18,
    stampSize,
  );

  const pngBase64 = surface
    .makeImageSnapshot()
    .encodeToBase64(ImageFormat.PNG, 100);
  const file = new File(Paths.cache, `ivelive-wrapped-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(pngBase64, { encoding: 'base64' });
  return file.uri;
}

export async function shareWrappedImage(
  data: WrappedData,
  options: ShareImageOptions,
) {
  const uri = await createWrappedImage(data, options);
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare)
    throw new Error('Image sharing is not available on this device.');
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: 'Share your IveLive Wrapped',
  });
}
