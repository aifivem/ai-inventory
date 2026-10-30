import { resourceExport } from "@aicore-fivem/lib/server";
import { CORE, type CharacterInfo } from "@aicore-fivem/shared";
import { EVENTS } from "common/events";
import { content } from "./content";
import { drops } from "./drops";
import { log } from "./log";
import { inventories } from "./registry";
import { cancelCraft } from "./shop";
import { dropPlayer } from "./use";

const core = resourceExport("ai-core");

function load(source: number, character: CharacterInfo): void {
  emitNet(EVENTS.drops, source, drops.points());
  inventories
    .loadPlayer(
      source,
      character.id,
      () => core.GetCharacter(source)?.id === character.id,
    )
    .catch((error: unknown) =>
      log.error(
        `loading the inventory of character ${character.id} failed`,
        error,
      ),
    );
}

function unload(source: number): void {
  dropPlayer(source);
  cancelCraft(source);
  inventories
    .unloadPlayer(source)
    .catch((error: unknown) =>
      log.error(`saving the inventory of ${source} failed`, error),
    );
}

on(CORE.playerLoadedEvent, (source: number, character: CharacterInfo) =>
  load(source, character),
);
on(CORE.playerUnloadedEvent, (source: number) => unload(source));
on("playerDropped", () => unload(Number(globalThis.source)));

// The grid is laid out from item sizes and the column count: re-lay it when either changes in the panel.
content.subscribe((file) => {
  if (file === "items" || file === "settings") inventories.rebuildAll();
});

/** After a restart of this resource: inventories of the players already in the game. */
export function restoreOnline(): void {
  for (const source of core.GetLoadedSources()) {
    const character = core.GetCharacter(source);
    if (character) load(source, character);
  }
}
