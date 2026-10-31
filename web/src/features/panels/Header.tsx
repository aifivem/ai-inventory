import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComputerMouse, faDoorOpen } from "@fortawesome/free-solid-svg-icons";
import { useLang } from "../../lib/lang";
import { useAppSelector } from "../../store";
import { closeScreen } from "../actions";

/** A key cap as on the TGIANN screens: small white box, dark bold label. */
function Key({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[1.9vh] min-w-[1.9vh] items-center justify-center rounded-[0.3vh] bg-white/85 px-[0.4vh] text-[0.95vh] leading-none font-bold text-black">
      {children}
    </span>
  );
}

function Hint({ keys, text }: { keys: ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-[0.7vh] text-[1.15vh] text-text-3">
      {keys}
      {text}
    </span>
  );
}

/** "ESC to close" with the round door button (aicore-ui). */
function EscClose() {
  const t = useLang();
  const [before = "", after = ""] = t("UI_ESC_CLOSE").split("{0}");
  return (
    <button
      type="button"
      aria-label={t("UI_CLOSE")}
      onClick={closeScreen}
      className="group flex items-center gap-[1vh] rounded-full active:[transform:scale(0.96)]"
    >
      <span className="text-[1.6vh] text-white/70 transition-colors duration-150 group-hover:text-white">
        {before}
        <b className="font-bold text-white">ESC</b>
        {after}
      </span>
      <span className="flex size-[4.4vh] items-center justify-center rounded-full bg-black/60 text-white/70 transition-colors duration-150 group-hover:bg-[#101010B3] group-hover:text-white">
        <FontAwesomeIcon icon={faDoorOpen} className="text-[1.8vh]" />
      </span>
    </button>
  );
}

/** The character's name in a pill (tgiann-inventory header). */
function NameChip() {
  const name = useAppSelector((s) => s.inventory.profile?.name);
  if (!name) return null;
  return (
    <span className="flex h-[4vh] items-center gap-[0.9vh] rounded-full border-[0.1vh] border-white/8 bg-black/60 px-[1.6vh] text-[1.4vh] font-semibold">
      <span className="size-[0.8vh] rounded-full bg-tgi-green" />
      {name}
    </span>
  );
}

/** Over the screen: the name in the middle, "ESC to close" on the right. */
export function TopBar() {
  return (
    <div className="pointer-events-none absolute inset-x-[3vh] top-[2vh] grid grid-cols-[1fr_auto_1fr] items-center">
      <span />
      <span className="pointer-events-auto">
        <NameChip />
      </span>
      <span className="pointer-events-auto flex justify-end">
        <EscClose />
      </span>
    </div>
  );
}

/** The controls, under the player's grid (two columns of key caps and what they do). */
export function Hints() {
  const t = useLang();
  return (
    <div className="grid grid-cols-2 gap-x-[1.6vh] gap-y-[0.7vh] border-t-[0.1vh] border-white/8 pt-[1vh]">
      <Hint
        keys={
          <Key>
            <FontAwesomeIcon icon={faComputerMouse} />
          </Key>
        }
        text={t("UI_HINT_USE")}
      />
      <Hint keys={<Key>SHIFT</Key>} text={t("UI_HINT_HALF")} />
      <Hint keys={<Key>CTRL</Key>} text={t("UI_HINT_ONE")} />
      <Hint keys={<Key>R</Key>} text={t("UI_ROTATE_HINT")} />
      <Hint keys={<Key>1-5</Key>} text={t("UI_QUICK_SLOTS")} />
    </div>
  );
}
