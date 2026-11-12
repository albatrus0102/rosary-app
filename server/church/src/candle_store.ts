// 촛불 영속화: Durable Object 저장소(ctx.storage)와 같은 모양의 구조적 인터페이스만 사용한다(테스트에서 가짜 저장소 주입).
import type { StoredCandle } from './room_logic';

export interface StorageLike {
  put(key: string, value: unknown): Promise<void>;
  list(options: { prefix: string }): Promise<Map<string, unknown>>;
}

const PREFIX = 'c:';

export class CandleStore {
  constructor(private readonly storage: StorageLike) {}

  /** 슬롯 하나당 키 하나(`c:<slot>`). 같은 슬롯을 교체하면 덮어쓴다. */
  save(c: StoredCandle): Promise<void> {
    return this.storage.put(PREFIX + c.slot, c);
  }

  async load(): Promise<StoredCandle[]> {
    const m = await this.storage.list({ prefix: PREFIX });
    return [...m.values()] as StoredCandle[];
  }
}

/** 오늘 켜진 초 카운터(`lit` 키 하나). 같은 슬롯을 교체해 촛불 행이 덮어써져도 켠 횟수는 그대로 센다. */
export interface LitStorageLike {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
}

export class LitCounterStore {
  constructor(private readonly storage: LitStorageLike) {}
  async load(): Promise<{ day: string; count: number } | null> {
    const v = (await this.storage.get('lit')) as { day?: unknown; count?: unknown } | undefined;
    return v && typeof v.day === 'string' && typeof v.count === 'number' ? { day: v.day, count: v.count } : null;
  }
  save(state: { day: string; count: number }): Promise<void> {
    return this.storage.put('lit', state);
  }
}
