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
