import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; base64: string; width: number; height: number };

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
  return {
    image: {
      uri: asset.uri,
      base64: asset.base64,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
    },
    error: null,
  };
}

/** OCR용 이미지 선택 — 갤러리(원본 해상도, base64 불필요). 좌표 정확도 위해 압축 최소화. */
export async function pickImageForOcr(source: 'library' | 'camera'): Promise<{
  image: PickedImage | null;
  error: string | null;
}> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { image: null, error: source === 'camera' ? '카메라 권한이 필요합니다.' : '사진 접근 권한이 필요합니다.' };
  }
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
  if (result.canceled || !result.assets?.length) {
    return { image: null, error: null };
  }
  const a = result.assets[0];
  return {
    image: { uri: a.uri, base64: a.base64 ?? '', width: a.width ?? 0, height: a.height ?? 0 },
    error: null,
  };
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
    .map((a) => ({
      uri: a.uri,
      base64: a.base64 as string,
      width: a.width ?? 0,
      height: a.height ?? 0,
    }));
  return { images, error: null };
}
