import { PlayerMap } from "@aicore-fivem/lib/server";
import type { ShopProduct } from "@aicore-fivem/shared";
import { EVENTS } from "common/events";
import type { ShopView } from "common/nui";
import { content } from "./content";
import { inventories } from "./registry/registry";

/** A shop another script registered (ai-core's inventory layer): products only, no place, opened by the server. */
interface ScriptShop {
  id: string;
  label: string;
  items: ShopProduct[];
}

/** Accounts a script shop is paid from, in order (a panel shop names its own). */
export const SCRIPT_SHOP_ACCOUNTS = ["cash", "bank"];

/**
 * Script shops: registered through the `RegisterShop` export, shown only to a player the server opened one for
 * (`OpenShop`), who may buy from it until the screen closes or another inventory opens.
 */
class ScriptShops {
  private readonly shops = new Map<string, ScriptShop>();
  /** The script shop each player has open. */
  private readonly opened = new PlayerMap<string>();

  register(id: string, label: string, items: ShopProduct[]): void {
    this.shops.set(id, { id, label, items });
  }

  /** Opens a shop on the player's screen; false when it is unknown or the player has no inventory loaded. */
  open(source: number, id: string): boolean {
    const shop = this.shops.get(id);
    if (!shop || !inventories.playerOf(source)) return false;
    inventories.close(source);
    this.opened.set(source, id);
    const view: ShopView = {
      id: shop.id,
      label: shop.label,
      items: shop.items.filter((row) => content.items.get(row.name)),
    };
    emitNet(EVENTS.scriptShop, source, view);
    return true;
  }

  /** The shop if this player has it open now. */
  openFor(source: number, id: string): ScriptShop | undefined {
    return this.opened.get(source) === id ? this.shops.get(id) : undefined;
  }

  close(source: number): void {
    this.opened.delete(source);
  }
}

export const scriptShops = new ScriptShops();
