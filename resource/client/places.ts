import { hidePrompt, onPromptPressed, showPrompt, Zones } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import type { Place } from "common/content";
import { content } from "./content";
import { screen } from "./screen";

type Kind = "shop" | "stash" | "bench";
const PROMPT: Record<Kind, "PROMPT_SHOP" | "PROMPT_STASH" | "PROMPT_BENCH"> = { shop: "PROMPT_SHOP", stash: "PROMPT_STASH", bench: "PROMPT_BENCH" };
const BLIP_TEXT = "AIINV_BLIP_SHOP";

/**
 * Shops, stashes and crafting benches from the panel: a sphere zone each (checked twice a second) showing ai-core's
 * prompt, and a map blip for shops that want one. Rebuilt when the panel changes them.
 */
class Places {
  private readonly zones = new Zones();
  private blips: number[] = [];

  rebuild(): void {
    this.zones.clear();
    for (const blip of this.blips) RemoveBlip(blip);
    this.blips = [];
    for (const shop of content.shops.values()) {
      this.add("shop", shop);
      if (shop.blip) this.blips.push(this.blip(shop));
    }
    for (const stash of content.stashes.values()) this.add("stash", stash);
    for (const bench of content.benches.values()) this.add("bench", bench);
  }

  private add(kind: Kind, place: Place): void {
    const id = `${kind}:${place.id}`;
    this.zones.add(id, {
      shape: { type: "sphere", center: { x: place.x, y: place.y, z: place.z }, radius: place.radius },
      interval: 500,
      onEnter: () => showPrompt(id, Locale(PROMPT[kind], place.label)),
      onExit: () => hidePrompt(id),
    });
  }

  private blip(place: Place): number {
    const blip = AddBlipForCoord(place.x, place.y, place.z);
    SetBlipSprite(blip, 52);
    SetBlipColour(blip, 2);
    SetBlipScale(blip, 0.7);
    SetBlipAsShortRange(blip, true);
    BeginTextCommandSetBlipName(BLIP_TEXT);
    AddTextComponentSubstringPlayerName(place.label);
    EndTextCommandSetBlipName(blip);
    return blip;
  }
}

AddTextEntry(BLIP_TEXT, "~a~");
const places = new Places();
places.rebuild();
content.subscribe((file) => {
  if (file === "shops" || file === "stashes" || file === "benches") places.rebuild();
});

onPromptPressed((id) => {
  const [kind, key] = id.split(":");
  if (!key) return;
  if (kind === "shop" || kind === "stash" || kind === "bench") void screen.open({ kind, id: key });
});
