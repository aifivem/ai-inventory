import { callAction, menu, onServerEvent } from "@aifivem/lib/client";
import { isRecord } from "@aifivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/events";
import type { RepairRow } from "common/nui";

function toRow(v: unknown): RepairRow | null {
  if (
    !isRecord(v) ||
    typeof v.slot !== "number" ||
    typeof v.label !== "string" ||
    typeof v.durability !== "number" ||
    typeof v.serial !== "string" ||
    typeof v.ammo !== "number" ||
    typeof v.repairs !== "number"
  )
    return null;
  return {
    slot: v.slot,
    label: v.label,
    durability: v.durability,
    serial: v.serial,
    ammo: v.ammo,
    repairs: v.repairs,
    maxed: v.maxed === true,
  };
}

/** The repair kit's menu: the weapons the server listed; a pick asks the server, which runs the progress bar. */
async function openMenu(rows: RepairRow[]): Promise<void> {
  const picked = await menu({
    title: Locale("UI_REPAIR_TITLE"),
    items: rows.map((row) => ({
      id: String(row.slot),
      label: row.label,
      icon: "gun",
      disabled: row.maxed,
      description: Locale(
        row.maxed ? "UI_REPAIR_ROW_MAXED" : "UI_REPAIR_ROW",
        row.durability,
        row.serial,
        row.ammo,
        row.repairs,
      ),
    })),
  });
  const slot = picked === null ? NaN : Number(picked);
  if (!Number.isInteger(slot)) return;
  await callAction(EVENTS.repair, [slot], { fallback: "INV_ERR_GONE" });
}

onServerEvent(
  EVENTS.repairMenu,
  {
    args: ([raw]) =>
      Array.isArray(raw) ? [raw.flatMap((v) => toRow(v) ?? [])] : null,
  },
  (rows) => void openMenu(rows),
);
