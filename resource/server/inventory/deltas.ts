import { EVENTS } from "common/events";
import type { Stack } from "common/nui";

/** What a delta reads of its inventory when it goes out. */
interface DeltaSource {
  readonly id: string;
  readonly stacks: ReadonlyMap<number, Stack>;
  readonly viewers: ReadonlySet<number>;
  readonly maxWeight: number;
}

/** Slots an inventory changed since its last delta: one delta per tick of them goes to its viewers only. */
export class SlotDeltas {
  private readonly touched = new Set<number>();
  private queued = false;

  constructor(private readonly inventory: DeltaSource) {}

  touch(slot: number): void {
    this.touched.add(slot);
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => this.flush());
  }

  private flush(): void {
    this.queued = false;
    if (this.touched.size === 0) return;
    const put: Stack[] = [];
    const remove: number[] = [];
    for (const slot of this.touched) {
      const stack = this.inventory.stacks.get(slot);
      if (stack) put.push(stack);
      else remove.push(slot);
    }
    this.touched.clear();
    const { id, maxWeight } = this.inventory;
    for (const viewer of this.inventory.viewers)
      emitNet(EVENTS.delta, viewer, id, put, remove, maxWeight);
  }
}
