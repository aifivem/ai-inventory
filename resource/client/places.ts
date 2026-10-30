import { Points } from "@aicore-fivem/lib/client"
import { Locale } from "common"
import type { Place } from "common/content"
import { content } from "./content"
import { screen } from "./screen"

type Kind = "shop" | "stash" | "bench"
const PROMPT: Record<Kind, "PROMPT_SHOP" | "PROMPT_STASH" | "PROMPT_BENCH"> = {
  shop: "PROMPT_SHOP",
  stash: "PROMPT_STASH",
  bench: "PROMPT_BENCH",
}
const ICON: Record<Kind, string> = {
  shop: "store",
  stash: "box-archive",
  bench: "screwdriver-wrench",
}
const SHOP_BLIP = { sprite: 52, color: 2, scale: 0.7 }

/** Shops, stashes and crafting benches from the panel, a map blip for shops that want one. Rebuilt when the panel changes them. */
const points = new Points()

function add(kind: Kind, place: Place, blip = false): void {
  points.add(`${kind}:${place.id}`, {
    coords: { x: place.x, y: place.y, z: place.z },
    label: Locale(PROMPT[kind], place.label),
    icon: ICON[kind],
    radius: place.radius,
    blip: blip ? { ...SHOP_BLIP, label: place.label } : undefined,
    onPressed: () => screen.open({ kind, id: place.id }),
  })
}

function rebuild(): void {
  points.clear()
  for (const shop of content.shops.values()) add("shop", shop, shop.blip)
  for (const stash of content.stashes.values()) add("stash", stash)
  for (const bench of content.benches.values()) add("bench", bench)
}

rebuild()
content.subscribe((file) => {
  if (file === "shops" || file === "stashes" || file === "benches") rebuild()
})
