// 성당 레이아웃 타입과 순수 계산 (SPEC §10). Cloudflare 의존 없음.

export interface SeatGroup {
  /** 대문자 1~2자, 성당 안에서 유일 */
  g: string;
  rows: number;
  perRow: number;
  origin: { x: number; z: number };
  dx: number;
  dz: number;
  rowDx: number;
  yaw: number;
}

export interface CandleStand {
  x: number;
  z: number;
  slots: number;
  reach: number;
}

export interface Layout {
  id: string;
  scalePercent: number;
  bounds: { x0: number; x1: number; z0: number; z1: number };
  spawn: { x: number; z: number; r: number };
  seatGroups: SeatGroup[];
  candles: { stands: CandleStand[] };
}

/** 서버가 촛불대 반경(reach)에 더해 주는 여유(m). v3: 1.2 → 5. */
export const CANDLE_REACH_SLACK = 5;

const SEAT_SHAPE_RE = /^[A-Z]{1,2}\d{2}-\d{1,2}$/;

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** 좌석 id가 이 레이아웃에 실제로 있으면 중심 좌표, 아니면 null. */
export function seatPosition(layout: Layout, seat: unknown): { x: number; z: number } | null {
  if (typeof seat !== 'string' || !SEAT_SHAPE_RE.test(seat)) return null;
  const dash = seat.indexOf('-');
  const head = seat.slice(0, dash);
  const g = head.slice(0, head.length - 2);
  const row = parseInt(head.slice(-2), 10);
  const idx = parseInt(seat.slice(dash + 1), 10);
  const group = layout.seatGroups.find((s) => s.g === g);
  if (!group) return null;
  if (row >= group.rows || idx >= group.perRow) return null;
  // 정규 표기만 허용(예: 'L03-02' 거부)
  if (seat !== `${g}${String(row).padStart(2, '0')}-${idx}`) return null;
  return {
    x: round(group.origin.x + group.dx * idx + group.rowDx * row, 4),
    z: round(group.origin.z + group.dz * row, 4),
  };
}

export function isValidSeat(layout: Layout, seat: unknown): seat is string {
  return seatPosition(layout, seat) !== null;
}

export function totalSeats(layout: Layout): number {
  return layout.seatGroups.reduce((s, g) => s + g.rows * g.perRow, 0);
}

export function totalCandleSlots(layout: Layout): number {
  return layout.candles.stands.reduce((s, st) => s + st.slots, 0);
}

/** 전역 슬롯 번호가 속한 촛불대와 그 스탠드의 슬롯 범위 [base, base+stand.slots). 범위 밖이면 null. */
export function standRangeForSlot(
  layout: Layout,
  slot: number,
): { stand: CandleStand; base: number } | null {
  let base = 0;
  for (const st of layout.candles.stands) {
    if (slot >= base && slot < base + st.slots) return { stand: st, base };
    base += st.slots;
  }
  return null;
}

export function seatIds(layout: Layout): string[] {
  const out: string[] = [];
  for (const g of layout.seatGroups) {
    for (let r = 0; r < g.rows; r++) {
      for (let i = 0; i < g.perRow; i++) out.push(`${g.g}${String(r).padStart(2, '0')}-${i}`);
    }
  }
  return out;
}
