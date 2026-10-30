// Inventories at scale (`bun run bench` in the resource): natives stubbed, real item list from
// data/items.json. Measures memory and time for 100k / 1M inventories, grid operations, save encoding and drops.
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Runs from bench/.out (bundled by run.ts).
const root = join(import.meta.dirname, "..", "..")
const g = globalThis as Record<string, unknown>
const noop = () => undefined
g.GetCurrentResourceName = () => "ai-inventory"
g.LoadResourceFile = (_: string, path: string) =>
  readFileSync(join(root, path), "utf8")
g.GetResourcePath = () => root
g.IsDuplicityVersion = () => true
g.GetConvar = (_: string, fallback: string) => fallback
g.on = noop
g.onNet = noop
g.emit = noop
let sent = 0
g.emitNet = () => void sent++
g.exports = new Proxy(noop, { get: () => new Proxy({}, { get: () => noop }) })

const { content } = await import("../resource/server/content")
const { inventories } = await import("../resource/server/registry")
const { moveStack } = await import("../resource/server/move")
const { drops } = await import("../resource/server/drops")

const defs = [...content.items.byName.values()]
const pick = (i: number) => defs[i % defs.length]!
const mb = () => (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)

for (const count of [100_000, 1_000_000]) {
  const base = Number(mb())
  const t0 = performance.now()
  for (let i = 0; i < count; i++) {
    const inv = inventories.create(
      `bench:${count}:${i}`,
      { kind: "stash", label: "", rows: 6, maxWeight: 0, persistent: true },
      []
    )
    // A few stacks each, like a real player.
    for (let k = 0; k < 6; k++) inv.add(pick(i * 7 + k), 1)
  }
  const t1 = performance.now()
  console.log(
    `${count.toLocaleString("en-US")} inventories x 6 stacks: create ${(t1 - t0).toFixed(0)} ms, heap +${Number(mb()) - base} MB`
  )

  // Save encoding of every inventory (what one flush of all of them costs before SQL).
  const t2 = performance.now()
  let bytes = 0
  for (let i = 0; i < count; i++)
    bytes += JSON.stringify([
      ...inventories.get(`bench:${count}:${i}`)!.stacks.values(),
    ]).length
  console.log(
    `  encode all for saving: ${(performance.now() - t2).toFixed(0)} ms, ${(bytes / 1024 / 1024).toFixed(0)} MB JSON`
  )
  for (let i = 0; i < count; i++) inventories.remove(`bench:${count}:${i}`)
}

// Grid operations on a large, nearly full stash (14 x 50 cells).
content.settings.columns = 14
const big = inventories.create(
  "bench:big",
  { kind: "stash", label: "", rows: 50, maxWeight: 0, persistent: false },
  []
)
const t3 = performance.now()
let added = 0
for (let i = 0; i < 100_000 && added < 5000; i++)
  if (big.add(pick(i), 1)) added++
const t4 = performance.now()
console.log(
  `fill a 14x50 grid: ${added} adds in ${(t4 - t3).toFixed(0)} ms, ${(((t4 - t3) / Math.max(1, added)) * 1000).toFixed(1)} µs per add (cells used ${big.grid.cells.filter(Boolean).length}/700)`
)
const other = inventories.create(
  "bench:other",
  { kind: "stash", label: "", rows: 50, maxWeight: 0, persistent: false },
  []
)
const slots = [...big.stacks.keys()]
const t5 = performance.now()
let moved = 0
for (const slot of slots) {
  const stack = big.stacks.get(slot)
  const place = stack
    ? other.grid.findPlace(other.shape(stack.name, false))
    : null
  if (!stack || !place) continue
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
    moved++
}
const t6 = performance.now()
console.log(
  `move ${moved} stacks between two big grids (with findPlace): ${(((t6 - t5) / Math.max(1, moved)) * 1000).toFixed(1)} µs per move`
)

// Drops: the merge lookup scans every drop.
content.settings.columns = 10
for (const count of [1_000, 10_000]) {
  for (let i = 0; i < count; i++) drops.at(i * 3, i * 3, 30)
  const t7 = performance.now()
  for (let i = 0; i < 1000; i++) drops.at(-5000 - i * 3, 0, 30)
  console.log(
    `${count.toLocaleString("en-US")} drops: one new-drop lookup ${(((performance.now() - t7) / 1000) * 1000).toFixed(1)} µs`
  )
}
await new Promise((r) => setTimeout(r, 0))
console.log(`deltas sent: ${sent}`)
process.exit(0)
