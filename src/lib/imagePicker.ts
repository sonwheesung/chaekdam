import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; base64: string };

/**
 * 갤러리에서 이미지 1장 선택 (base64 포함). 권한 거부/취소 시 null.
 * quality 로 압축해 업로드 용량을 줄인다.
 */
export async function pickImageFromLibrary(): Promise<{
  image: PickedImage | null;
  error: string | null;
}> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { image: null, error: '사진 접근 권한이 필요합니다.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: true,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.length) {
    return { image: null, error: null };
  }
  const asset = result.assets[0];
  if (!asset.base64) {
    return { image: null, error: '이미지를 불러오지 못했습니다.' };
  }
  return { image: { uri: asset.uri, base64: asset.base64 }, error: null };
}

/** 갤러리에서 여러 장 선택 (독후감 첨부용). */
export async function pickImagesFromLibrary(limit = 5): Promise<{
  images: PickedImage[];
  error: string | null;
}> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { images: [], error: '사진 접근 권한이 필요합니다.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: true,
    allowsMultipleSelection: true,
    selectionLimit: limit,
  });
  if (result.canceled || !result.assets?.length) {
    return { images: [], error: null };
  }
  const images = result.assets
    .filter((a) => a.base64)
    .map((a) => ({ uri: a.uri, base64: a.base64 as string }));
  return { images, error: null };
}
