/** Net events and callbacks of ai-inventory. Payload types in ./nui. */
export const EVENTS = {
  /** Server -> owner: (view: InventoryView) the loaded character's inventory, once per load. */
  player: "ai-inventory:client:player",
  /** Server -> viewers: (id, put: Stack[], remove: number[], maxWeight) changed stacks of an inventory they see. */
  delta: "ai-inventory:client:delta",
  /** Server -> viewers: (id, columns, rows, maxWeight) the panel changed an inventory's layout (stacks re-laid as is). */
  layout: "ai-inventory:client:layout",
  /** Server -> client: (view: InventoryView, panel: Panel | null) a script opened an inventory for the player. */
  forceOpen: "ai-inventory:client:forceOpen",
  /** Server -> client: (shop: ShopView) a script opened one of its shops for the player (`OpenShop`). */
  scriptShop: "ai-inventory:client:scriptShop",
  /** Server -> client: (view: InventoryView) the player dropped onto the ground panel; the drop shows in its place. */
  ground: "ai-inventory:client:ground",
  /** Server -> client: () the second inventory went away (drop emptied, too far). */
  forceClose: "ai-inventory:client:forceClose",
  /** Server -> players near drops: (reset, put: DropPoint[], remove: string[]) the ground bags around the player (lib `AreaStream`). */
  drops: "ai-inventory:client:drops",
  /** Server -> owner: (weapon: EquippedWeapon | null) equip or holster. */
  weapon: "ai-inventory:client:weapon",
  /** Server -> owner: (hashes: string[]) the held weapon's attachments changed. */
  components: "ai-inventory:client:components",

  /** Client -> server: () the player closed the screen; stop sending the second inventory. */
  close: "ai-inventory:close",
  /** Client -> server: (slot, ammo) ammo left in the held weapon (only lower values are taken). */
  ammo: "ai-inventory:ammo",

  /** Callback: (target: OpenTarget) -> OpenResult. */
  open: "ai-inventory:open",
  /** Callback: (move: MoveInput) -> ActionResult. */
  move: "ai-inventory:move",
  /** Callback: (slot) -> ActionResult; use a stack of the player inventory. */
  use: "ai-inventory:use",
  /** Callback: (slot, count, targetServerId) -> ActionResult. */
  give: "ai-inventory:give",
  /** Callback: (from, slot, count) -> ActionResult; put a stack on the ground. */
  drop: "ai-inventory:drop",
  /** Callback: (shopId, item, count) -> ActionResult. */
  buy: "ai-inventory:buy",
  /** Callback: (benchId, recipeIndex) -> ActionResult. */
  craft: "ai-inventory:craft",
  /** Callback: (slot) -> ActionResult; refill the held weapon from ammo items. */
  reload: "ai-inventory:reload",
  /** Callback: (slot, hash) -> ActionResult; take an attachment off a weapon. */
  detach: "ai-inventory:detach",
} as const;

export type { ActionResult } from "@aicore-fivem/shared";
