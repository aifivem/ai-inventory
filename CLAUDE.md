# ai-inventory

Grid inventory: items have a size in cells and can be turned; player inventory, ground drops, stashes, vehicle trunk and glovebox, shops, crafting benches, weapons (ammo in metadata, basic attachments), usable items. Depends on ai-core (characters, money, jobs, gangs, prompts, admin panel) and its own table through `@aicore-fivem/mysql`. Stands in for `ox_inventory` and `qb-inventory`.

## Decisions

- Cells are slots: a stack sits at its top-left cell (`slot`, 1-based, row-major) and covers `w x h` cells, so slot-based APIs (ox, qb) keep working. Placement rules live once in `resource/common/grid.ts` (server authority, NUI highlight).
- Every inventory has the panel's column count; only rows and the weight limit differ. Changing the column count re-lays stored items (overlaps are possible, the panel hint says so).
- Server memory is the truth (`server/registry.ts`): player inventories with the character, stashes and trunks loaded on first open and unloaded after 5 idle minutes, drops and temporary stashes never stored. A dirty flush every 30 s writes one multi-row upsert; also on unload, resource stop and txAdmin shutdown.
- Every change goes through `Inventory` (`server/inventory.ts`), which sends one delta per tick of the touched slots to the inventory's viewers. Callers never push.
- Client actions pass `reachable()` (`server/access.ts`): only the player's own inventory or the one he has open, re-checked against its point / vehicle on every action.
- Trunk and glovebox ids are the plate; they are stored only when the vehicle has the `ai:owned` state bag (a vehicles resource sets it).
- Items, shops, stashes, benches and settings are panel content, all `sync: "all"`; recipe ingredients are one text (`"scrapmetal:3, paperbag:1"`) because the panel's list rows hold only text, number and switch.
- Weapon ammo lives in the weapon's metadata; the client reports only lower ammo, reloading takes ammo items on the server. A held weapon is found again by its `serial` when it moves. Weapons not given by ai-inventory are removed from the ped (`onCache("weapon")`).
- Item use with an animation is two steps: the server sends `startUse`, the client plays it and calls `finishUse`, the server refuses a finish earlier than 80 % of the item's time.
- Keys 1-5 use the stacks covering the first five cells of the top row; no separate hotbar screen.
- The screen follows tgiann-inventory's grid (Tarkov) layout: equipment (clothes in two columns around the game-drawn character) and quick slots on the left, the player's card next to it, the second inventory's card on the right, the name on top. Cards are joined grids whose cell size follows the column count (`lib/cell.ts` `setCellFor`, about 52vh wide). Item boxes take their rarity's colour (panel Rarities tab, `rarity` on an item through the panel's `records` link); clothes icons are tgiann's SVGs drawn as CSS masks. The clothes take pieces off and put them back on with a click (`client/clothes.ts`, pieces in `common/clothes.ts`): the "off" drawables are base-game values per freemode sex, the worn piece is kept by collection name + local index and only this client changes the ped (ped clothes replicate). Not items: nothing is stored, a new ped (model change) forgets what was kept.
- Item images come from ox_inventory (GPL-3.0, `NOTICE.md`), converted to lowercase file names; default items from its `data/items.lua` and `weapons.lua`.

## Contracts

- Net events and callbacks: `resource/common/events.ts`; wire and NUI shapes: `resource/common/nui.ts`.
- Server exports (own): `AddItem`, `RemoveItem`, `GetItemCount`, `CanCarryItem`, `GetItems`, `RegisterUsableItem(name, handler)`, `RegisterStash`, `OpenInventory`, `ClearInventory`, `Items`. Other ai-* scripts never call them: they go through ai-core's inventory layer, whose ai-inventory adapter uses these (`docs/compat/inventory.md`); never call ai-core's inventory exports from here (loop). Client: `OpenInventory`, `CloseInventory`, `GetItemCount`, `HasItem`, `GetPlayerItems`.
- ox_inventory and qb-inventory exports: `server/compat/ox.ts`, `server/compat/qb.ts`, client ones in `client/exports.ts`; what they answer and leave out: `docs/compat/ox_inventory.md`, `docs/compat/qb-inventory.md`.
- Server local event `ai-inventory:usedItem (source, name, slot, metadata, status)` after every use (`status` = the item's hunger / thirst / stress values).
- Table `ai_inventory_inventories` (id, items JSON `{ v: 1, s: [[slot, name, count, metadata, rotated]] }`).
- Log channels `moves` (off by default), `drops`, `gives`, `purchases`, `crafting`.

## Pitfalls

- Bun cannot resolve tsconfig path aliases under a folder named `[ai]`: the bench is bundled by `bench/run.ts` (`bun run bench`) with `common/*` resolved there.
- oxlint finds no files in a resource without its own `.git`: it applies the server repo's `.gitignore`, which ignores `resources/[ai]/`.
- NUI grid maths uses only the cell pitch `CELL_VH` (`web/src/lib/cell.ts`); boxes are drawn inset by half of `CELL_GAP_VH`, so the drag grab point is measured from the cell corner (tile rect + inset), not from the visible box. Empty cell boxes are drawn only for free cells, so a big stack shows no cell lines through it.
- The NUI gets no `contextmenu` event: the item menu opens on `mouseup` with button 2. The game's Tab bind does not fire while the NUI has focus; the NUI closes on Tab / Escape itself.

## Entry points

- Grid rules: `resource/common/grid.ts`; one inventory `server/inventory.ts`; loading, saving, viewers `server/registry.ts`.
- Moving and swapping: `server/move.ts`; move / drop / give callbacks `server/actions.ts`; use, weapons `server/use.ts`, `server/weapons.ts`; shops and crafting `server/shop.ts`; opening `server/open.ts`.
- Client: screen and NUI messages `client/screen.ts` (the `profile` message: name and clothes), clothes column `client/clothes.ts`, Tab key and context `client/open.ts`, shop / stash / bench points `client/places.ts` (lib `Points`, a blip for shops that want one), ground bags `client/drops.ts` (a `Zones` area spawns the bag prop, a `Points` entry opens it), held weapon `client/weapons.ts`.
- NUI: root `web/src/App.tsx`, grid and drag `web/src/features/grid/`, panels `web/src/features/panels/`; browser preview `bun run webdev` with `?view=stash|ground|shop|bench`.
- Scale numbers: `bun run bench` (`bench/inventory.bench.ts`).
