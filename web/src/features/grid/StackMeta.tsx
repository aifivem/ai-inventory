import type { Stack } from "../../../../resource/common/nui";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";

/** What the tooltip lists from metadata (ammo, durability, repairs, serial, a stack's own description); script data stays hidden. */
export function MetaLines({ stack }: { stack: Stack }) {
  const t = useLang();
  const m = stack.metadata;
  return (
    <>
      {typeof m.ammo === "number" && (
        <p className="text-text-3">{t("UI_AMMO", m.ammo)}</p>
      )}
      {typeof m.durability === "number" && (
        <p className={m.durability <= 0 ? "text-danger" : "text-text-3"}>
          {t("UI_DURABILITY", Math.floor(m.durability))}
        </p>
      )}
      {typeof m.repairs === "number" && m.repairs > 0 && (
        <p className="text-text-3">{t("UI_REPAIRS", m.repairs)}</p>
      )}
      {typeof m.serial === "string" && (
        <p className="text-text-3">{t("UI_SERIAL", m.serial)}</p>
      )}
      {typeof m.description === "string" && (
        <p className="line-clamp-3 text-text-3 italic">{m.description}</p>
      )}
    </>
  );
}

/** A weapon's durability as a thin bar along the bottom of its box (green, then amber under 50%, red under 20%). */
export function DurabilityBar({ value }: { value: number }) {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <span className="pointer-events-none absolute inset-x-[0.5vh] bottom-[0.3vh] h-[0.3vh] overflow-hidden rounded-full bg-white/10">
      <span
        className={cn(
          "block h-full rounded-full",
          percent >= 50
            ? "bg-tgi-green"
            : percent >= 20
              ? "bg-warn"
              : "bg-danger-solid",
        )}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}
