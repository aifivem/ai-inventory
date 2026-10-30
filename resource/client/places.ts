import { type PlacePed } from "@aicore-fivem/lib/shared";
import {
  hasJob,
  inGang,
  onMembershipChange,
  Points,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import type { Place } from "common/content";
import { content } from "./content";
import { screen } from "./screen";

type Kind = "shop" | "stash" | "bench";
const PROMPT: Record<Kind, "PROMPT_SHOP" | "PROMPT_STASH" | "PROMPT_BENCH"> = {
  shop: "PROMPT_SHOP",
  stash: "PROMPT_STASH",
  bench: "PROMPT_BENCH",
};
const ICON: Record<Kind, string> = {
  shop: "store",
  stash: "box-archive",
  bench: "screwdriver-wrench",
};
const SHOP_BLIP = { sprite: 52, color: 2, scale: 0.7 };

/** Shops, stashes and crafting benches from the panel, a map blip for shops that want one. Rebuilt when the panel changes them. */
const points = new Points();

/** The server's access rule (`server/access.ts`) on the client: a locked place shows only to who may open it. */
function mayUse(
  place: Place & { gangs?: string[]; grades?: Record<string, number> },
): boolean {
  const gangs = place.gangs ?? [];
  if (place.jobs.length === 0 && gangs.length === 0) return true;
  if (gangs.length > 0 && inGang(gangs)) return true;
  const grades = place.grades ?? {};
  return place.jobs.some((job) => hasJob([job], grades[job] ?? 0));
}

function add(
  kind: Kind,
  place: Place,
  blip = false,
  ped?: PlacePed | null,
): void {
  points.add(`${kind}:${place.id}`, {
    coords: { x: place.x, y: place.y, z: place.z },
    label: Locale(PROMPT[kind], place.label),
    icon: ICON[kind],
    radius: place.radius,
    ped: ped ?? undefined,
    blip: blip ? { ...SHOP_BLIP, label: place.label } : undefined,
    canShow: () => mayUse(place),
    onPressed: () => screen.open({ kind, id: place.id }),
  });
}

function rebuild(): void {
  points.clear();
  for (const shop of content.shops.values())
    add("shop", shop, shop.blip, shop.ped);
  for (const stash of content.stashes.values()) add("stash", stash);
  for (const bench of content.benches.values()) add("bench", bench);
}

rebuild();
onMembershipChange(() => points.refresh());
content.subscribe((file) => {
  if (file === "shops" || file === "stashes" || file === "benches") rebuild();
});
