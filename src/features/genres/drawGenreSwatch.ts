import {
  ClipOp,
  PaintStyle,
  Skia,
  type SkCanvas,
} from '@shopify/react-native-skia';
import { RAW } from '../../theme/palette';
import { MACRO_GENRES, type MacroGenre } from './macroGenres';

function strokePath(
  canvas: SkCanvas,
  points: readonly [number, number][],
  paint: ReturnType<typeof Skia.Paint>,
  close = false,
) {
  const firstPoint = points[0];
  if (!firstPoint) {
    throw new Error('Genre swatch paths require at least one point.');
  }
  const path = Skia.Path.Make();
  try {
    path.moveTo(firstPoint[0], firstPoint[1]);
    for (const [x, y] of points.slice(1)) path.lineTo(x, y);
    if (close) path.close();
    canvas.drawPath(path, paint);
  } finally {
    path.dispose();
  }
}

export function drawGenreSwatch(
  canvas: SkCanvas,
  slug: string,
  x: number,
  y: number,
  size: number,
  plateColor: string,
  inkColor: string,
) {
  const definition = MACRO_GENRES[slug as MacroGenre] ?? MACRO_GENRES.other;
  const background = Skia.Paint();
  background.setColor(Skia.Color(RAW[definition.inkB]));
  const fill = Skia.Paint();
  fill.setColor(Skia.Color(RAW[definition.inkA]));
  fill.setAntiAlias(true);
  const stroke = Skia.Paint();
  stroke.setColor(Skia.Color(RAW[definition.inkA]));
  stroke.setAntiAlias(true);
  stroke.setStyle(PaintStyle.Stroke);
  stroke.setStrokeWidth(Math.max(1, size * 0.07));
  const plateKeyline = Skia.Paint();
  plateKeyline.setColor(Skia.Color(plateColor));
  plateKeyline.setStyle(PaintStyle.Stroke);
  plateKeyline.setStrokeWidth(1);
  const inkKeyline = Skia.Paint();
  inkKeyline.setColor(Skia.Color(inkColor));
  inkKeyline.setStyle(PaintStyle.Stroke);
  inkKeyline.setStrokeWidth(1);

  const inset = 2;
  const left = x + inset;
  const top = y + inset;
  const innerSize = Math.max(1, size - inset * 2);
  const right = left + innerSize;
  const bottom = top + innerSize;
  const centerX = left + innerSize / 2;
  const centerY = top + innerSize / 2;
  const gap = Math.max(3, innerSize / 3);
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    canvas.drawLine(x1, y1, x2, y2, stroke);

  try {
    canvas.drawRect(Skia.XYWHRect(x, y, size, size), plateKeyline);
    canvas.drawRect(Skia.XYWHRect(left, top, innerSize, innerSize), background);

    canvas.save();
    try {
      canvas.clipRect(
        Skia.XYWHRect(left, top, innerSize, innerSize),
        ClipOp.Intersect,
        true,
      );
      switch (definition.pattern) {
        case 'none':
          canvas.drawRect(Skia.XYWHRect(left, top, innerSize, innerSize), fill);
          break;
        case 'dots':
          for (let dotY = top + gap / 2; dotY < bottom; dotY += gap) {
            for (let dotX = left + gap / 2; dotX < right; dotX += gap) {
              canvas.drawCircle(
                dotX,
                dotY,
                Math.max(1, innerSize * 0.08),
                fill,
              );
            }
          }
          break;
        case 'stripes':
          for (let offset = -innerSize; offset < innerSize * 2; offset += gap) {
            line(left + offset, bottom, left + offset + innerSize, top);
          }
          break;
        case 'checker':
          for (let row = 0; row < 2; row += 1) {
            for (let column = 0; column < 2; column += 1) {
              if ((row + column) % 2 === 0) {
                canvas.drawRect(
                  Skia.XYWHRect(
                    left + (innerSize / 2) * column,
                    top + (innerSize / 2) * row,
                    innerSize / 2,
                    innerSize / 2,
                  ),
                  fill,
                );
              }
            }
          }
          break;
        case 'waves':
          for (let row = 0; row < 3; row += 1) {
            const waveY = top + (innerSize * (row + 0.5)) / 3;
            strokePath(
              canvas,
              [
                [left, waveY],
                [left + innerSize / 4, waveY - gap / 2],
                [left + innerSize / 2, waveY],
                [left + (innerSize * 3) / 4, waveY + gap / 2],
                [right, waveY],
              ],
              stroke,
            );
          }
          break;
        case 'grid':
          for (let offset = gap / 2; offset < innerSize; offset += gap) {
            line(left + offset, top, left + offset, bottom);
            line(left, top + offset, right, top + offset);
          }
          break;
        case 'rays':
          for (const angle of [
            0,
            Math.PI / 4,
            Math.PI / 2,
            (Math.PI * 3) / 4,
          ]) {
            line(
              centerX,
              centerY,
              centerX + Math.cos(angle) * innerSize,
              centerY + Math.sin(angle) * innerSize,
            );
            line(
              centerX,
              centerY,
              centerX - Math.cos(angle) * innerSize,
              centerY - Math.sin(angle) * innerSize,
            );
          }
          break;
        case 'diamonds':
          strokePath(
            canvas,
            [
              [centerX, top],
              [right, centerY],
              [centerX, bottom],
              [left, centerY],
            ],
            stroke,
            true,
          );
          break;
        case 'crosshatch':
          line(left, top, right, bottom);
          line(left, bottom, right, top);
          line(left + gap, top, right, bottom - gap);
          line(left, top + gap, right - gap, bottom);
          break;
        case 'scallops':
          for (let offset = 0; offset < innerSize; offset += gap) {
            strokePath(
              canvas,
              [
                [left + offset, centerY],
                [left + offset + gap / 2, top],
                [Math.min(right, left + offset + gap), centerY],
              ],
              stroke,
            );
          }
          break;
        case 'zigzag':
          strokePath(
            canvas,
            [
              [left, centerY],
              [left + gap / 2, top],
              [left + gap, bottom],
              [left + gap * 1.5, top],
              [right, centerY],
            ],
            stroke,
          );
          break;
        case 'scales':
          for (let offset = gap / 2; offset < innerSize; offset += gap) {
            canvas.drawCircle(left + offset, centerY, gap / 2, stroke);
          }
          break;
        case 'herringbone':
          line(left, top + gap / 2, centerX, centerY);
          line(centerX, centerY, left, bottom - gap / 2);
          line(centerX, top + gap / 2, right, centerY);
          line(right, centerY, centerX, bottom - gap / 2);
          break;
        case 'mesh':
          line(left, top, right, bottom);
          line(left, bottom, right, top);
          line(centerX, top, centerX, bottom);
          line(left, centerY, right, centerY);
          break;
        case 'diagonal_bars':
          stroke.setStrokeWidth(Math.max(2, innerSize * 0.18));
          for (let offset = -innerSize; offset < innerSize * 2; offset += gap) {
            line(left + offset, bottom, left + offset + innerSize, top);
          }
          break;
      }
    } finally {
      canvas.restore();
    }

    canvas.drawRect(Skia.XYWHRect(x, y, size, size), plateKeyline);
    canvas.drawRect(Skia.XYWHRect(left, top, innerSize, innerSize), inkKeyline);
  } finally {
    background.dispose();
    fill.dispose();
    stroke.dispose();
    plateKeyline.dispose();
    inkKeyline.dispose();
  }
}
