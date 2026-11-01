// Inventories at scale (`bun run bench` in the resource): natives stubbed, real item list from
// data/items.json. Measures memory and time for 100k / 1M inventories, grid operations, save encoding and drops.
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Runs from bench/.out (bundled by run.ts).
const root = join(import.meta.dirname, "..", "..");
const g = globalThis as Record<string, unknown>;
const noop = () => undefined;
g.GetCurrentResourceName = () => "ai-inventory";
g.LoadResourceFile = (_: string, path: string) =>
  readFileSync(join(root, path), "utf8");
g.GetResourcePath = () => root;
g.IsDuplicityVersion = () => true;
g.GetConvar = (_: string, fallback: string) => fallback;
g.on = noop;
g.onNet = noop;
g.setTick = () => 1;
g.clearTick = noop;
g.emit = noop;
let sent = 0;
let dropBytes = 0;
let dropItems = 0;
let measureBytes = true;
g.emitNet = (name: string, _target: unknown, ...args: unknown[]) => {
  sent++;
  if (name !== "ai-inventory:client:drops") return;
  const [, put, remove] = args as [boolean, unknown[], unknown[]];
  dropItems += put.length + remove.length;
  if (measureBytes) dropBytes += JSON.stringify(args).length;
};
// Player "peds" are their source; positions set by the drop bench.
const positions = new Map<number, [number, number, number]>();
g.GetPlayerPed = (source: string) => Number(source);
g.GetEntityCoords = (ped: number) => positions.get(ped) ?? [0, 0, 0];
g.GetGameTimer = () => Math.floor(performance.now());
g.exports = new Proxy(noop, { get: () => new Proxy({}, { get: () => noop }) });

const { content } = await import("../resource/server/content");
const { inventories } = await import("../resource/server/registry/registry");
const { moveStack } = await import("../resource/server/move");
const { drops } = await import("../resource/server/drops");
const { metaKey } = await import("../resource/server/inventory/stacks");

const defs = [...content.items.byName.values()];
const pick = (i: number) => defs[i % defs.length]!;
const mb = () => (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);

for (const count of [100_000, 1_000_000]) {
  const base = Number(mb());
  const t0 = performance.now();
  for (let i = 0; i < count; i++) {
    const inv = inventories.create(
      `bench:${count}:${i}`,
      { kind: "stash", label: "", rows: 6, maxWeight: 0, persistent: true },
      [],
    );
    // A few stacks each, like a real player.
    for (let k = 0; k < 6; k++) inv.add(pick(i * 7 + k), 1);
  }
  const t1 = performance.now();
  console.log(
    `${count.toLocaleString("en-US")} inventories x 6 stacks: create ${(t1 - t0).toFixed(0)} ms, heap +${Number(mb()) - base} MB`,
  );

  // Save encoding of every inventory (what one flush of all of them costs before SQL).
  const t2 = performance.now();
  let bytes = 0;
  for (let i = 0; i < count; i++)
    bytes += JSON.stringify([
      ...inventories.get(`bench:${count}:${i}`)!.stacks.values(),
    ]).length;
  console.log(
    `  encode all for saving: ${(performance.now() - t2).toFixed(0)} ms, ${(bytes / 1024 / 1024).toFixed(0)} MB JSON`,
  );
  for (let i = 0; i < count; i++) inventories.remove(`bench:${count}:${i}`);
}

// Grid operations on a large, nearly full stash (14 x 50 cells).
content.settings.columns = 14;
const big = inventories.create(
  "bench:big",
  { kind: "stash", label: "", rows: 50, maxWeight: 0, persistent: false },
  [],
);
const t3 = performance.now();
let added = 0;
for (let i = 0; i < 100_000 && added < 5000; i++)
  if (big.add(pick(i), 1)) added++;
