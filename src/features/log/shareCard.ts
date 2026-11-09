import QRCode from 'qrcode';
import {
  BlurStyle,
  ClipOp,
  FontWeight,
  ImageFormat,
  PaintStyle,
  Skia,
  TileMode,
  type SkCanvas,
  type SkFont,
  type SkImage,
  type SkPaint,
} from '@shopify/react-native-skia';
import { format, parseISO } from 'date-fns';
import { Platform } from 'react-native';
import { routes } from '../../navigation/routes';

const WIDTH = 1080;
const COLORS = {
  accent: '#e8a64d',
  background: '#17131a',
  muted: '#c6b9c3',
  paper: '#fffaf1',
  white: '#ffffff',
};

export type ShareCardFormat = 'story' | 'square';

export type ConcertShareCardInput = {
  artistName: string;
  imageUri: string | null;
  macroGenre: string | null;
  genreColor: string;
  eventDate: string;
  venueName: string | null;
  rating: number | null;
  review?: string | null;
  publicUrl: string;
  format?: ShareCardFormat;
};

export type RenderedConcertShareCard = {
  bytes: Uint8Array;
  width: number;
  height: number;
};

export const SHARE_CARD_DIMENSIONS: Record<
  ShareCardFormat,
  { width: number; height: number }
> = {
  story: { width: WIDTH, height: 1920 },
  square: { width: WIDTH, height: WIDTH },
};

export function getConcertShareMessage(
  input: Pick<
    ConcertShareCardInput,
    'artistName' | 'eventDate' | 'venueName' | 'rating' | 'publicUrl'
  >,
) {
  const date = formatConcertDate(input.eventDate);
  const venue = input.venueName ? ` at ${input.venueName}` : '';
  const rating = input.rating == null ? '' : ` 🌟 ${input.rating.toFixed(1)}/5`;
  return `I saw ${input.artistName} live${venue} on ${date}!${rating}\n\nCheck out my show log on IveLive: ${input.publicUrl}`;
}

export function createShareQrMatrix(url: string) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  return {
    size: qr.modules.size,
    data: qr.modules.data,
  };
}

export function getPublicLogUrl(id: string) {
  return routes.logPublicUrl(id);
}

