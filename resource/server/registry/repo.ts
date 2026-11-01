import { createDatabaseTables } from "@aicore-fivem/lib/server";
import { mysql } from "@aicore-fivem/mysql";
import { ResourceName } from "common";
import type { Metadata, Stack } from "common/nui";
import { log } from "../log";

let setup: Promise<void> | null = null;

/** Creates the table once; every query waits for it (players already in the game load right after a restart). */
export const prepareDatabase = (): Promise<void> =>
  (setup ??= createDatabaseTables(ResourceName, "sql/main.sql"));

/** Stored form of an inventory: `{ v: 1, s: [[slot, name, count, metadata, rotated], ...] }`. */
type Row = [number, string, number, Metadata, boolean];

function decode(id: string, text: string): Stack[] {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("s" in parsed) ||
      !Array.isArray(parsed.s)
    )
      return [];
    const stacks: Stack[] = [];
    for (const row of parsed.s as unknown[]) {
      if (!Array.isArray(row)) continue;
      const [slot, name, count, metadata, rotated] = row as unknown[];
      if (
        typeof slot !== "number" ||
        typeof name !== "string" ||
        typeof count !== "number" ||
        count <= 0
      )
        continue;
      const meta =
        typeof metadata === "object" &&
        metadata !== null &&
        !Array.isArray(metadata)
          ? (metadata as Metadata)
          : {};
      stacks.push({
        slot,
        name,
        count,
        metadata: meta,
        rotated: rotated === true,
      });
    }
    return stacks;
  } catch (error) {
    log.error(`inventory ${id} has broken stored data`, error);
    return [];
  }
}

const encode = (stacks: Iterable<Stack>): string =>
  JSON.stringify({
    v: 1,
    s: [...stacks].map((s): Row => [
      s.slot,
      s.name,
      s.count,
      s.metadata,
      s.rotated,
    ]),
  });

/** Stored stacks of the given inventories (missing ids are new, empty inventories). */
export async function loadInventories(
  ids: string[],
): Promise<Map<string, Stack[]>> {
  const found = new Map<string, Stack[]>();
  if (ids.length === 0) return found;
  await prepareDatabase();
  const rows = await mysql.query<Array<{ id: string; items: string }>>(
    "SELECT id, items FROM ai_inventory_inventories WHERE id IN (?)",
    [ids],
  );
  for (const row of rows) found.set(row.id, decode(row.id, row.items));
  return found;
}

/** Writes inventories with one multi-row upsert per 200 (a transfer's two sides go out in the same statement). */
export async function saveInventories(
  list: Array<{ id: string; stacks: Iterable<Stack> }>,
): Promise<void> {
  if (list.length === 0) return;
  await prepareDatabase();
  for (let i = 0; i < list.length; i += 200) {
    const chunk = list.slice(i, i + 200);
    const values = chunk.flatMap((inv) => [inv.id, encode(inv.stacks)]);
    await mysql.query(
      `INSERT INTO ai_inventory_inventories (id, items) VALUES ${chunk.map(() => "(?, ?)").join(", ")} ON DUPLICATE KEY UPDATE items = VALUES(items)`,
      values,
    );
  }
}

/** Moves a stored inventory to a new id; nothing happens when `from` is missing or `to` already exists. */
export async function renameInventory(from: string, to: string): Promise<void> {
  await prepareDatabase();
  await mysql.query(
    "UPDATE IGNORE ai_inventory_inventories SET id = ? WHERE id = ?",
    [to, from],
  );
}
