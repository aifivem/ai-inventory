import { isRecord } from "@aicore-fivem/lib/shared";
import { provideExport } from "@aicore-fivem/lib/server";
import { addItem, canCarry, countItem, createTemporary, definitionView, forceOpen, itemView, registerStash, removeItem, resolve, setMetadata, stacksOf } from "../api";
import { content } from "../content";
import { drops } from "../drops";
import { moveStack } from "../move";
import { inventories } from "../registry";

/**
 * ox_inventory's server exports (`provide 'ox_inventory'`), tested against ox_inventory 2.44. Inventories are named
 * as in ox: a source, a stash name, `{ id, owner }`. Not answered: hooks (`registerHook`), `UpdateVehicle`, `Keyboard`.
 */

const R = "ox_inventory";
const jobsOf = (groups: unknown): string[] => (typeof groups === "string" ? [groups] : isRecord(groups) ? Object.keys(groups) : []);
const toList = (items: unknown): Array<{ name: unknown; count: unknown; metadata?: unknown }> =>
  Array.isArray(items)
    ? items.map((row) => (Array.isArray(row) ? { name: row[0], count: row[1], metadata: row[2] } : isRecord(row) ? { name: row.name, count: row.count, metadata: row.metadata } : { name: null, count: 0 }))
    : [];

function inventoryView(inv: unknown) {
  const inventory = resolve(inv);
  if (!inventory) return null;
  const items: Record<number, ReturnType<typeof itemView>> = {};
  for (const stack of inventory.stacks.values()) items[stack.slot] = itemView(stack);
  return { id: inventory.id, label: inventory.label, type: inventory.kind, slots: inventory.slots, weight: inventory.weight, maxWeight: inventory.maxWeight, items };
}

