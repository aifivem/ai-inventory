import { callAction, onServerEvent, progress } from "@aicore-fivem/lib/client";
import { isRecord, readFinite, readId } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/events";
import type { PendingUse } from "common/nui";
import { content } from "./content";
import { state } from "./state";
import { weapons } from "./weapons";

const ANIMS: Record<string, { dict: string; clip: string; flag: number }> = {
  eat: {
    dict: "mp_player_inteat@burger",
    clip: "mp_player_int_eat_burger",
    flag: 49,
  },
  drink: { dict: "mp_player_intdrink", clip: "loop_bottle", flag: 49 },
  bandage: {
    dict: "missheistdockssetup1clipboard@idle_a",
    clip: "idle_a",
    flag: 49,
  },
  armour: { dict: "clothingshirt", clip: "try_shirt_positive_d", flag: 49 },
};

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

/** Plays the use animation with ai-core's progress bar (getting into a vehicle or dying cancels), then reports it. */
async function play(use: PendingUse): Promise<void> {
  const done = await progress({
    label: Locale("UI_USING", content.items.get(use.name)?.label ?? use.name),
    duration: use.time,
    anim: ANIMS[use.anim],
  });
  if (!done) return void emitNet(EVENTS.cancelUse);
  await callAction(EVENTS.finishUse, [use.token], {
    fallback: "INV_ERR_GONE",
  });
}

onServerEvent(
  EVENTS.startUse,
  {
    args: ([raw]) => {
      if (!isRecord(raw) || typeof raw.name !== "string") return null;
      const token = readId(raw.token);
      const time = readFinite(raw.time);
      return token === null || time === null
        ? null
        : [
            {
              token,
              name: raw.name,
              anim: typeof raw.anim === "string" ? raw.anim : "none",
              time,
            },
          ];
    },
  },
  (use) => void play(use),
);
