import { provideExport } from "@aicore-fivem/lib/server";
import { inventoryExports } from "./inventories";
import { itemExports } from "./items";

/**
 * ox_inventory's server exports (`provide 'ox_inventory'`), tested against ox_inventory 2.44. Inventories are named
 * as in ox: a source, a stash name, `{ id, owner }`. Not answered: hooks (`registerHook`), `UpdateVehicle`, `Keyboard`.
 */

const R = "ox_inventory";

const exportsMap = { ...itemExports, ...inventoryExports };

for (const [name, fn] of Object.entries(exportsMap)) provideExport(R, name, fn);
