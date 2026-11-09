import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
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
): Promise<string | Blob> {
  if (Platform.OS === 'web') {
    return createWrappedBrowserImage(data, options);
  }

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

async function createWrappedBrowserImage(
  data: WrappedData,
  options: ShareImageOptions,
): Promise<Blob> {
  const size = options.summary
    ? WRAPPED_SHARE_SIZES.summary
    : WRAPPED_SHARE_SIZES.story;
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the Wrapped share image.');

  const titleColor = RAW.violet;
  const accent = data.genreColors[0] ?? RAW.orange;
  const imageUris = [
    options.summary || options.slide === 'top-artist' || options.slide === 'outro'
      ? data.topArtist?.imageUrl
      : options.slide === 'intro'
        ? options.avatarUrl
        : null,
    ...(options.slide === 'top-artists'
      ? data.topArtists.map((artist) => artist.imageUrl)
      : []),
    ...(options.slide === 'wall-of-fame'
      ? (options.wallImageUris ?? []).slice(0, 9)
      : []),
  ];
  const images = await Promise.all(imageUris.map(loadBrowserWrappedImage));
  const draw = (includeImages: boolean) => {
    drawWrappedPaper(context, size.width, size.height, accent);
    const heroImage = includeImages ? (images[0] ?? null) : null;
    if (heroImage) {
      const diameter = options.summary
        ? 350
        : options.slide === 'intro'
          ? 280
          : 410;
      const y = options.summary ? 170 : options.slide === 'intro' ? 360 : 240;
      drawWrappedCircleImage(
        context,
        heroImage,
        size.width / 2,
        y + diameter / 2,
        diameter,
      );
    }

    if (options.summary) {
      drawWrappedText(context, 'IVE LIVE WRAPPED', 72, 630, 34, titleColor);
      drawWrappedText(context, `${data.totalShows}`, 72, 790, 150, titleColor);
      drawWrappedText(context, 'live shows', 82, 870, 48, titleColor);
      drawWrappedText(
        context,
        `${data.uniqueArtists} artists  ·  ${data.uniqueVenues} venues`,
        82,
        960,
        34,
        titleColor,
      );
      drawWrappedText(context, 'YOUR SOUND', 82, 1010, 20, titleColor);
      data.topGenres.slice(0, 3).forEach((genre, index) => {
        drawWrappedText(
          context,
          `${genre.label} · ${genre.percentage}%`,
          82 + index * 300,
          1060,
          22,
          genre.color,
          260,
        );
      });
      drawWrappedText(context, data.personality.title, 82, 1140, 44, titleColor);
    } else {
      drawWrappedSlide(context, data, options, images, includeImages, titleColor, accent);
    }

    context.fillStyle = RAW.orange;
    context.globalAlpha = 0.75;
    context.fillRect(70, size.height - 150, 300, 2);
    context.globalAlpha = 1;
    drawWrappedText(
      context,
      `@${options.username}`,
      630,
      size.height - 90,
      28,
      titleColor,
      230,
    );
    context.fillStyle = RAW.orange;
    context.font = '700 58px sans-serif';
    context.fillText('✦', size.width - 156, size.height - 42);
  };

  draw(true);
  let blob = await canvasToPng(canvas);
  if (!blob) {
    draw(false);
    blob = await canvasToPng(canvas);
  }
  if (!blob) throw new Error('The browser could not export the Wrapped image.');
  return blob;
}

function drawWrappedSlide(
  context: CanvasRenderingContext2D,
  data: WrappedData,
  options: ShareImageOptions,
  images: (HTMLImageElement | null)[],
  includeImages: boolean,
  titleColor: string,
  accent: string,
) {
  const text = (
    value: string,
    y: number,
    size: number,
    weight = 700,
    maxWidth = 900,
  ) => drawWrappedText(context, value, 82, y, size, titleColor, maxWidth, weight);
  switch (options.slide) {
    case 'intro':
      text(
        data.year == null ? 'Your live music story' : `Your ${data.year} in live music`,
        1150,
        72,
      );
      text(`@${options.username}`, 1260, 36, 500);
      break;
    case 'total':
      text(`${data.totalShows}`, 800, 200);
      text('shows that became your story', 900, 52, 600);
      text(`Across ${data.uniqueVenues} venues and ${data.uniqueArtists} artists`, 1010, 36, 500);
      break;
    case 'top-artist':
      text('YOUR MOST-SEEN ARTIST', 790, 32, 600);
      text(data.topArtist?.name ?? 'A favorite artist', 880, 70);
      text(`${data.topArtist?.count ?? 0} nights together`, 965, 40, 600);
      text(
        `${data.topArtist?.firstSeen ?? 'First show'}  →  ${data.topArtist?.lastSeen ?? 'Latest show'}`,
        1050,
        28,
        500,
      );
      break;
    case 'top-artists':
      text('THE SOUNDTRACK', 250, 56);
      data.topArtists.forEach((artist, index) => {
        const y = 410 + index * 150;
        if (includeImages && images[index + 1]) {
          drawWrappedSquareImage(context, images[index + 1]!, 82, y - 78, 66);
        }
        drawWrappedText(context, `${index + 1}`.padStart(2, '0'), 82, y, 40, accent);
        drawWrappedText(context, artist.name, 170, y, 44, titleColor, 800);
        drawWrappedText(
          context,
          `${artist.count} shows`,
          170,
          y + 50,
          30,
          titleColor,
          400,
          400,
        );
      });
      break;
    case 'genres':
      text('YOUR TOP GENRES', 270, 56);
      data.topGenres.forEach((genre, index) => {
        const y = 460 + index * 250;
        drawWrappedText(context, genre.label.toUpperCase(), 82, y, 46, titleColor, 840);
        text(`${genre.percentage}%`, y + 80, 38, 600);
        context.fillStyle = genre.color;
        context.fillRect(82, y + 110, Math.max(3, (850 * genre.percentage) / 100), 18);
      });
      break;
    case 'venues':
      text('WHERE YOU WENT', 270, 56);
      data.venueMix.forEach((venue, index) => {
        const y = 430 + index * 120;
        drawWrappedText(
          context,
          `${venue.label}  ·  ${venue.count} shows`,
          82,
          y,
          36,
          titleColor,
          850,
        );
        context.fillStyle = venue.color;
        context.fillRect(82, y + 24, Math.max(3, (850 * venue.percentage) / 100), 16);
      });
      if (data.mostVisitedVenue) {
        text(`Most visited: ${data.mostVisitedVenue.name}`, 1160, 34, 600);
      }
      break;
    case 'month':
      text('YOUR BUSIEST MONTH', 270, 56);
      text(
        data.busiestMonth
          ? new Intl.DateTimeFormat('en', { month: 'long' }).format(
              new Date(2025, data.busiestMonth.month - 1, 1),
            )
          : 'The live calendar',
        380,
        64,
      );
      data.showsByMonth.forEach((value, index) => {
        context.fillStyle =
          index + 1 === data.busiestMonth?.month ? RAW.orange : accent;
        context.fillRect(82 + index * 78, 850 - value * 10, 48, value * 10);
      });
      text(
        `Busiest weekday: ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(data.busiestWeekday?.weekday ?? 1) - 1]}`,
        1040,
        36,
        600,
      );
      break;
    case 'records':
      text('THE RECORDS', 270, 56);
      text(`${data.longestStreakWeeks} weeks`, 480, 58);
      text('Longest streak', 535, 30, 400);
      text(`${data.mostShowsInOneWeek} shows`, 700, 58);
      text('Most in one week', 755, 30, 400);
      text(`${data.longestGapDays} days`, 920, 58);
      text('Longest gap', 975, 30, 400);
      break;
    case 'taste':
      text(`TASTE DIVERSITY  ${data.tasteScore}/100`, 300, 54);
      text(data.personality.title, 480, 58);
      text(data.personality.description, 570, 34, 400);
      text(`${data.dominantGenre?.percentage ?? 0}% ${data.dominantGenre?.label ?? 'music'}`, 1050, 40, 600);
      break;
    case 'ratings':
      text('YOUR RATINGS', 270, 56);
      text(data.ratingLabel ?? 'Every show counts', 390, 54);
      data.ratingHistogram.forEach((value, index) => {
        context.fillStyle = index === 9 ? RAW.orange : accent;
        context.fillRect(82 + index * 90, 900 - value * 8, 58, value * 8);
      });
      text(`${data.fiveStarCount} five-star shows`, 1040, 38, 600);
      break;
    case 'wall-of-fame':
      text('WALL OF FAME', 270, 56);
      text(`${data.fiveStarCount} five-star nights`, 360, 40, 600);
      for (let index = 0; index < 9; index += 1) {
        const image = includeImages ? images[index + 1] : null;
        if (!image) continue;
        const x = 82 + (index % 3) * 280;
        const y = 470 + Math.floor(index / 3) * 285;
        drawWrappedSquareImage(context, image, x, y, 260);
        drawWrappedText(context, '★', x + 215, y + 48, 38, RAW.orange, 44);
      }
      break;
    case 'badges':
      text('BADGES EARNED', 270, 56);
      data.earnedBadges.slice(0, 8).forEach((badge, index) =>
        text(`★  ${badge}`, 430 + index * 92, 38, 600),
      );
      break;
    case 'outro':
      text('YOUR LIVE MUSIC STORY', 670, 50, 600);
      text(`${data.totalShows} shows`, 800, 88);
      text(`${data.uniqueArtists} artists  ·  ${data.uniqueVenues} venues`, 890, 34, 500);
      text(data.personality.title, 1020, 50);
      break;
  }
}

function drawWrappedPaper(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
) {
  context.fillStyle = RAW.wheat;
  context.fillRect(0, 0, width, height);
  context.fillStyle = accent;
  context.globalAlpha = 0.13;
  for (let y = 32; y < Math.min(height, 520); y += 24) {
    for (let x = Math.max(0, width - 360); x < width - 40; x += 24) {
      context.beginPath();
      context.arc(x, y, 3, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  maxWidth = 900,
  weight = 700,
) {
  context.fillStyle = color;
  context.font = `${weight} ${size}px sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  let output = value;
  while (output.length > 1 && context.measureText(output).width > maxWidth) {
    output = `${output.slice(0, -2)}…`;
  }
  context.fillText(output, x, y);
}

function drawWrappedCircleImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  diameter: number,
) {
  context.save();
  context.beginPath();
  context.arc(centerX, centerY, diameter / 2, 0, Math.PI * 2);
  context.clip();
  drawWrappedCoverImage(context, image, centerX - diameter / 2, centerY - diameter / 2, diameter, diameter);
  context.restore();
}

function drawWrappedSquareImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  context.save();
  context.beginPath();
  context.rect(x, y, size, size);
  context.clip();
  drawWrappedCoverImage(context, image, x, y, size, size);
  context.restore();
}

function drawWrappedCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(
    image,
    (image.naturalWidth - sourceWidth) / 2,
    (image.naturalHeight - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function loadBrowserWrappedImage(
  uri: string | null | undefined,
): Promise<HTMLImageElement | null> {
  if (!uri) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(null), 5000);
    const finish = (result: HTMLImageElement | null) => {
      window.clearTimeout(timeout);
      resolve(result);
    };
    image.crossOrigin = 'anonymous';
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = uri;
  });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export async function shareWrappedImage(
  data: WrappedData,
  options: ShareImageOptions,
  target: 'default' | 'whatsapp' = 'default',
) {
  const whatsappWindow =
    target === 'whatsapp' ? window.open('about:blank', '_blank') : null;
  if (whatsappWindow) whatsappWindow.opener = null;
  const uriOrBlob = await createWrappedImage(data, options);
  if (typeof uriOrBlob !== 'string') {
    const filename = 'ivelive-wrapped.png';
    const shareText = `My IveLive Wrapped: ${window.location.href}`;
    if (target === 'whatsapp') {
      downloadBrowserImage(uriOrBlob, filename);
      if (whatsappWindow) {
        whatsappWindow.location.href =
          `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      } else {
        await navigator.clipboard.writeText(shareText);
      }
      return 'downloaded';
    }

    const webNavigator = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    const file =
      typeof globalThis.File === 'function'
        ? new globalThis.File([uriOrBlob], filename, { type: 'image/png' })
        : null;
    if (
      file &&
      typeof webNavigator.share === 'function' &&
      webNavigator.canShare?.({ files: [file] })
    ) {
      await webNavigator.share({
        files: [file],
        title: 'My IveLive Wrapped',
        text: shareText,
        url: window.location.href,
      });
      return 'shared';
    }

    downloadBrowserImage(uriOrBlob, file?.name ?? filename);
    try {
      await navigator.clipboard.writeText(shareText);
      return 'downloaded';
    } catch {
      downloadBrowserImage(
        new Blob([shareText], { type: 'text/plain;charset=utf-8' }),
        'ivelive-wrapped-link.txt',
      );
      return 'downloaded';
    }
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare)
    throw new Error('Image sharing is not available on this device.');
  await Sharing.shareAsync(uriOrBlob, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: 'Share your IveLive Wrapped',
  });
  return 'shared';
}

function downloadBrowserImage(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}
