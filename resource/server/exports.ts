import { registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import { forceOpen } from "./api/forceOpen";
import {
  addItem,
  canCarry,
  canCarryAll,
  countItem,
  removeItem,
  setMaxWeight,
  setMetadata,
} from "./api/items";
import { resolve } from "./api/resolve";
import { registerStash } from "./api/stashes";
import { definitionView, itemView } from "./api/views";
import { content } from "./content";
import { scriptShops } from "./scriptShops";
import { registerUsable, type UseHandler } from "./use";

/** ai-inventory's own exports (`exports["ai-inventory"]`); ox_inventory and qb-inventory names are in `compat/`. */
registerExport(
  "AddItem",
  (
    inv: unknown,
    item: unknown,
    count: unknown,
    metadata?: unknown,
    slot?: unknown,
  ) => addItem(inv, item, count, metadata, slot),
);
registerExport(
  "RemoveItem",
  (
    inv: unknown,
    item: unknown,
    count: unknown,
    metadata?: unknown,
    slot?: unknown,
  ) => removeItem(inv, item, count, metadata, slot),
);
registerExport(
  "GetItemCount",
  (inv: unknown, item: unknown, metadata?: unknown) =>
    countItem(inv, item, metadata),
);
registerExport(
  "CanCarryItem",
  (inv: unknown, item: unknown, count: unknown, metadata?: unknown) =>
    canCarry(inv, item, count, metadata),
);
registerExport("CanCarryItems", (inv: unknown, items: unknown) =>
  canCarryAll(inv, items),
);
registerExport("GetWeight", (inv: unknown) => {
  const found = resolve(inv);
  return found ? { weight: found.weight, maxWeight: found.maxWeight } : null;
});
registerExport(
  "SetMetadata",
  (inv: unknown, slot: unknown, metadata: unknown) =>
    setMetadata(inv, slot, metadata),
);
registerExport("SetMaxWeight", (inv: unknown, grams: unknown) =>
  setMaxWeight(inv, grams),
);
registerExport("GetItems", (inv: unknown) =>
  [...(resolve(inv)?.stacks.values() ?? [])].map(itemView),
);
registerExport("RegisterUsableItem", (name: unknown, handler: unknown) => {
  if (typeof name === "string" && typeof handler === "function")
    registerUsable(name, handler as UseHandler);
});
registerExport(
  "RegisterStash",
  (
    name: unknown,
    label: unknown,
    slots: unknown,
    maxWeight: unknown,
    jobs: unknown,
    personal: unknown,
  ) => {
    if (typeof name !== "string") return;
    const jobList = Array.isArray(jobs)
      ? jobs.filter((j): j is string => typeof j === "string")
      : [];
    registerStash(
      name,
      typeof label === "string" ? label : name,
      Number(slots) || 50,
      Number(maxWeight) || 100_000,
      {
        groups: Object.fromEntries(jobList.map((job) => [job, 0])),
        personal: personal === true,
      },
    );
  },
);
registerExport("ClearInventory", (inv: unknown) => {
  const inventory = resolve(inv);
  inventory?.clear();
});
registerExport(
  "OpenInventory",
  (source: unknown, inv: unknown) =>
    typeof source === "number" && forceOpen(source, inv),
);
registerExport(
  "RegisterShop",
  (name: unknown, label: unknown, items: unknown) => {
    if (typeof name !== "string" || name === "" || !Array.isArray(items))
      return;
    const products = (items as unknown[]).flatMap((row) =>
      isRecord(row) &&
      typeof row.name === "string" &&
      typeof row.price === "number" &&
      Number.isInteger(row.price) &&
      row.price >= 0
        ? [{ name: row.name.toLowerCase(), price: row.price }]
        : [],
    );
    scriptShops.register(
      name,
      typeof label === "string" && label !== "" ? label : name,
      products,
    );
  },
);
registerExport(
  "OpenShop",
  (source: unknown, name: unknown) =>
    typeof source === "number" &&
    typeof name === "string" &&
    scriptShops.open(source, name),
);
registerExport("Items", (name?: unknown) =>
  typeof name === "string"
    ? definitionView(name)
    : Object.fromEntries(
        [...content.items.byName.keys()].map((k) => [k, definitionView(k)]),
      ),
);