export async function renderConcertShareCard(
  input: ConcertShareCardInput,
): Promise<RenderedConcertShareCard> {
  const format = input.format ?? 'story';
  const { width, height } = SHARE_CARD_DIMENSIONS[format];
  if (Platform.OS === 'web') {
    return renderBrowserConcertShareCard(input, width, height);
  }

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('Could not create the concert share card.');

  const canvas = surface.getCanvas();
  const artistImage = await loadImage(input.imageUri);
  drawBackground(canvas, width, height, artistImage);

  const story = format === 'story';
  const heroHeight = story ? 760 : 290;
  const avatarSize = story ? 238 : 190;
  const avatarX = (width - avatarSize) / 2;
  const avatarY = heroHeight - avatarSize * 0.48;

  const glow = makePaint(input.genreColor);
  glow.setAlphaf(0.35);
  glow.setMaskFilter(
    Skia.MaskFilter.MakeBlur(BlurStyle.Normal, story ? 44 : 34, true),
  );
  canvas.drawCircle(
    width / 2,
    avatarY + avatarSize / 2,
    avatarSize * 0.7,
    glow,
  );
  canvas.drawCircle(
    width / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2 + 17,
    makePaint(input.genreColor, 0.95),
  );

  if (artistImage) {
    drawCircleImage(canvas, artistImage, avatarX, avatarY, avatarSize);
  } else {
    canvas.drawCircle(
      width / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      makePaint('#694f5d'),
    );
    drawText(
      canvas,
      input.artistName.trim().slice(0, 1).toUpperCase() || 'I',
      width / 2,
      avatarY + avatarSize / 2 + (story ? 36 : 32),
      makeFont(story ? 92 : 82, FontWeight.Bold),
      makePaint(COLORS.paper),
      true,
    );
  }
  canvas.drawCircle(
    width / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2 + 4,
    makePaint(COLORS.paper, 1, 5),
  );

  const titleFont = makeFont(story ? 72 : 54, FontWeight.Bold);
  const titleLines = wrapText(input.artistName, titleFont, width - 150, 2);
  const titleStart = heroHeight + (story ? 196 : 125);
  titleLines.forEach((line, index) =>
    drawText(
      canvas,
      line,
      width / 2,
      titleStart + index * (story ? 82 : 60),
      titleFont,
      makePaint(COLORS.white),
      true,
    ),
  );

  const genreLabel = (input.macroGenre ?? 'LIVE MUSIC').replace(/_/g, ' ');
  drawText(
    canvas,
    genreLabel.toUpperCase(),
    width / 2,
    titleStart + titleLines.length * (story ? 82 : 60) + 10,
    makeFont(24, FontWeight.SemiBold),
    makePaint(input.genreColor),
    true,
  );

  const dateBaseline = story ? 1120 : 600;
  drawText(
    canvas,
    formatConcertDate(input.eventDate).toUpperCase(),
    width / 2,
    dateBaseline,
    makeFont(30, FontWeight.Medium),
    makePaint(COLORS.muted),
    true,
  );

  let detailBaseline = dateBaseline + (story ? 112 : 70);
  if (input.venueName) {
    const venueFont = makeFont(story ? 30 : 24, FontWeight.SemiBold);
    const venueText = fitText(input.venueName, venueFont, width - 230);
    const pillWidth = Math.min(
      width - 120,
      Math.max(300, venueFont.measureText(venueText).width + 116),
    );
    const pillHeight = story ? 76 : 60;
    const pillX = (width - pillWidth) / 2;
    const pillY = detailBaseline - pillHeight + 20;
    const pill = Skia.Paint();
    pill.setAntiAlias(true);
    pill.setColor(Skia.Color(COLORS.white));
    pill.setAlphaf(0.12);
    canvas.drawRRect(
      Skia.RRectXY(
        Skia.XYWHRect(pillX, pillY, pillWidth, pillHeight),
        pillHeight / 2,
        pillHeight / 2,
      ),
      pill,
    );
    drawVenueMark(canvas, pillX + 30, pillY + pillHeight / 2);
    drawText(
      canvas,
      venueText,
      width / 2 + 12,
      detailBaseline,
      venueFont,
      makePaint(COLORS.white),
      true,
    );
    detailBaseline += story ? 125 : 85;
  } else {
    detailBaseline += story ? 42 : 25;
  }

  if (input.rating != null) {
    const ratingText = `${input.rating.toFixed(1)} / 5`;
    drawText(
      canvas,
      `★  ${ratingText}`,
      width / 2,
      detailBaseline,
      makeFont(story ? 38 : 30, FontWeight.Bold),
      makePaint(COLORS.accent),
      true,
    );
    detailBaseline += story ? 112 : 75;
  }

  const review = input.review?.trim();
  if (review && detailBaseline < height - (story ? 410 : 160)) {
    const reviewFont = makeFont(story ? 29 : 24, FontWeight.Medium);
    const lines = wrapText(
      `“${review}”`,
      reviewFont,
      width - 190,
      story ? 3 : 2,
    );
    lines.forEach((line, index) =>
      drawText(
        canvas,
        line,
        width / 2,
        detailBaseline + index * (story ? 46 : 38),
        reviewFont,
        makePaint(COLORS.paper, 0.92),
        true,
      ),
    );
  }

  drawFooter(canvas, input.publicUrl, width, height, input.genreColor);
  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG, 100);
  return { bytes, width, height };
}

