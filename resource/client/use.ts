import { callAction } from "@aicore-fivem/lib/client";
import { EVENTS } from "common/events";
import { content } from "./content";
import { state } from "./state";
import { weapons } from "./weapons";

/** Uses a stack of the player's inventory (hotbar or screen); attachments send the hash the held weapon takes. */
export async function useItem(slot: number): Promise<void> {
  const stack = state.player?.stacks.find((s) => s.slot === slot);
  const def = stack ? content.items.get(stack.name) : undefined;
  if (!stack || !def) return;
  const weaponHash = weapons.current
    ? GetHashKey(weapons.current.name.toUpperCase())
    : 0;
  const hash =
    def.component && weaponHash
      ? def.component.hashes.find((h) =>
          DoesWeaponTakeWeaponComponent(weaponHash, GetHashKey(h)),
        )
      : undefined;
  await callAction(EVENTS.use, [slot, hash], { fallback: "INV_ERR_GONE" });
}
