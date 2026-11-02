import { useLocalSearchParams } from 'expo-router';
import { ArtistCardRoute } from '../../features/artists/ArtistCardContent';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ArtistCardRoute artistId={id} />;
}