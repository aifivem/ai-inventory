import { EVENTS, type ActionResult } from "common/events";
import type { EquippedWeapon, Stack } from "common/nui";
import { content } from "./content";
import { inventories } from "./registry";

const fail = (error: string): ActionResult => ({ ok: false, error });
const ammoOf = (stack: Stack): number =>
  typeof stack.metadata.ammo === "number" ? stack.metadata.ammo : 0;
const componentsOf = (stack: Stack): string[] =>
  Array.isArray(stack.metadata.components)
    ? stack.metadata.components.filter(
        (c): c is string => typeof c === "string",
      )
    : [];

/**
 * The weapon each player holds: which stack (by serial), its ammo in metadata. The client reports ammo going down;
 * ammo only goes up through `reload` on the server.
 */
class Weapons {
  private readonly held = new Map<number, { name: string; serial: string }>();

  /** The held weapon's stack in the player's inventory, found again by serial (it may have moved). */
  stackOf(source: number): Stack | undefined {
    const held = this.held.get(source);
    const inventory = inventories.playerOf(source);
    if (!held || !inventory) return undefined;
    for (const stack of inventory.stacks.values())
      if (
        stack.name === held.name &&
        (stack.metadata.serial ?? stack.name) === held.serial
      )
        return stack;
    return undefined;
  }

  private send(source: number, stack: Stack | undefined): void {
    const weapon: EquippedWeapon | null = stack
      ? {
          slot: stack.slot,
          name: stack.name,
          ammo: content.items.get(stack.name)?.weapon?.throwable
            ? stack.count
            : ammoOf(stack),
          components: componentsOf(stack),
        }
      : null;
    emitNet(EVENTS.weapon, source, weapon);
  }

  /** Using a weapon: hold it, or put it away when it is the one in hand. */
  toggle(source: number, stack: Stack): void {
    const current = this.stackOf(source);
    if (current?.slot === stack.slot) return this.holster(source);
    this.held.set(source, {
      name: stack.name,
      serial:
        typeof stack.metadata.serial === "string"
          ? stack.metadata.serial
          : stack.name,
    });
    this.send(source, stack);
  }

  holster(source: number): void {
    if (!this.held.delete(source)) return;
    this.send(source, undefined);
  }

  /** After any change to the player's inventory: a held weapon that left it is put away. */
  check(source: number): void {
    if (this.held.has(source) && !this.stackOf(source)) this.holster(source);
  }

  /** Ammo the client reports for its held weapon; only lower values count (a throwable's count is its stack). */
  reportAmmo(source: number, slot: number, ammo: number): void {
    const stack = this.stackOf(source);
    const inventory = inventories.playerOf(source);
    if (!stack || !inventory || stack.slot !== slot) return;
    if (content.items.get(stack.name)?.weapon?.throwable) {
      if (ammo < stack.count) inventory.setCount(slot, ammo);
      if (ammo <= 0) this.holster(source);
      return;
    }
    if (ammo < ammoOf(stack))
      inventory.setMetadata(slot, { ...stack.metadata, ammo });
  }

  /** Fills the held weapon up to `want` rounds from its ammo items. */
  reload(source: number, want: number): ActionResult {
    const stack = this.stackOf(source);
    const inventory = inventories.playerOf(source);
    const ammoItem = stack
      ? content.items.get(stack.name)?.weapon?.ammo
      : undefined;
    if (!stack || !inventory || !ammoItem) return fail("INV_ERR_NO_WEAPON");
    const need = Math.max(0, want - ammoOf(stack));
    const take = Math.min(need, inventory.count(ammoItem));
    if (take <= 0) return fail("INV_ERR_NO_AMMO");
    inventory.remove(ammoItem, take);
    inventory.setMetadata(stack.slot, {
      ...stack.metadata,
      ammo: ammoOf(stack) + take,
    });
    this.send(source, stack);
    return { ok: true };
  }

  /** Puts an attachment item on the held weapon (`hash` is the one the client found the weapon takes). */
  attach(source: number, item: Stack, hash: string): ActionResult {
    const weapon = this.stackOf(source);
    const inventory = inventories.playerOf(source);
    const def = content.items.get(item.name);
    if (!weapon || !inventory) return fail("INV_ERR_NO_WEAPON");
    if (!def?.component?.hashes.includes(hash)) return fail("INV_ERR_NOT_FIT");
    const components = componentsOf(weapon);
    if (components.includes(hash)) return fail("INV_ERR_HAS_COMPONENT");
    inventory.setCount(item.slot, item.count - 1);
    inventory.setMetadata(weapon.slot, {
      ...weapon.metadata,
      components: [...components, hash],
    });
    emitNet(EVENTS.components, source, [...components, hash]);
    return { ok: true };
  }

  /** Takes an attachment off a weapon in the player's inventory and gives its item back. */
  detach(source: number, slot: number, hash: string): ActionResult {
    const inventory = inventories.playerOf(source);
    const weapon = inventory?.stacks.get(slot);
    if (!inventory || !weapon) return fail("INV_ERR_GONE");
    const components = componentsOf(weapon);
    const def = [...content.items.byName.values()].find((item) =>
      item.component?.hashes.includes(hash),
    );
    if (!components.includes(hash) || !def) return fail("INV_ERR_GONE");
    if (!inventory.add(def, 1)) return fail("INV_ERR_NO_SPACE");
    const left = components.filter((c) => c !== hash);
    inventory.setMetadata(slot, { ...weapon.metadata, components: left });
    if (this.stackOf(source)?.slot === slot)
      emitNet(EVENTS.components, source, left);
    return { ok: true };
  }

  drop(source: number): void {
    this.held.delete(source);
  }
}

export const weapons = new Weapons();
