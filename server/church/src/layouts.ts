// 카탈로그: layouts.json(= assets/church/layouts.js 에서 export_layouts.mjs 로 생성) + 폴백.
// Worker/DO 전용(JSON import). RoomLogic 자체는 Layout 객체만 받는다.
import raw from './layouts.json';
import type { Layout } from './layout';
import { BASIC_FALLBACK } from './layouts_fallback'; // 폴백 제거 시 이 줄과 아래 FALLBACK 사용부 삭제

function normalize(input: unknown): Layout[] {
  if (Array.isArray(input)) return input as Layout[];
  if (input && typeof input === 'object') {
    const o = input as Record<string, unknown>;
    for (const key of ['layouts', 'churches']) {
      if (Array.isArray(o[key])) return o[key] as Layout[];
      if (o[key] && typeof o[key] === 'object') return Object.values(o[key] as object) as Layout[];
    }
    if (typeof o.id === 'string' && Array.isArray(o.seatGroups)) return [o as unknown as Layout];
    return Object.values(o) as Layout[];
  }
  return [];
}

const FALLBACK: Layout[] = [BASIC_FALLBACK];

export const LAYOUTS: Record<string, Layout> = {};
for (const l of [...FALLBACK, ...normalize(raw)]) {
  if (l && typeof l.id === 'string' && /^[a-z]+$/.test(l.id)) LAYOUTS[l.id] = l; // json 이 폴백을 덮어쓴다
}

export const CHURCH_IDS: string[] = Object.keys(LAYOUTS);
