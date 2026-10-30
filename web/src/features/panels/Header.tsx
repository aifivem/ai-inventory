import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComputerMouse, faDoorOpen } from "@fortawesome/free-solid-svg-icons";
import { useLang } from "../../lib/lang";
import { useAppSelector } from "../../store";
import { closeScreen } from "../actions";

/** A key cap as on the TGIANN screens: small white box, dark bold label. */
function Key({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[2.2vh] min-w-[2.2vh] items-center justify-center rounded-[0.4vh] bg-white/90 px-[0.5vh] text-[1.05vh] leading-none font-bold text-black">
      {children}
    </span>
  );
}

function Hint({ keys, text }: { keys: ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-[0.8vh] text-[1.4vh] text-text-2">
      {keys}
      {text}
    </span>
  );
}

/** "ESC to close" with the round door button (tgiann-ui EscHint). */
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
    <span className="flex h-[4.4vh] items-center gap-[0.9vh] rounded-full border border-white/8 bg-black/50 px-[1.8vh] text-[1.5vh] font-semibold">
      <span className="size-[0.9vh] rounded-full bg-tgi-green" />
      {name}
    </span>
  );
}

/** Top of the screen: the big title with the controls under it on the left, the name in the middle, close on the right. */
export function Header() {
  const t = useLang();
  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-start gap-[4vh]">
      <div className="flex flex-col gap-[2vh]">
        <h1 className="font-display text-[4.4vh] leading-none font-extrabold tracking-[-0.01em] uppercase">
          {t("UI_INVENTORY")}
        </h1>
        <div className="grid grid-cols-[auto_auto_auto] gap-x-[2.4vh] gap-y-[1vh]">
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
          <Hint keys={<Key>1-5</Key>} text={t("UI_QUICK_SLOTS")} />
          <Hint keys={<Key>R</Key>} text={t("UI_ROTATE_HINT")} />
        </div>
      </div>
      <NameChip />
      <div className="flex justify-end">
        <EscClose />
      </div>
    </header>
  );
}
