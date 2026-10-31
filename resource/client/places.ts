import {
  RecordObjects,
  type BlipStyle,
  type PlacePed,
} from "@aicore-fivem/lib/shared";
import { allows, onMembershipChange, Points } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { readBench, readShop, readStash, type Place } from "common/content";
import { world } from "./content";
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

/**
 * Shops, stashes and crafting benches from the panel, a map blip for shops that want one. An edited record rebuilds
 * only its own point; a locked place shows only to who may open it (the server's `online.allows` decides the same).
 */
const points = new Points();

function add(
  kind: Kind,
  id: string,
  place: Place,
  blip?: BlipStyle | null,
  ped?: PlacePed | null,
): () => void {
  const key = `${kind}:${id}`;
  points.add(key, {
    coords: { x: place.x, y: place.y, z: place.z },
    label: Locale(PROMPT[kind], place.label),
    icon: ICON[kind],
    radius: place.radius,
    ped: ped ?? undefined,
    blip: blip ? { ...blip, label: place.label } : undefined,
    canShow: () => allows(place.access),
    onPressed: () => screen.open({ kind, id }),
  });
  return () => points.remove(key);
}

new RecordObjects(world, "shops", readShop, (id, shop) =>
  add("shop", id, shop, shop.blip ? shop.blipStyle : null, shop.ped),
);
new RecordObjects(world, "stashes", readStash, (id, stash) =>
  add("stash", id, stash),
);
new RecordObjects(world, "benches", readBench, (id, bench) =>
  add("bench", id, bench),
);
onMembershipChange(() => points.refresh());
