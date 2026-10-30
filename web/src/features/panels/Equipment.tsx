import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { Occupancy } from "../../../../resource/common/grid";
import type { ClothesId } from "../../../../resource/common/clothes";
import bag from "../../assets/clothes/bag.svg";
import bproof from "../../assets/clothes/bproof.svg";
import bracelet from "../../assets/clothes/bracelet.svg";
import ear from "../../assets/clothes/ear.svg";
import glasses from "../../assets/clothes/glasses.svg";
import helmet from "../../assets/clothes/helmet.svg";
import mask from "../../assets/clothes/mask.svg";
import necklace from "../../assets/clothes/necklace.svg";
import pant from "../../assets/clothes/pant.svg";
import shoes from "../../assets/clothes/shoes.svg";
import torso from "../../assets/clothes/torso.svg";
import watch from "../../assets/clothes/watch.svg";
import { imageUrl, tint } from "../../lib/cell";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { setWorldPed, toggleClothes } from "../actions";

const SLOT_VH = 7.4;
const ICONS: Record<ClothesId, string> = {
  hat: helmet,
  ear,
  mask,
  glasses,
  neck: necklace,
  bracelet,
  shirt: torso,
  vest: bproof,
  bag,
  watch,
  pants: pant,
  shoes,
};
/** Clothes on each side of the character, top to bottom like Tarkov's gear screen. */
const LEFT: ClothesId[] = ["hat", "ear", "mask", "glasses", "neck", "bracelet"];
const RIGHT: ClothesId[] = ["shirt", "vest", "bag", "watch", "pants", "shoes"];

const PED_KEY = "ai-inventory:ped";

function storedPedShown(): boolean {
  try {
    return localStorage.getItem(PED_KEY) !== "0";
  } catch {
    return true;
  }
}

/**
 * The space between the clothes columns where the game draws a copy of the character; its place on screen goes to
 * the client on open, on resize and when the switch under it changes.
 */
function PedArea() {
  const t = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(storedPedShown);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => {
      const r = el.getBoundingClientRect();
      setWorldPed({
        x: (r.left + r.width / 2) / window.innerWidth,
        top: r.top / window.innerHeight,
        bottom: r.bottom / window.innerHeight,
        show: shown,
      });
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);
  const toggle = () => {
    const next = !shown;
    setShown(next);
    try {
      localStorage.setItem(PED_KEY, next ? "1" : "0");
    } catch {
      // Private storage off: the choice lasts until the screen closes.
    }
  };
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div ref={ref} className="min-h-0 w-full flex-1" />
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-[0.6vh] rounded-[0.2vh] border-[0.1vh] border-white/12 bg-[rgba(16,16,16,0.86)] px-[1vh] py-[0.5vh] text-[1.1vh] font-semibold text-white/60 uppercase transition-colors duration-150 hover:border-white/30 hover:text-white active:[transform:scale(0.97)]"
      >
        <FontAwesomeIcon icon={shown ? faEyeSlash : faEye} />
        {t(shown ? "UI_PED_HIDE" : "UI_PED_SHOW")}
      </button>
    </div>
  );
}

/** Small caps heading with a hairline running to the right edge. */
function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-[0.8vh]">
      <span className="text-[1.2vh] font-semibold tracking-[0.12em] whitespace-nowrap text-white/60 uppercase">
        {label}
      </span>
      <div className="h-[0.1vh] flex-1 bg-white/10" />
    </div>
  );
}