const exportsMap: Record<string, (...args: unknown[]) => unknown> = {
  AddItem: (inv, item, count, metadata, slot, cb) => {
    const ok = addItem(inv, item, count, metadata, slot);
    if (typeof cb === "function") cb(ok, ok ? null : "inventory_full");
    return ok ? [true, null] : [false, "inventory_full"];
  },
  RemoveItem: (inv, item, count, metadata, slot) => removeItem(inv, item, count, metadata, slot),
  GetItem: (inv, item, metadata, returnsCount) => {
    const def = definitionView(String(item));
    if (!def) return null;
    const count = countItem(inv, item, metadata);
    return returnsCount ? count : { ...def, count };
  },
  GetItemCount: (inv, item, metadata) => countItem(inv, item, metadata),
  Search: (inv, search, items, metadata) => {
    const inventory = resolve(inv);
    if (!inventory) return false;
    const names = Array.isArray(items) ? items : [items];
    const one = (name: unknown) => (search === "count" ? countItem(inventory.id, name, metadata) : stacksOf(inventory, name, metadata).map(itemView));
    if (names.length === 1) return one(names[0]);
    return Object.fromEntries(names.map((name) => [String(name), one(name)]));
  },
  CanCarryItem: (inv, item, count, metadata) => canCarry(inv, item, count, metadata),
  CanCarryWeight: (inv, weight) => {
    const inventory = resolve(inv);
    return Boolean(inventory && typeof weight === "number" && (inventory.maxWeight <= 0 || inventory.weight + weight <= inventory.maxWeight));
  },
  CanCarryAmount: (inv, item) => {
    const inventory = resolve(inv);
    const def = content.items.get(item);
    if (!inventory || !def || def.weight <= 0) return inventory && def ? def.stack : 0;
    return Math.max(0, Math.floor((inventory.maxWeight - inventory.weight) / def.weight));
  },
  GetInventory: (inv) => inventoryView(inv),
  GetInventoryItems: (inv) => inventoryView(inv)?.items ?? null,
  GetSlot: (inv, slot) => {
    const stack = typeof slot === "number" ? resolve(inv)?.stacks.get(slot) : undefined;
    return stack ? itemView(stack) : null;
  },
  GetSlotWithItem: (inv, item, metadata) => {
    const inventory = resolve(inv);
    const stack = inventory ? stacksOf(inventory, item, metadata)[0] : undefined;
    return stack ? itemView(stack) : null;
  },
  GetSlotsWithItem: (inv, item, metadata) => {
    const inventory = resolve(inv);
    return inventory ? stacksOf(inventory, item, metadata).map(itemView) : [];
  },
  GetSlotIdWithItem: (inv, item, metadata) => {
    const inventory = resolve(inv);
    return (inventory && stacksOf(inventory, item, metadata)[0]?.slot) ?? null;
  },
  GetSlotIdsWithItem: (inv, item, metadata) => {
    const inventory = resolve(inv);
    return inventory ? stacksOf(inventory, item, metadata).map((s) => s.slot) : [];
  },
  GetEmptySlot: (inv) => resolve(inv)?.grid.findPlace({ w: 1, h: 1 })?.slot ?? null,
  SetMetadata: (inv, slot, metadata) => setMetadata(inv, slot, metadata),
  SetDurability: (inv, slot, durability) => {
    const stack = typeof slot === "number" ? resolve(inv)?.stacks.get(slot) : undefined;
    return stack ? setMetadata(inv, slot, { ...stack.metadata, durability }) : false;
  },
  SetMaxWeight: (inv, weight) => {
    const inventory = resolve(inv);
    if (inventory && typeof weight === "number") inventory.maxWeight = weight;
  },
  RegisterStash: (name, label, slots, maxWeight, owner, groups, coords) => {
    const c = isRecord(coords) && typeof coords.x === "number" ? { x: coords.x, y: Number(coords.y), z: Number(coords.z) } : undefined;
    registerStash(String(name), String(label ?? name), Number(slots) || 50, Number(maxWeight) || 100_000, jobsOf(groups), owner === true, c);
  },
  ClearInventory: (inv, keep) => {
    const inventory = resolve(inv);
    if (!inventory) return;
    const keepList = (Array.isArray(keep) ? keep : keep ? [keep] : []).map((k) => content.items.get(k)?.name);
    for (const stack of inventory.stacks.values()) if (!keepList.includes(stack.name)) inventory.take(stack.slot);
    drops.check(inventory);
  },
  Items: (name) => (typeof name === "string" ? definitionView(name) : Object.fromEntries([...content.items.byName.keys()].map((k) => [k, definitionView(k)]))),
  ItemList: () => Object.fromEntries([...content.items.byName.keys()].map((k) => [k, definitionView(k)])),
  forceOpenInventory: (source, type, data) => {
    if (typeof source !== "number") return;
    if (type === "shop") return forceOpen(source, null, { kind: "shop", id: String(isRecord(data) ? data.type : data) });
    const id = isRecord(data) ? data : String(data);
    return forceOpen(source, type === "player" ? Number(data) : id);
  },
  CreateTemporaryStash: (props) => {
    const p = isRecord(props) ? props : {};
    return createTemporary("temp", String(p.label ?? ""), Number(p.slots) || 50, Number(p.maxWeight) || 100_000, toList(p.items));
  },
  CustomDrop: (prefix, items, coords) => {
    const c = isRecord(coords) ? coords : Array.isArray(coords) ? { x: coords[0], y: coords[1], z: coords[2] } : null;
    if (!c) return null;
    const drop = drops.at(Number(c.x), Number(c.y), Number(c.z) + 0.95);
    for (const item of toList(items)) addItem(drop.id, item.name, item.count, item.metadata);
    return drop.id;
  },
  RemoveInventory: (inv) => {
    const inventory = resolve(inv);
    if (!inventory || inventory.kind === "player") return;
    if (inventory.kind === "drop") drops.remove(inventory.id);
    else inventories.remove(inventory.id);
  },
  SwapSlots: (fromInv, toInv, fromSlot, toSlot) => {
    const a = resolve(fromInv);
    const b = resolve(toInv);
    const stack = typeof fromSlot === "number" ? a?.stacks.get(fromSlot) : undefined;
    if (!a || !b || !stack || typeof toSlot !== "number") return false;
    return moveStack(a, b, { from: a.id, to: b.id, fromSlot: stack.slot, toSlot, count: stack.count, rotated: stack.rotated }).ok;
  },
  GetContainerFromSlot: () => null,
  ConfiscateInventory: () => undefined,
  ReturnInventory: () => undefined,
};

for (const [name, fn] of Object.entries(exportsMap)) provideExport(R, name, fn);
