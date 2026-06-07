import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

export type OcrLine = {
  id: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * 온디바이스 ML Kit으로 한국어 텍스트 인식.
 * line 단위로 bounding box(frame)와 함께 반환 → 화면에서 박스 오버레이/색칠 선택에 사용.
 * ※ 네이티브 모듈이라 dev build 에서만 동작(Expo Go ❌).
 */
export async function recognizeKoreanLines(
  uri: string,
): Promise<{ lines: OcrLine[]; error: string | null }> {
  try {
    const result = await TextRecognition.recognize(uri, TextRecognitionScript.KOREAN);
    const lines: OcrLine[] = [];
    result.blocks.forEach((block, bi) => {
      block.lines.forEach((line, li) => {
        if (!line.frame) return;
        lines.push({
          id: `${bi}-${li}`,
          text: line.text,
          left: line.frame.left,
          top: line.frame.top,
          width: line.frame.width,
          height: line.frame.height,
        });
      });
    });
    return { lines, error: null };
  } catch (e) {
    return { lines: [], error: String(e) };
  }
}

/** 선택된 line들을 읽기 순서(위→아래, 좌→우)로 정렬해 한 문장으로 합친다. */
export function combineSelectedLines(lines: OcrLine[], selectedIds: Set<string>): string {
  return lines
    .filter((l) => selectedIds.has(l.id))
    .sort((a, b) => (Math.abs(a.top - b.top) > 10 ? a.top - b.top : a.left - b.left))
    .map((l) => l.text.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
