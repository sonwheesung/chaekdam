/**
 * 알림 발송 정책 — 순수 함수 (테스트 가능, Edge Function/클라이언트 양쪽에서 재사용).
 * 스펙 §E-12, §5(푸시 알림) 참조.
 */

/** "HH:MM" 또는 "HH:MM:SS" 시간 문자열을 자정 기준 분(0~1439)으로 변환 */
export function timeStringToMinutes(time: string): number {
  const parts = time.split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? 0);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`잘못된 시간 형식: "${time}" (기대: "HH:MM")`);
  }
  return hours * 60 + minutes;
}

/**
 * 주어진 시각(분)이 야간 구간 [start, end) 안에 있는지 판정.
 * 자정을 넘는 구간(예: 22:00~08:00)도 지원한다.
 *
 * @param nowMinutes  현재 시각 (0~1439, 사용자 로컬 기준)
 * @param startMinutes 야간 시작 (분)
 * @param endMinutes   야간 종료 (분)
 */
export function isWithinNightWindow(
  nowMinutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes === endMinutes) {
    return false; // 길이 0 구간 = 야간 없음
  }
  if (startMinutes < endMinutes) {
    // 같은 날 안의 구간 (예: 01:00~06:00)
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // 자정을 넘는 구간 (예: 22:00~08:00)
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export interface PushDecisionInput {
  /** 전체 알림 on/off */
  pushEnabled: boolean;
  /** 야간 알림 수신 여부 (false면 야간 구간 동안 발송 보류) */
  nightEnabled: boolean;
  /** "HH:MM" */
  nightStart: string;
  /** "HH:MM" */
  nightEnd: string;
  /** 현재 시각 (사용자 로컬 분, 0~1439) */
  nowMinutes: number;
}

/**
 * 지금 푸시를 발송해야 하는지 결정.
 * 인앱 알림(notifications 테이블) 적재 여부와는 별개로, "푸시 발송" 여부만 판단한다.
 */
export function shouldSendPush(input: PushDecisionInput): boolean {
  if (!input.pushEnabled) {
    return false;
  }
  if (input.nightEnabled) {
    return true; // 야간에도 수신 허용
  }
  const inNight = isWithinNightWindow(
    input.nowMinutes,
    timeStringToMinutes(input.nightStart),
    timeStringToMinutes(input.nightEnd),
  );
  return !inNight;
}
