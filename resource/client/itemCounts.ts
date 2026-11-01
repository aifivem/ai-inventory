import { state } from "./state";

/**
 * ox_inventory's `ox_inventory:itemCount (name, total)` local event after each change of the player's own item totals
 * (ai-inventory answers as ox_inventory, so ox scripts listen to it; ai-core's inventory layer reads it too).
 */
let counts = new Map<string, number>();

function report(): void {
  const next = new Map<string, number>();
  for (const s of state.player?.stacks ?? [])
    next.set(s.name, (next.get(s.name) ?? 0) + s.count);
  for (const [name, count] of next)
    if (counts.get(name) !== count) emit("ox_inventory:itemCount", name, count);
  for (const name of counts.keys())
    if (!next.has(name)) emit("ox_inventory:itemCount", name, 0);
  counts = next;
}

state.onPlayer(report);
state.onDelta((id) => {
  if (id === state.player?.id) report();
});
