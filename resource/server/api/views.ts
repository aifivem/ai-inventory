import type { Stack } from "common/nui";
import { content } from "../content";

/** The item fields scripts expect (ox shape; qb reads the same names plus `amount`/`info`). */
export function itemView(stack: Stack) {
  const def = content.items.get(stack.name);
  return {
    name: stack.name,
    label: def?.label ?? stack.name,
    weight: (def?.weight ?? 0) * stack.count,
    slot: stack.slot,
    count: stack.count,
    amount: stack.count,
    metadata: stack.metadata,
    info: stack.metadata,
    stack: (def?.stack ?? 1) > 1,
    unique: (def?.stack ?? 1) === 1,
    close: def?.close ?? false,
    description: def?.description ?? "",
    type: def?.type ?? "item",
    image: def?.image ?? "",
  };
}

export function definitionView(name: string) {
  const def = content.items.get(name);
  if (!def) return null;
  return {
    name: def.name,
    label: def.label,
    weight: def.weight,
    stack: def.stack > 1,
    unique: def.stack === 1,
    close: def.close,
    description: def.description,
    type: def.type,
    image: def.image,
    useable: def.usable,
  };
}
