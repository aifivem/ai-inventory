import { isRecord, readVec3 } from "@aicore-fivem/lib/shared";
import { forceOpen } from "../../api/forceOpen";
import { addItem } from "../../api/items";
import { resolve } from "../../api/resolve";
import { createTemporary, registerStash } from "../../api/stashes";
import { definitionView } from "../../api/views";
import { content } from "../../content";
import { drops } from "../../drops";
import { moveStack } from "../../move";
import { inventories } from "../../registry/registry";

/** ox groups: `"police"`, `{ police = 2, ambulance = 0 }` or a list of names -> job -> lowest grade. */
function groupsOf(groups: unknown): Record<string, number> {
  if (typeof groups === "string") return { [groups]: 0 };
  if (Array.isArray(groups))
    return Object.fromEntries(
      groups
        .filter((g): g is string => typeof g === "string")
        .map((g) => [g, 0]),
    );
  if (!isRecord(groups)) return {};
  return Object.fromEntries(
    Object.entries(groups).map(([job, grade]) => [
      job,
      typeof grade === "number" ? grade : 0,
    ]),
  );
}
const toList = (
  items: unknown,
): Array<{ name: unknown; count: unknown; metadata?: unknown }> =>
  Array.isArray(items)
    ? items.map((row) =>
        Array.isArray(row)
          ? { name: row[0], count: row[1], metadata: row[2] }
          : isRecord(row)
            ? { name: row.name, count: row.count, metadata: row.metadata }
            : { name: null, count: 0 },
      )
    : [];

/** ox exports on whole inventories: stashes, temporary ones, drops, opening, clearing, swapping. */
export const inventoryExports: Record<string, (...args: unknown[]) => unknown> =
  {
    RegisterStash: (name, label, slots, maxWeight, owner, groups, coords) => {
      // An object or a Lua vector3 (arrives as an array).
      const c = readVec3(coords) ?? undefined;
      const fixedOwner =
        typeof owner === "string" || typeof owner === "number"
          ? String(owner)
          : undefined;
      registerStash(
        String(name),
        String(label ?? name),
        Number(slots) || 50,
        Number(maxWeight) || 100_000,
        {
          groups: groupsOf(groups),
          personal: owner === true,
          owner: fixedOwner,
          coords: c,
        },
      );
    },
    ClearInventory: (inv, keep) => {
      const inventory = resolve(inv);
      if (!inventory) return;
      const keepList = (Array.isArray(keep) ? keep : keep ? [keep] : []).map(
        (k) => content.items.get(k)?.name,
      );
      for (const stack of inventory.stacks.values())
        if (!keepList.includes(stack.name)) inventory.take(stack.slot);
      drops.check(inventory);
    },
    Items: (name) =>
      typeof name === "string"
        ? definitionView(name)
        : Object.fromEntries(
            [...content.items.byName.keys()].map((k) => [k, definitionView(k)]),
          ),
    ItemList: () =>
      Object.fromEntries(
        [...content.items.byName.keys()].map((k) => [k, definitionView(k)]),
      ),
    forceOpenInventory: (source, type, data) => {
      if (typeof source !== "number") return;
      if (type === "shop")
        return forceOpen(source, null, {
          kind: "shop",
          id: String(isRecord(data) ? data.type : data),
        });
      const id = isRecord(data) ? data : String(data);
      return forceOpen(source, type === "player" ? Number(data) : id);
    },
    CreateTemporaryStash: (props) => {
      const p = isRecord(props) ? props : {};
      return createTemporary(
        "temp",
        String(p.label ?? ""),
        Number(p.slots) || 50,
        Number(p.maxWeight) || 100_000,
        toList(p.items),
      );
    },
    CustomDrop: (prefix, items, coords) => {
      const c = isRecord(coords)
        ? coords
        : Array.isArray(coords)
          ? { x: coords[0], y: coords[1], z: coords[2] }
          : null;
      const x = Number(c?.x);
      const y = Number(c?.y);
      const z = Number(c?.z) + 0.95;
      if (![x, y, z].every(Number.isFinite)) return null;
      const drop = drops.near(x, y, z) ?? drops.create(x, y, z, null);
      for (const item of toList(items))
        addItem(drop.id, item.name, item.count, item.metadata);
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
      const stack =
        typeof fromSlot === "number" ? a?.stacks.get(fromSlot) : undefined;
      if (!a || !b || !stack || typeof toSlot !== "number") return false;
      return moveStack(a, b, {
        from: a.id,
        to: b.id,
        fromSlot: stack.slot,
        toSlot,
        count: stack.count,
        rotated: stack.rotated,
      }).ok;
    },
    GetContainerFromSlot: () => null,
    ConfiscateInventory: () => undefined,
    ReturnInventory: () => undefined,
  };