const t4 = performance.now();
console.log(
  `fill a 14x50 grid: ${added} adds in ${(t4 - t3).toFixed(0)} ms, ${(((t4 - t3) / Math.max(1, added)) * 1000).toFixed(1)} µs per add (cells used ${big.grid.cells.filter(Boolean).length}/700)`,
);
const other = inventories.create(
  "bench:other",
  { kind: "stash", label: "", rows: 50, maxWeight: 0, persistent: false },
  [],
);
const slots = [...big.stacks.keys()];
const t5 = performance.now();
let moved = 0;
for (const slot of slots) {
  const stack = big.stacks.get(slot);
  const place = stack
    ? other.grid.findPlace(other.shape(stack.name, false))
    : null;
  if (!stack || !place) continue;
  if (
    moveStack(big, other, {
      from: big.id,
      to: other.id,
      fromSlot: slot,
      toSlot: place.slot,
      count: stack.count,
      rotated: place.rotated,
    }).ok
  )
    moved++;
}
const t6 = performance.now();
console.log(
  `move ${moved} stacks between two big grids (with findPlace): ${(((t6 - t5) / Math.max(1, moved)) * 1000).toFixed(1)} µs per move`,
);

// Relayout: a full 14-column grid cut to 6 columns keeps every stack (moved, or the grid grows).
const before = other.stacks.size;
other.relayout(6, 50, 0);
console.log(
  `relayout 14x50 -> 6 columns: ${other.stacks.size}/${before} stacks kept, all on the grid: ${[...other.stacks.values()].every((st) => other.grid.cells[st.slot - 1] === st.slot)}, rows now ${other.rows}`,
);

// metaKey: nested metadata must tell stacks apart.
console.log(
  `metaKey nested: ${metaKey({ info: { owner: "John" } }) === metaKey({ info: { serial: "X1", owner: "Jane" } }) ? "COLLIDES" : "distinct"}, key order ${metaKey({ a: 1, b: { c: 2, d: 3 } }) === metaKey({ b: { d: 3, c: 2 }, a: 1 }) ? "ignored" : "MATTERS"}`,
);

// Drops: 64 m grid lookup, area lists per player (2,048 players spread over the map).
content.settings.columns = 10;
const PLAYERS = 2048;
// Deterministic pseudo-random spots over a 12 x 12 km map.
const rand = (i: number): number => {
  let t = (i * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};
const spot = (i: number): [number, number, number] => [
  rand(i * 2) * 12_000 - 4000,
  rand(i * 2 + 1) * 12_000 - 4000,
  30,
];
for (let s = 1; s <= PLAYERS; s++) positions.set(s, spot(s));
for (let s = 1; s <= PLAYERS; s++) drops.start(s);
for (const count of [10_000, 100_000]) {
  const first = drops.size;
  const t7 = performance.now();
  // Spread over the map (the bench creates as a script: no caps).
  for (let i = first; i < count; i++) {
    const [x, y] = spot(i + 10_000);
    drops.create(x + (i % 5) * 3, y, 30, null);
  }
  const t8 = performance.now();
  for (let i = 0; i < 1000; i++) drops.near(-5000 - i * 3, 0, 30);
  const t9 = performance.now();
  dropBytes = 0;
  for (let s = 1; s <= PLAYERS; s++) drops.start(s);
  const snapshot = dropBytes / PLAYERS;
  // Every player moves 200 m (new cells) at once: one area pass (the third of three, warmed up).
  let t10 = 0;
  let t11 = 0;
  measureBytes = false;
  for (let pass = 0; pass < 3; pass++) {
    for (let s = 1; s <= PLAYERS; s++) {
      const [x, y, z] = positions.get(s)!;
      positions.set(s, [x + 200, y, z]);
    }
    dropItems = 0;
    t10 = performance.now();
    drops.followAll();
    t11 = performance.now();
  }
  measureBytes = true;
  console.log(
    `${count.toLocaleString("en-US")} drops: create ${(((t8 - t7) / (count - first)) * 1000).toFixed(1)} µs each, merge lookup ${(((t9 - t8) / 1000) * 1000).toFixed(1)} µs, join snapshot ${(snapshot / 1024).toFixed(1)} KB avg, ${PLAYERS} players changing cell at once ${(t11 - t10).toFixed(1)} ms (${dropItems} points put / removed)`,
  );
}
await new Promise((r) => setTimeout(r, 0));
console.log(`deltas sent: ${sent}`);
process.exit(0);
