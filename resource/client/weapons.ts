import {
  cache,
  callAction,
  Keybind,
  onCache,
  onServerEvent,
} from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/events";
import type { EquippedWeapon } from "common/nui";

const UNARMED = GetHashKey("WEAPON_UNARMED");

function toWeapon(v: unknown): EquippedWeapon | null {
  if (
    !isRecord(v) ||
    typeof v.slot !== "number" ||
    typeof v.name !== "string" ||
    typeof v.ammo !== "number"
  )
    return null;
  return {
    slot: v.slot,
    name: v.name,
    ammo: v.ammo,
    components: Array.isArray(v.components)
      ? v.components.filter((c): c is string => typeof c === "string")
      : [],
  };
}

/**
 * The weapon the server says the player holds: given to the ped with the stored ammo and attachments, ammo going down
 * reported twice a second while held. Weapons from anywhere else are taken away again.
 */
class ClientWeapons {
  current: EquippedWeapon | null = null;
  private hash = 0;
  private reported = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  apply(weapon: EquippedWeapon | null): void {
    const ped = cache.ped;
    if (!weapon) return this.holster();
    const hash = GetHashKey(weapon.name.toUpperCase());
    if (this.current && this.hash !== hash) RemoveWeaponFromPed(ped, this.hash);
    if (this.hash !== hash || !HasPedGotWeapon(ped, hash, false))
      GiveWeaponToPed(ped, hash, 0, false, true);
    SetPedAmmo(ped, hash, weapon.ammo);
    this.setComponents(hash, weapon.components);
    SetCurrentPedWeapon(ped, hash, true);
    this.current = weapon;
    this.hash = hash;
    this.reported = weapon.ammo;
    this.timer ??= setInterval(() => this.report(), 500);
  }

  holster(): void {
    if (this.current) RemoveWeaponFromPed(cache.ped, this.hash);
    SetCurrentPedWeapon(cache.ped, UNARMED, true);
    this.current = null;
    this.hash = 0;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setComponents(hash: number, components: string[]): void {
    for (const component of components)
      GiveWeaponComponentToPed(cache.ped, hash, GetHashKey(component));
    if (this.current) this.current.components = components;
  }

  /** Taking an attachment off removes it from the ped too. */
  syncComponents(components: string[]): void {
    if (!this.current) return;
    for (const old of this.current.components)
      if (!components.includes(old))
        RemoveWeaponComponentFromPed(cache.ped, this.hash, GetHashKey(old));
    this.setComponents(this.hash, components);
  }

  private report(): void {
    if (!this.current) return;
    const ammo = GetAmmoInPedWeapon(cache.ped, this.hash);
    if (ammo >= this.reported) return;
    this.reported = ammo;
    emitNet(EVENTS.ammo, this.current.slot, ammo);
  }

  async reload(): Promise<void> {
    if (!this.current || IsPedReloading(cache.ped)) return;
    const clip = GetMaxAmmoInClip(cache.ped, this.hash, true);
    const want = GetAmmoInPedWeapon(cache.ped, this.hash) + clip;
    await callAction(EVENTS.reload, [Math.min(1000, want)], {
      fallback: "INV_ERR_NO_WEAPON",
    });
  }

  /** A weapon in hand the server did not give (pickups, other scripts) is taken away. */
  guard(weapon: number | false): void {
    if (weapon === false || weapon === UNARMED || weapon === this.hash) return;
    RemoveWeaponFromPed(cache.ped, weapon);
  }
}

export const weapons = new ClientWeapons();

onServerEvent(
  EVENTS.weapon,
  { args: ([raw]) => [toWeapon(raw)] as const },
  (weapon) => weapons.apply(weapon),
);
onServerEvent(
  EVENTS.components,
  {
    args: ([raw]) =>
      Array.isArray(raw)
        ? [raw.filter((c): c is string => typeof c === "string")]
        : null,
  },
  (list) => weapons.syncComponents(list),
);
onCache("weapon", (weapon) => weapons.guard(weapon));

new Keybind({
  name: "inventory_reload",
  description: Locale("KEYBIND_RELOAD"),
  defaultKey: "R",
  onPressed: () => void weapons.reload(),
});
