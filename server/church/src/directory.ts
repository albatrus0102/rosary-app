// Durable Object: 성당 하나의 방 디렉터리(`idFromName(churchId)`). 방 배치와 합산 현황을 맡는다.
// 정책과 계산은 directory_logic.ts(순수)에 있고, 여기는 저장소와 RPC 껍데기만 둔다.
import { DurableObject } from 'cloudflare:workers';
import type { Env } from './index';
import { DirectoryLogic, type ChurchStats, type RoomReport } from './directory_logic';
import type { OtherRooms } from './room_logic';

export class ChurchDirectory extends DurableObject<Env> {
  private logic: DirectoryLogic | null = null;
  private loaded: Promise<unknown> | null = null;

  private async get(churchId: string): Promise<DirectoryLogic> {
    if (!this.logic) {
      this.logic = new DirectoryLogic(churchId);
      this.loaded = this.ctx.storage
        .get('dir')
        .then((s) => this.logic?.restore(s as never))
        .catch(() => {});
    }
    await this.loaded;
    return this.logic;
  }

  /** 새 접속자가 들어갈 방을 정한다. */
  async assign(churchId: string): Promise<{ room: string }> {
    const l = await this.get(churchId);
    return { room: l.assign(Date.now()).room };
  }

  /** 방이 현황을 보고하고, 다른 방들의 합계를 받는다. */
  async report(churchId: string, n: number, r: RoomReport): Promise<OtherRooms> {
    const l = await this.get(churchId);
    const others = l.report(n, r, Date.now());
    if (l.dirty) {
      try {
        await this.ctx.storage.put('dir', l.snapshot());
      } catch {
        // 저장 실패는 다음 보고 때 다시 시도된다.
        l.dirty = true;
      }
    }
    return others;
  }

  async stats(churchId: string): Promise<ChurchStats> {
    const l = await this.get(churchId);
    return l.stats(Date.now());
  }

  async rooms(churchId: string): Promise<Array<{ room: string; peers: number; live: boolean }>> {
    const l = await this.get(churchId);
    return l.roomList(Date.now());
  }
}