async function renderBrowserConcertShareCard(
  input: ConcertShareCardInput,
  width: number,
  height: number,
  includeArtistImage = true,
): Promise<RenderedConcertShareCard> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the share card canvas.');

  const story = height > width;
  const image = includeArtistImage
    ? await loadBrowserImage(input.imageUri)
    : null;
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#33232e');
  background.addColorStop(0.52, COLORS.background);
  background.addColorStop(1, '#0d0b10');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  if (image) {
    drawBrowserCoverImage(context, image, 0, 0, width, height);
    context.fillStyle = 'rgba(23, 19, 26, 0.72)';
    context.fillRect(0, 0, width, height);
  }

  const heroHeight = story ? 760 : 290;
  const avatarSize = story ? 238 : 190;
  const avatarX = (width - avatarSize) / 2;
  const avatarY = heroHeight - avatarSize * 0.48;
  const avatarCenterX = width / 2;
  const avatarCenterY = avatarY + avatarSize / 2;

  const glow = context.createRadialGradient(
    avatarCenterX,
    avatarCenterY,
    avatarSize / 3,
    avatarCenterX,
    avatarCenterY,
    avatarSize,
  );
  glow.addColorStop(0, `${input.genreColor}99`);
  glow.addColorStop(1, `${input.genreColor}00`);
  context.fillStyle = glow;
  context.beginPath();
  context.arc(avatarCenterX, avatarCenterY, avatarSize, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.arc(
    avatarCenterX,
    avatarCenterY,
    avatarSize / 2 + 17,
    0,
    Math.PI * 2,
  );
  context.fillStyle = input.genreColor;
  context.fill();
  context.save();
  context.beginPath();
  context.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
  context.clip();
  if (image) {
    drawBrowserCoverImage(context, image, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    context.fillStyle = '#694f5d';
    context.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    context.fillStyle = COLORS.paper;
    context.font = `700 ${story ? 92 : 82}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      input.artistName.trim().slice(0, 1).toUpperCase() || 'I',
      avatarCenterX,
      avatarCenterY,
    );
  }
  context.restore();
  context.beginPath();
  context.arc(avatarCenterX, avatarCenterY, avatarSize / 2 + 4, 0, Math.PI * 2);
  context.strokeStyle = COLORS.paper;
  context.lineWidth = 5;
  context.stroke();

  const titleFontSize = story ? 72 : 54;
  context.font = `700 ${titleFontSize}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const titleLines = wrapBrowserText(
    context,
    input.artistName,
    width - 150,
    2,
  );
  const titleStart = heroHeight + (story ? 196 : 125);
  context.fillStyle = COLORS.white;
  titleLines.forEach((line, index) =>
    context.fillText(
      line,
      width / 2,
      titleStart + index * (story ? 82 : 60),
    ),
  );

  const genreLabel = (input.macroGenre ?? 'LIVE MUSIC').replace(/_/g, ' ');
  context.fillStyle = input.genreColor;
  context.font = '600 24px sans-serif';
  context.fillText(
    genreLabel.toUpperCase(),
    width / 2,
    titleStart + titleLines.length * (story ? 82 : 60) + 10,
  );

  const dateBaseline = story ? 1120 : 600;
  context.fillStyle = COLORS.muted;
  context.font = '500 30px sans-serif';
  context.fillText(
    formatConcertDate(input.eventDate).toUpperCase(),
    width / 2,
    dateBaseline,
  );

  let detailBaseline = dateBaseline + (story ? 112 : 70);
  if (input.venueName) {
    context.font = `600 ${story ? 30 : 24}px sans-serif`;
    const venueText = fitBrowserText(
      context,
      input.venueName,
      width - 230,
    );
    const pillWidth = Math.min(
      width - 120,
      Math.max(300, context.measureText(venueText).width + 116),
    );
    const pillHeight = story ? 76 : 60;
    const pillX = (width - pillWidth) / 2;
    const pillY = detailBaseline - pillHeight + 20;
    context.fillStyle = 'rgba(255, 255, 255, 0.12)';
    drawBrowserRoundRect(context, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
    context.fill();
    drawBrowserVenueMark(context, pillX + 30, pillY + pillHeight / 2);
    context.fillStyle = COLORS.white;
    context.fillText(venueText, width / 2 + 12, detailBaseline);
    detailBaseline += story ? 125 : 85;
  } else {
    detailBaseline += story ? 42 : 25;
  }

  if (input.rating != null) {
    context.fillStyle = COLORS.accent;
    context.font = `700 ${story ? 38 : 30}px sans-serif`;
    context.fillText(
      `★  ${input.rating.toFixed(1)} / 5`,
      width / 2,
      detailBaseline,
    );
    detailBaseline += story ? 112 : 75;
  }

  const review = input.review?.trim();
  if (review && detailBaseline < height - (story ? 410 : 160)) {
    context.fillStyle = COLORS.paper;
    context.globalAlpha = 0.92;
    context.font = `500 ${story ? 29 : 24}px sans-serif`;
    const lines = wrapBrowserText(
      context,
      `“${review}”`,
      width - 190,
      story ? 3 : 2,
    );
    lines.forEach((line, index) =>
      context.fillText(
        line,
        width / 2,
        detailBaseline + index * (story ? 46 : 38),
      ),
    );
    context.globalAlpha = 1;
  }

  drawBrowserFooter(context, input.publicUrl, width, height, input.genreColor);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob && image) {
    return renderBrowserConcertShareCard(input, width, height, false);
  }
  if (!blob) throw new Error('The browser could not export the share card.');
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width,
    height,
  };
}

function loadBrowserImage(uri: string | null): Promise<HTMLImageElement | null> {
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

function drawBrowserCoverImage(
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

function drawBrowserRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function drawBrowserVenueMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  context.beginPath();
  context.arc(x, y - 4, 9, 0, Math.PI * 2);
  context.fillStyle = COLORS.accent;
  context.fill();
  context.beginPath();
  context.arc(x, y - 4, 3, 0, Math.PI * 2);
  context.fillStyle = COLORS.background;
  context.fill();
  context.beginPath();
  context.moveTo(x - 6, y + 3);
  context.lineTo(x, y + 13);
  context.lineTo(x + 6, y + 3);
  context.strokeStyle = COLORS.accent;
  context.lineWidth = 4;
  context.stroke();
}

function drawBrowserFooter(
  context: CanvasRenderingContext2D,
  url: string,
  width: number,
  height: number,
  accent: string,
) {
  const story = height > width;
  const lineY = height - (story ? 270 : 190);
  context.fillStyle = accent;
  context.globalAlpha = 0.72;
  context.fillRect(72, lineY, width - 144, 2);
  context.globalAlpha = 1;

  const qr = createShareQrMatrix(url);
  const qrSize = story ? 174 : 146;
  const qrX = width - qrSize - 78;
  const qrY = height - qrSize - (story ? 78 : 42);
  const quietZone = 4;
  const cellSize = qrSize / (qr.size + quietZone * 2);
  context.fillStyle = COLORS.paper;
  drawBrowserRoundRect(context, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 14);
  context.fill();
  context.fillStyle = COLORS.background;
  for (let row = 0; row < qr.size; row += 1) {
    for (let column = 0; column < qr.size; column += 1) {
      if (qr.data[row * qr.size + column] !== 1) continue;
      context.fillRect(
        qrX + (column + quietZone) * cellSize,
        qrY + (row + quietZone) * cellSize,
        cellSize + 0.4,
        cellSize + 0.4,
      );
    }
  }

  context.textAlign = 'left';
  context.fillStyle = COLORS.paper;
  context.font = `700 ${story ? 42 : 34}px sans-serif`;
  const brandBaseline = height - (story ? 158 : 86);
  context.fillText('iveLive', 78, brandBaseline);
  context.fillStyle = COLORS.muted;
  context.font = '500 18px sans-serif';
  context.fillText('EVERY SHOW HAS A STORY', 80, brandBaseline + (story ? 44 : 35));
  context.font = '500 19px sans-serif';
  context.fillText(
    fitBrowserText(context, url.replace(/^https?:\/\//, ''), 330),
    80,
    height - 23,
  );
}

function wrapBrowserText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      if (lines.length < maxLines - 1) {
        lines.push(line);
        line = word;
      } else {
        lines.push(fitBrowserText(context, `${line} ${word}…`, maxWidth));
        return lines;
      }
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(fitBrowserText(context, line, maxWidth));
  }
  return lines;
}

function fitBrowserText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string {
  if (context.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

async function loadImage(uri: string | null): Promise<SkImage | null> {
  if (!uri) return null;
  try {
    const response = await fetch(uri);
    if (!response.ok) return null;
    return Skia.Image.MakeImageFromEncoded(
      Skia.Data.fromBytes(new Uint8Array(await response.arrayBuffer())),
    );
  } catch {
    return null;
  }
}

function drawBackground(
  canvas: SkCanvas,
  width: number,
  height: number,
  image: SkImage | null,
) {
  const background = makePaint(COLORS.background);
  background.setShader(
    Skia.Shader.MakeLinearGradient(
      Skia.Point(0, 0),
      Skia.Point(width, height),
      [
        Skia.Color('#33232e'),
        Skia.Color(COLORS.background),
        Skia.Color('#0d0b10'),
      ],
      [0, 0.52, 1],
      TileMode.Clamp,
    ),
  );
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), background);

  if (image) {
    const paint = makePaint(COLORS.white, 0.48);
    paint.setImageFilter(Skia.ImageFilter.MakeBlur(34, 34, TileMode.Decal));
    canvas.drawImageRect(
      image,
      coverRect(image, width, height),
      Skia.XYWHRect(0, 0, width, height),
      paint,
    );
    canvas.drawRect(
      Skia.XYWHRect(0, 0, width, height),
      makePaint(COLORS.background, 0.58),
    );
  }
}

function drawCircleImage(
  canvas: SkCanvas,
  image: SkImage,
  x: number,
  y: number,
  diameter: number,
) {
  const clip = Skia.Path.Circle(
    x + diameter / 2,
    y + diameter / 2,
    diameter / 2,
  );
  canvas.save();
  canvas.clipPath(clip, ClipOp.Intersect, true);
  canvas.drawImageRect(
    image,
    coverRect(image, diameter, diameter),
    Skia.XYWHRect(x, y, diameter, diameter),
    makePaint(COLORS.white),
  );
  canvas.restore();
}

function coverRect(image: SkImage, width: number, height: number) {
  const imageAspect = image.width() / image.height();
  const targetAspect = width / height;
  if (imageAspect > targetAspect) {
    const cropWidth = image.height() * targetAspect;
    return Skia.XYWHRect(
      (image.width() - cropWidth) / 2,
      0,
      cropWidth,
      image.height(),
    );
  }
  const cropHeight = image.width() / targetAspect;
  return Skia.XYWHRect(
    0,
    (image.height() - cropHeight) / 2,
    image.width(),
    cropHeight,
  );
}

function drawVenueMark(canvas: SkCanvas, x: number, y: number) {
  const paint = makePaint(COLORS.accent, 1, 4);
  canvas.drawCircle(x, y - 4, 9, paint);
  canvas.drawCircle(x, y - 4, 3, makePaint(COLORS.accent));
  const stem = Skia.Path.Make();
  stem.moveTo(x - 6, y + 3);
  stem.lineTo(x, y + 13);
  stem.lineTo(x + 6, y + 3);
  canvas.drawPath(stem, paint);
}

function drawFooter(
  canvas: SkCanvas,
  url: string,
  width: number,
  height: number,
  accent: string,
) {
  const story = height > WIDTH;
  const lineY = height - (story ? 270 : 190);
  canvas.drawRect(
    Skia.XYWHRect(72, lineY, width - 144, 2),
    makePaint(accent, 0.72),
  );

  const qr = createShareQrMatrix(url);
  const qrSize = story ? 174 : 146;
  const qrX = width - qrSize - 78;
  const qrY = height - qrSize - (story ? 78 : 42);
  const quietZone = 4;
  const cellSize = qrSize / (qr.size + quietZone * 2);
  const whiteBg = makePaint(COLORS.paper);
  canvas.drawRRect(
    Skia.RRectXY(
      Skia.XYWHRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16),
      14,
      14,
    ),
    whiteBg,
  );
  const qrPath = Skia.Path.Make();
  for (let row = 0; row < qr.size; row += 1) {
    for (let column = 0; column < qr.size; column += 1) {
      if (qr.data[row * qr.size + column] !== 1) continue;
      qrPath.addRect(
        Skia.XYWHRect(
          qrX + (column + quietZone) * cellSize,
          qrY + (row + quietZone) * cellSize,
          cellSize + 0.4,
          cellSize + 0.4,
        ),
      );
    }
  }
  canvas.drawPath(qrPath, makePaint(COLORS.background));

  const brandBaseline = height - (story ? 158 : 86);
  drawText(
    canvas,
    'iveLive',
    78,
    brandBaseline,
    makeFont(story ? 42 : 34, FontWeight.Bold),
    makePaint(COLORS.paper),
  );
  drawText(
    canvas,
    'EVERY SHOW HAS A STORY',
    80,
    brandBaseline + (story ? 44 : 35),
    makeFont(18, FontWeight.Medium),
    makePaint(COLORS.muted),
  );
  const shortUrl = fitText(
    url.replace(/^https?:\/\//, ''),
    makeFont(19, FontWeight.Medium),
    330,
  );
  drawText(
    canvas,
    shortUrl,
    80,
    height - 23,
    makeFont(19, FontWeight.Medium),
    makePaint(COLORS.muted),
  );
}

function makeFont(size: number, weight: FontWeight): SkFont {
  const typeface = Skia.FontMgr.System().matchFamilyStyle('sans-serif', {
    weight,
    width: 5,
    slant: 0,
  });
  return Skia.Font(typeface, size);
}

function makePaint(color: string, alpha = 1, strokeWidth?: number): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(alpha);
  if (strokeWidth != null) {
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(strokeWidth);
  }
  return paint;
}

function drawText(
  canvas: SkCanvas,
  value: string,
  x: number,
  baseline: number,
  font: SkFont,
  paint: SkPaint,
  centered = false,
) {
  const drawX = centered ? x - font.measureText(value).width / 2 : x;
  canvas.drawText(value, drawX, baseline, paint, font);
}

function wrapText(
  value: string,
  font: SkFont,
  maxWidth: number,
  maxLines: number,
) {
  const lines: string[] = [];
  let line = '';
  const words = value.trim().split(/\s+/);
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? '';
    const candidate = line ? `${line} ${word}` : word;
    if (font.measureText(candidate).width > maxWidth && line) {
      if (lines.length < maxLines - 1) {
        lines.push(line);
        line = word;
      } else {
        lines.push(fitText(`${line} ${word}…`, font, maxWidth));
        return lines;
      }
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines)
    lines.push(fitText(line, font, maxWidth));
  return lines;
}

function fitText(value: string, font: SkFont, maxWidth: number): string {
  if (font.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length > 1 && font.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function formatConcertDate(value: string) {
  try {
    return format(parseISO(value), 'MMMM d, yyyy');
  } catch {
    return value;
  }
}
