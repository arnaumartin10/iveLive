export type CloudSound = 'stamp' | 'tick' | 'whoosh' | 'paper';

const soundAssets: Record<CloudSound, number | null> = {
  stamp: null,
  tick: null,
  whoosh: null,
  paper: null,
};

const players = new Map<
  CloudSound,
  import('expo-audio').AudioPlayer
>();

export async function playCloudSound(
  sound: CloudSound,
  enabled: boolean,
  reduceMotion: boolean,
): Promise<void> {
  const asset = soundAssets[sound];
  if (!enabled || reduceMotion || asset == null) return;

  try {
    let player = players.get(sound);
    if (!player) {
      const { createAudioPlayer } = await import('expo-audio');
      player = createAudioPlayer(asset, { updateInterval: 0 });
      players.set(sound, player);
    }

    await player.seekTo(0);
    player.play();
  } catch (error) {
    console.warn(`[cloud] Unable to play the ${sound} sound.`, error);
  }
}
