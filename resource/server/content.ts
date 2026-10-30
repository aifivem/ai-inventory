import { AdminPanel } from "@aicore-fivem/lib/server";
import { InventoryContent } from "common/content";
import { inventorySchema } from "./schema";

/** The panel store (it owns `data/*.json`) and the parsed items, shops, stashes, benches and settings. */
export const panel = new AdminPanel(inventorySchema);
export const content = new InventoryContent(panel);
