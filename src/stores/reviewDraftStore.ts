import { create } from 'zustand';

/**
 * OCR 화면 → 독후감 작성 화면으로 추출 문장을 전달하기 위한 임시 저장소.
 * (expo-router 화면 간 데이터 전달용 — 소비 후 비운다)
 */
interface ReviewDraftState {
  quote: string | null;
  setQuote: (q: string | null) => void;
}

export const useReviewDraft = create<ReviewDraftState>((set) => ({
  quote: null,
  setQuote: (quote) => set({ quote }),
}));
