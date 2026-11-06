import * as ImagePicker from 'expo-image-picker';
import { addPhoto, createMemo } from './actions';
import { fastLocation } from './location';

/** Opens the system camera or gallery. Returns the new memo id, or null if the user cancelled. */
export async function newPhotoMemo(source: 'camera' | 'library'): Promise<string | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('CAMERA_DENIED');
  }
  // Start the location lookup now so the memo carries where the picture was made.
  const loc = fastLocation(1000);
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: true });
  if (result.canceled || result.assets.length === 0) return null;
  const location = await loc;
  const memoId = await createMemo(source === 'camera' ? 'photo' : 'image', location);
  await addPhoto(memoId, result.assets[0], source, location);
  return memoId;
}
