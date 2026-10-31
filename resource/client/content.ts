import { AdminWorld } from "@aicore-fivem/lib/client";
import { FILES, InventoryContent } from "common/content";
import type { BenchView, ItemView, ShopView } from "common/nui";

/** Items, shops, stashes, benches and settings as the panel has them now (cached files, then live changes). */
export const world = new AdminWorld([...FILES]);
export const content = new InventoryContent(world);

export function itemViews(): ItemView[] {
  return [...content.items.byName.values()].map((d) => ({
    name: d.name,
    label: d.label,
    description: d.description,
    weight: d.weight,
    w: d.size.w,
    h: d.size.h,
    stack: d.stack,
    type: d.type,
    usable: d.usable,
    image: d.image,
    hashes: d.component?.hashes ?? [],
    rarity: content.rarities.get(d.rarity) ?? "",
  }));
}

export function shopView(id: string): ShopView | null {
  const shop = content.shops.get(id);
  return shop
    ? {
        id: shop.id,
        label: shop.label,
        items: shop.items.filter((row) => content.items.get(row.name)),
      }
    : null;
}

export function benchView(id: string): BenchView | null {
  const bench = content.benches.get(id);
  return bench
    ? { id: bench.id, label: bench.label, recipes: bench.recipes }
    : null;
}
