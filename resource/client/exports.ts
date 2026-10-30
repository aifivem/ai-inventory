import { provideExport, registerExport } from "@aicore-fivem/lib/client";
import { content } from "./content";
import { screen } from "./screen";
import { state } from "./state";
import { useItem } from "./use";
import { weapons } from "./weapons";

/** Client exports: own names, ox_inventory's and qb-inventory's (the common read-only ones and open / close). */

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function itemView(name: string) {
  const def = content.items.get(name);
  return def
    ? {
        name: def.name,
        label: def.label,
        weight: def.weight,
        stack: def.stack > 1,
        close: def.close,
        description: def.description,
      }
    : null;
}

const playerItems = () =>
  (state.player?.stacks ?? []).map((s) => ({
    ...itemView(s.name),
    name: s.name,
    slot: s.slot,
    count: s.count,
    amount: s.count,
    metadata: s.metadata,
    info: s.metadata,
  }));

function search(kind: unknown, items: unknown): unknown {
  const names = Array.isArray(items) ? items : [items];
  const one = (name: unknown) => {
    const def = content.items.get(name);
    if (!def) return kind === "count" ? 0 : [];
    return kind === "count"
      ? state.count(def.name)
      : playerItems().filter((s) => s.name === def.name);
  };
  return names.length === 1
    ? one(names[0])
    : Object.fromEntries(names.map((n) => [String(n), one(n)]));
}

function hasItem(items: unknown, amount: unknown): boolean {
  const need = typeof amount === "number" && amount > 0 ? amount : 1;
  if (typeof items === "string") return state.count(items) >= need;
  if (Array.isArray(items))
    return items.every((n) => typeof n === "string" && state.count(n) >= need);
  if (isObj(items))
    return Object.entries(items).every(
      ([n, c]) => state.count(n) >= (typeof c === "number" ? c : 1),
    );
  return false;
}

function openInventory(type: unknown, data: unknown): void {
  const id = isObj(data)
    ? String(data.id ?? data.type ?? "")
    : String(data ?? "");
  if (type === "stash" || type === "shop") void screen.open({ kind: type, id });
  else if (type === "drop") void screen.open({ kind: "drop", id });
  else void screen.open({ kind: "self" });
}

const ox: Record<string, (...args: unknown[]) => unknown> = {
  openInventory: (type, data) => openInventory(type, data),
  closeInventory: () => screen.close(),
  Search: (kind, items) => search(kind, items),
  GetItemCount: (item) => (typeof item === "string" ? state.count(item) : 0),
  GetPlayerItems: () => playerItems(),
  GetPlayerWeight: () => state.weight(),
  GetPlayerMaxWeight: () => state.player?.maxWeight ?? 0,
  Items: (name) =>
    typeof name === "string"
      ? itemView(name)
      : Object.fromEntries(
          [...content.items.byName.keys()].map((k) => [k, itemView(k)]),
        ),
  useSlot: (slot) =>
    typeof slot === "number" ? void useItem(slot) : undefined,
  getCurrentWeapon: () => weapons.current,
  GetCurrentWeapon: () => weapons.current,
  displayMetadata: () => undefined,
  weaponWheel: () => undefined,
  setStashTarget: () => undefined,
};
for (const [name, fn] of Object.entries(ox))
  provideExport("ox_inventory", name, fn);

const qb: Record<string, (...args: unknown[]) => unknown> = {
  HasItem: (items, amount) => hasItem(items, amount),
  CloseInventory: () => screen.close(),
};
for (const [name, fn] of Object.entries(qb))
  provideExport("qb-inventory", name, fn);

registerExport("OpenInventory", (type: unknown, data: unknown) =>
  openInventory(type, data),
);
registerExport("CloseInventory", () => screen.close());
registerExport("OpenSelf", () => void screen.open({ kind: "self" }));
registerExport("GetItemCount", (item: unknown) =>
  typeof item === "string" ? state.count(item) : 0,
);
registerExport("HasItem", (items: unknown, amount: unknown) =>
  hasItem(items, amount),
);
registerExport("GetPlayerItems", () => playerItems());