/** One clothes slot: a click takes the piece off or puts the kept one back on; the icon is green while worn. */
function ClothesSlot({ id }: { id: ClothesId }) {
  const t = useLang();
  const state = useAppSelector((s) => s.inventory.profile?.clothes[id]);
  const worn = state?.worn ?? false;
  return (
    <button
      type="button"
      disabled={!state?.can}
      onClick={() => toggleClothes(id)}
      title={t(worn ? "UI_CLOTHES_OFF" : "UI_CLOTHES_ON")}
      className={cn(
        "group relative flex shrink-0 items-center justify-center rounded-[0.2vh] border-[0.1vh] transition-[background-color,border-color,opacity] duration-150 enabled:active:[transform:scale(0.95)] disabled:cursor-default",
        worn
          ? "border-tgi-green-40 bg-tgi-green-10 enabled:hover:bg-tgi-green-15"
          : "border-white/12 bg-[rgba(16,16,16,0.86)] enabled:hover:border-white/30",
        !state?.can && "opacity-50",
      )}
      style={{ width: `${SLOT_VH}vh`, height: `${SLOT_VH}vh` }}
    >
      <span className="absolute top-[0.5vh] left-[0.6vh] text-[0.95vh] font-semibold text-white/45 uppercase">
        {t(`UI_CLOTHES_${id.toUpperCase()}`)}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-[0.8vh] size-[3.4vh] transition-colors duration-150",
          worn
            ? "bg-tgi-green"
            : "bg-white/35 group-enabled:group-hover:bg-white/60",
        )}
        style={{
          WebkitMask: `url("${ICONS[id]}") center / contain no-repeat`,
          mask: `url("${ICONS[id]}") center / contain no-repeat`,
        }}
      />
    </button>
  );
}

/** The stacks keys 1-5 use: whatever covers each of the first five cells of the top row. */
export function QuickSlots() {
  const view = useAppSelector((s) => s.inventory.player);
  const items = useAppSelector((s) => s.inventory.items);
  const slots = useMemo(() => {
    if (!view) return [];
    const sized = view.stacks.map((s) => {
      const def = items[s.name];
      const w = def?.w ?? 1;
      const h = def?.h ?? 1;
      return { slot: s.slot, w: s.rotated ? h : w, h: s.rotated ? w : h };
    });
    const grid = Occupancy.of(view.columns, view.rows, sized);
    return [0, 1, 2, 3, 4].map((i) => {
      const anchor = grid.cells[i] ?? 0;
      return anchor ? view.stacks.find((s) => s.slot === anchor) : undefined;
    });
  }, [view, items]);
  return (
    <div className="flex gap-[0.6vh]">
      {slots.map((stack, i) => {
        const def = stack ? items[stack.name] : undefined;
        const src = def ? imageUrl(def.image) : null;
        return (
          <div
            key={i}
            className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-[0.2vh] border-[0.1vh] border-white/12 bg-[rgba(16,16,16,0.86)]"
            style={{
              width: `${SLOT_VH}vh`,
              height: `${SLOT_VH}vh`,
              ...(def?.rarity
                ? {
                    backgroundColor: tint(def.rarity, 0.22),
                    borderColor: tint(def.rarity, 0.55),
                  }
                : null),
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[4.4vh] leading-none font-medium text-white/10">
              {i + 1}
            </span>
            {src && (
              <img
                src={src}
                alt=""
                draggable={false}
                className="relative max-h-[78%] max-w-[78%] object-contain"
              />
            )}
            {stack && stack.count > 1 && (
              <span className="absolute right-[0.5vh] bottom-[0.4vh] text-[1.2vh] font-bold text-white tabular-nums">
                {stack.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The left of the screen (tgiann grid layout): worn clothes in two columns around the character the game draws in the
 * middle (with a show / hide switch under it), the quick slots below. Clothes are not items: a click takes a piece off or puts it back on.
 */
export function Equipment() {
  const t = useLang();
  const profile = useAppSelector((s) => s.inventory.profile);
  const column = (ids: ClothesId[]) => (
    <div className="flex flex-col gap-[0.6vh]">
      {ids.map((id) => (
        <ClothesSlot key={id} id={id} />
      ))}
    </div>
  );
  return (
    <div className="flex h-full w-[56vh] shrink-0 flex-col gap-[1vh]">
      <SectionTitle label={t("UI_EQUIPMENT")} />
      <div className="flex min-h-0 flex-1 justify-between">
        {profile && column(LEFT)}
        <PedArea />
        {profile && column(RIGHT)}
      </div>
      <SectionTitle label={t("UI_QUICK_SLOTS_TITLE")} />
      <QuickSlots />
    </div>
  );
}
