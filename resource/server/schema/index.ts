import type { PanelSchema } from "@aicore-fivem/shared";
import { benchesFile, benchesTab } from "./benches";
import { itemsFile, itemsTab } from "./items";
import { raritiesFile, raritiesTab } from "./rarities";
import { settingsFile, settingsTab } from "./settings";
import { shopsFile, shopsTab } from "./shops";
import { stashesFile, stashesTab } from "./stashes";

/** ai-inventory's panel: item definitions, shops, stashes, crafting benches and grid sizes. */
export const inventorySchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "box-open",
  files: {
    rarities: raritiesFile,
    items: itemsFile,
    shops: shopsFile,
    stashes: stashesFile,
    benches: benchesFile,
    settings: settingsFile,
  },
  tabs: [itemsTab, raritiesTab, shopsTab, stashesTab, benchesTab, settingsTab],
};
