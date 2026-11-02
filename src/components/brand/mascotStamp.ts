import { Asset } from 'expo-asset';
import { Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';

const mascotStampModule = require('../../../assets/generated/mascot-stamp.png');

export async function loadMascotStamp(): Promise<SkImage> {
  const asset = Asset.fromModule(mascotStampModule);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not load the mascot stamp.');
  const encoded = Skia.Data.fromBytes(
    new Uint8Array(await response.arrayBuffer()),
  );
  try {
    const image = Skia.Image.MakeImageFromEncoded(encoded);
    if (!image) throw new Error('Could not decode the mascot stamp.');
    return image;
  } finally {
    encoded.dispose();
  }
}

export function drawMascotStamp(
  canvas: SkCanvas,
  mascot: SkImage,
  x: number,
  y: number,
  width: number,
  height = width,
  opacity = 1,
) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setAlphaf(opacity);
  canvas.drawImageRect(
    mascot,
    Skia.XYWHRect(0, 0, mascot.width(), mascot.height()),
    Skia.XYWHRect(x, y, width, height),
    paint,
  );
}
