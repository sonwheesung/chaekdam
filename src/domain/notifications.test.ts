import {
  isWithinNightWindow,
  shouldSendPush,
  timeStringToMinutes,
} from '@/domain/notifications';

describe('timeStringToMinutes', () => {
  it('HH:MM 을 분으로 변환', () => {
    expect(timeStringToMinutes('00:00')).toBe(0);
    expect(timeStringToMinutes('08:00')).toBe(480);
    expect(timeStringToMinutes('22:30')).toBe(1350);
  });

  it('HH:MM:SS 도 허용 (초는 무시)', () => {
    expect(timeStringToMinutes('22:00:00')).toBe(1320);
  });

  it('잘못된 형식이면 throw', () => {
    expect(() => timeStringToMinutes('abc')).toThrow();
  });
});

describe('isWithinNightWindow', () => {
  // 자정을 넘는 구간: 22:00(1320) ~ 08:00(480)
  const start = 1320;
  const end = 480;

  it('야간 한가운데(02:00)는 true', () => {
    expect(isWithinNightWindow(120, start, end)).toBe(true);
  });

  it('야간 시작 경계(22:00)는 포함', () => {
    expect(isWithinNightWindow(1320, start, end)).toBe(true);
  });

  it('야간 종료 경계(08:00)는 제외', () => {
    expect(isWithinNightWindow(480, start, end)).toBe(false);
  });

  it('낮(15:00)은 false', () => {
    expect(isWithinNightWindow(900, start, end)).toBe(false);
  });

  it('같은 날 구간(01:00~06:00)도 처리', () => {
    expect(isWithinNightWindow(180, 60, 360)).toBe(true); // 03:00
    expect(isWithinNightWindow(30, 60, 360)).toBe(false); // 00:30
    expect(isWithinNightWindow(360, 60, 360)).toBe(false); // 06:00 경계 제외
  });

  it('길이 0 구간은 항상 false', () => {
    expect(isWithinNightWindow(1320, 1320, 1320)).toBe(false);
  });
});

describe('shouldSendPush', () => {
  const base = { nightStart: '22:00', nightEnd: '08:00' };

  it('전체 알림 off면 항상 미발송', () => {
    expect(
      shouldSendPush({ ...base, pushEnabled: false, nightEnabled: true, nowMinutes: 900 }),
    ).toBe(false);
  });

  it('야간 수신 on이면 야간에도 발송', () => {
    expect(
      shouldSendPush({ ...base, pushEnabled: true, nightEnabled: true, nowMinutes: 120 }),
    ).toBe(true);
  });

  it('야간 수신 off + 야간 시간대면 미발송', () => {
    expect(
      shouldSendPush({ ...base, pushEnabled: true, nightEnabled: false, nowMinutes: 120 }),
    ).toBe(false);
  });

  it('야간 수신 off + 낮 시간대면 발송', () => {
    expect(
      shouldSendPush({ ...base, pushEnabled: true, nightEnabled: false, nowMinutes: 900 }),
    ).toBe(true);
  });
});
