import { onCharacter, PlayerMap } from "@aicore-fivem/lib/server";
import { content } from "./content";
import { drops } from "./drops";
import { log } from "./log";
import { inventories } from "./registry/registry";
import { relayoutAll } from "./registry/relayout";
import { cancelCraft } from "./shop";
import { dropPlayer } from "./use";

/** The character each player has loaded now: a load that finishes after a switch or a drop is thrown away. */
const current = new PlayerMap<number>();

// Also replays the characters already in the world after a restart of this resource, and covers drops.
onCharacter({
  loaded: (source, character) => {
    current.set(source, character.id);
    drops.start(source);
    inventories
      .loadPlayer(
        source,
        character.id,
        () => current.get(source) === character.id,
      )
      .catch((error: unknown) =>
        log.error(
          `loading the inventory of character ${character.id} failed`,
          error,
        ),
      );
  },
  unloaded: (source) => {
    current.delete(source);
    drops.stop(source);
    dropPlayer(source);
    cancelCraft(source);
    inventories
      .unloadPlayer(source)
      .catch((error: unknown) =>
        log.error(`saving the inventory of ${source} failed`, error),
      );
  },
});

// The grid is laid out from item sizes and the column count: re-lay it when either changes in the panel.
content.subscribe((file) => {
  if (file === "items" || file === "settings") relayoutAll(inventories.all());
  // ai-core mirrors item definitions on every client: it reads them again and sends what changed.
  if (file === "items") emit("ai-inventory:itemsChanged");
});
