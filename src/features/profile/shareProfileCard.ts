import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  FontWeight,
  ImageFormat,
  Skia,
  type SkCanvas,
  type SkImage,
} from '@shopify/react-native-skia';
import type { ProfileBasics, ProfilePick } from './types';
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
    const response = await fetch(uri);
    if (!response.ok) return null;
    const data = Skia.Data.fromBytes(
      new Uint8Array(await response.arrayBuffer()),
    );
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
  x: number,
  y: number,
  diameter: number,
) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const path = Skia.Path.Make();
  path.addCircle(x + diameter / 2, y + diameter / 2, diameter / 2);
  canvas.save();
  canvas.clipPath(path, 1, true);
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(x, y, diameter, diameter),
    paint,
  );
  canvas.restore();
}

export async function shareProfileCard(
  profile: ProfileBasics,
  picks: ProfilePick[],
) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Sharing is not available on this device.');
  const surface = Skia.Surface.MakeOffscreen(WIDTH, HEIGHT);
  if (!surface) throw new Error('Could not create the profile card.');
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(RAW.wheat));
  const mascotStamp = await loadMascotStamp();

  const background = await loadImage(picks[0]?.image_url);
  if (background) {
    const paint = Skia.Paint();
    paint.setAlphaf(0.22);
    canvas.drawImageRect(
      background,
      Skia.XYWHRect(0, 0, background.width(), background.height()),
      Skia.XYWHRect(0, 0, WIDTH, 560),
      paint,
    );
  }
  const topWash = Skia.Paint();
  topWash.setColor(Skia.Color(RAW.wheat));
  topWash.setAlphaf(0.6);
  canvas.drawRect(Skia.XYWHRect(0, 0, WIDTH, 580), topWash);

  const avatar = await loadImage(profile.avatar_url);
  if (avatar) drawCircleImage(canvas, avatar, 80, 90, 160);
  drawText(
    canvas,
    profile.display_name || profile.username,
    80,
    340,
    64,
    RAW.violet,
    FontWeight.Black,
  );
  drawText(
    canvas,
    `@${profile.username}`,
    84,
    404,
    32,
    RAW.mauve,
    FontWeight.Medium,
  );
  if (profile.bio)
    drawText(
      canvas,
      profile.bio.slice(0, 48),
      84,
      470,
      26,
      RAW.violet,
      FontWeight.Medium,
    );
  drawText(
    canvas,
    'ALL-TIME FAVOURITES',
    80,
    650,
    32,
    RAW.orange,
    FontWeight.Bold,
  );

  const positions = [80, 280, 480, 680, 880];
  for (let index = 0; index < 5; index += 1) {
    const pick = picks[index];
    const x = positions[index] ?? 80;
    const image = await loadImage(pick?.image_url);
    if (image) drawCircleImage(canvas, image, x, 710, 120);
    else {
      const fill = Skia.Paint();
      fill.setColor(Skia.Color(RAW.mauve));
      canvas.drawCircle(x + 60, 770, 60, fill);
    }
    drawText(
      canvas,
      String(index + 1),
      x + 52,
      875,
      26,
      RAW.orange,
      FontWeight.Bold,
    );
    if (pick)
      drawText(
        canvas,
        pick.name.slice(0, 16),
        x,
        920,
        20,
        RAW.violet,
        FontWeight.SemiBold,
      );
  }

  const footer = Skia.Paint();
  footer.setColor(Skia.Color(RAW.orange));
  canvas.drawRect(Skia.XYWHRect(80, 1040, WIDTH - 160, 4), footer);
  drawText(canvas, 'IVE LIVE', 80, 1160, 42, RAW.violet, FontWeight.Black);
  drawText(
    canvas,
    'Every show has a story',
    82,
    1210,
    25,
    RAW.mauve,
    FontWeight.Medium,
  );
  drawMascotStamp(canvas, mascotStamp, WIDTH - 194, 1060, 112, 112, 0.16);

  const snapshot = surface.makeImageSnapshot();
  const file = new File(Paths.cache, `ivelive-profile-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(snapshot.encodeToBytes(ImageFormat.PNG, 100));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'image/png',
    dialogTitle: 'Share profile',
  });
}
