import {
  aiLog,
  onClientCallback,
  resourceExport,
} from "@aicore-fivem/lib/server"
import { nearPlace } from "common/content"
import { EVENTS, type ActionResult } from "common/events"
import { allowed, pedCoords } from "./access"
import { content } from "./content"
import { drops } from "./drops"
import { inventories } from "./registry"

const core = resourceExport("ai-core")
const fail = (error: string): ActionResult => ({ ok: false, error })
const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max
    ? v
    : null

/** Takes `price` from the first of the accounts that has it. */
function pay(
  source: number,
  accounts: string[],
  price: number,
  reason: string
): boolean {
  if (price <= 0) return true
  return accounts.some((account) =>
    core.RemoveMoney(source, account, price, reason)
  )
}

onClientCallback(
  EVENTS.buy,
  {
    args: ([shopId, name, count]) => {
      const c = int(count, 1, 1000)
      return typeof shopId === "string" &&
        typeof name === "string" &&
        c !== null
        ? [shopId, name.toLowerCase(), c]
        : null
    },
    lock: true,
  },
  (source, shopId, name, count): ActionResult => {
    const shop = content.shops.get(shopId)
    const inventory = inventories.playerOf(source)
    const p = pedCoords(source)
    if (!shop || !inventory || !nearPlace(shop, p.x, p.y, p.z))
      return fail("INV_ERR_FAR")
    if (!allowed(source, shop)) return fail("INV_ERR_DENIED")
    const product = shop.items.find((row) => row.name === name)
    const def = content.items.get(name)
    if (!product || !def) return fail("INV_ERR_GONE")
    if (!inventory.planAdd(def, count, {})) return fail("INV_ERR_NO_SPACE")
    const price = product.price * count
    if (!pay(source, shop.accounts, price, `shop:${shop.id}`))
      return fail("INV_ERR_MONEY")
    inventory.add(def, count)
    aiLog(
      "purchases",
      `bought ${count}x ${def.name} for $${price} at ${shop.id}`,
      { source, metadata: { shop: shop.id, item: def.name, count, price } }
    )
    return { ok: true }
  }
)

/** One craft at a time per player: the timer adds the result when it ends. */
const crafting = new Map<number, ReturnType<typeof setTimeout>>()

onClientCallback(
  EVENTS.craft,
  {
    args: ([benchId, index]) =>
      typeof benchId === "string" && int(index, 0, 100) !== null
        ? [benchId, index as number]
        : null,
    lock: true,
  },
  (source, benchId, index): ActionResult => {
    const bench = content.benches.get(benchId)
    const recipe = bench?.recipes[index]
    const inventory = inventories.playerOf(source)
    const p = pedCoords(source)
    if (!bench || !recipe || !inventory || !nearPlace(bench, p.x, p.y, p.z))
      return fail("INV_ERR_FAR")
    if (!allowed(source, bench)) return fail("INV_ERR_DENIED")
    if (crafting.has(source)) return fail("INV_ERR_BUSY")
    const result = content.items.get(recipe.result)
    if (!result) return fail("INV_ERR_GONE")
    if (
      recipe.ingredients.some(
        (part) =>
          inventory.count(content.items.get(part.name)?.name ?? part.name) <
          part.count
      )
    )
      return fail("INV_ERR_MISSING")
    for (const part of recipe.ingredients)
      inventory.remove(
        content.items.get(part.name)?.name ?? part.name,
        part.count
      )
    crafting.set(
      source,
      setTimeout(() => {
        crafting.delete(source)
        const own = inventories.playerOf(source)
        if (!own) return
        // No room any more: the result goes on the ground at the player's feet.
        if (!own.add(result, recipe.count)) {
          const q = pedCoords(source)
          drops.at(q.x, q.y, q.z).inventory.add(result, recipe.count)
        }
        aiLog(
          "crafting",
          `crafted ${recipe.count}x ${result.name} at ${bench.id}`,
          {
            source,
            metadata: {
              bench: bench.id,
              item: result.name,
              count: recipe.count,
            },
          }
        )
      }, recipe.time * 1000)
    )
    return { ok: true }
  }
)

export function cancelCraft(source: number): void {
  const timer = crafting.get(source)
  if (timer) clearTimeout(timer)
  crafting.delete(source)
}
