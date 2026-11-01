import type { ItemDef } from "common/items";
import type { InventoryKind, InventoryView, Metadata, Stack } from "common/nui";
import { EVENTS } from "common/events";
import { planAdd, type AddStep } from "./addPlan";
import { SlotDeltas } from "./deltas";
import { SlotGrid } from "./slotGrid";
import { ensureSerial, metaKey } from "./stacks";

/**
 * One inventory in server memory: stacks by anchor slot, the cell occupancy, the weight and who sees it. Every change
 * marks its slots; one delta per tick goes to the viewers (the push lives here, callers never send).
 */
export class Inventory extends SlotGrid {
  readonly viewers = new Set<number>();
  dirty = false;
  /** Kept in memory while idle (stashes a script registered: its exports must find them). */
  pinned = false;
  lastUsed = Date.now();
  private readonly deltas: SlotDeltas = new SlotDeltas(this);

  constructor(
    readonly id: string,
    readonly kind: InventoryKind,
    public label: string,
    columns: number,
    rows: number,
    public maxWeight: number,
    /** Written to the database (player, stash, owned trunk); drops and temporary stashes are not. */
    readonly persistent: boolean,
    stacks: Stack[],
  ) {
    super(columns, rows);
    for (const stack of stacks) this.stacks.set(stack.slot, stack);
    this.rebuild();
  }

  get slots(): number {
    return this.columns * this.rows;
  }

  /** Only player inventories have quick slots. */
  get hasHotbar(): boolean {
    return this.kind === "player";
  }

  /** Takes a new column count, rows and weight limit from the panel; viewers get the new layout (only when it changed). */
  relayout(columns: number, rows: number, maxWeight: number): void {
    const before = `${this.columns}:${this.rows}:${this.maxWeight}`;
    this.columns = columns;
    this.rows = rows;
    this.maxWeight = maxWeight;
    this.rebuild();
    if (`${this.columns}:${this.rows}:${this.maxWeight}` === before) return;
    for (const viewer of this.viewers)
      emitNet(
        EVENTS.layout,
        viewer,
        this.id,
        this.columns,
        this.rows,
        this.maxWeight,
      );
  }

  /** Whether `count` more of an item stays inside the weight limit. */
  weightAllows(def: ItemDef, count: number): boolean {
    return (
      this.maxWeight <= 0 || this.weight + def.weight * count <= this.maxWeight
    );
  }

  /**
   * Plans adding `count` of an item: tops up equal stacks first, then new stacks at free places. Returns the steps or
   * null when it does not all fit (nothing is changed).
   */
  planAdd(
    def: ItemDef,
    count: number,
    metadata: Metadata,
    slot?: number,
  ): AddStep[] | null {
    return planAdd(this, def, count, metadata, slot);
  }

  /** Adds an item all-or-nothing; false when it does not fit. */
  add(
    def: ItemDef,
    count: number,
    metadata: Metadata = {},
    slot?: number,
  ): boolean {
    const plan = this.planAdd(def, count, metadata, slot);
    if (!plan) return false;
    for (const step of plan) {
      const existing = this.stacks.get(step.slot);
      if (existing && !step.fresh)
        this.setCount(step.slot, existing.count + step.add);
      else {
        const meta = structuredClone(metadata);
        ensureSerial(def, meta);
        this.put({
          slot: step.slot,
          name: def.name,
          count: step.add,
          metadata: meta,
          rotated: step.rotated,
        });
      }
    }
    return true;
  }

  /** Removes `count` of an item (from `slot` only when given) all-or-nothing; false when there is not enough. */
  remove(
    name: string,
    count: number,
    metadata?: Metadata,
    slot?: number,
  ): boolean {
    const key = metadata ? metaKey(metadata) : null;
    const from = [...this.stacks.values()].filter(
      (stack) =>
        stack.name === name &&
        (slot === undefined || stack.slot === slot) &&
        (key === null || metaKey(stack.metadata) === key),
    );
    if (from.reduce((sum, stack) => sum + stack.count, 0) < count) return false;
    let left = count;
    for (const stack of from.sort((a, b) => a.count - b.count)) {
      const take = Math.min(left, stack.count);
      this.setCount(stack.slot, stack.count - take);
      left -= take;
      if (left === 0) break;
    }
    return true;
  }

  view(): InventoryView {
    return {
      id: this.id,
      kind: this.kind,
      label: this.label,
      columns: this.columns,
      rows: this.rows,
      maxWeight: this.maxWeight,
      stacks: [...this.stacks.values()],
    };
  }

  protected touch(slot: number): void {
    this.dirty = true;
    this.lastUsed = Date.now();
    this.deltas.touch(slot);
  }
}
