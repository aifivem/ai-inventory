import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faClock,
  faEarListen,
  faGem,
  faGlasses,
  faHatCowboy,
  faMasksTheater,
  faRing,
  faShieldHalved,
  faShirt,
  faShoePrints,
  faSocks,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { CLOTHES, type ClothesId } from "../../../../resource/common/clothes";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { toggleClothes } from "../actions";

const ICONS: Record<ClothesId, IconDefinition> = {
  hat: faHatCowboy,
  mask: faMasksTheater,
  neck: faGem,
  ear: faEarListen,
  shirt: faShirt,
  glasses: faGlasses,
  vest: faShieldHalved,
  bag: faBagShopping,
  bracelet: faRing,
  watch: faClock,
  pants: faSocks,
  shoes: faShoePrints,
};

/**
 * The middle of the screen: what the character wears, two columns of pieces. A click takes a worn piece off or puts
 * the taken one back on (with its animation); a piece that is off with nothing kept stays dim and does nothing.
 */
export function ClothesColumn() {
  const t = useLang();
  const profile = useAppSelector((s) => s.inventory.profile);
  if (!profile) return null;
  return (
    <section className="flex shrink-0 flex-col items-center gap-[1.2vh] pt-[7.6vh]">
      <span className="text-[1.25vh] font-semibold tracking-[0.04em] text-text-3 uppercase">
        {t("UI_CLOTHES")}
      </span>
      <div className="grid grid-cols-2 gap-[0.9vh]">
        {CLOTHES.map(([id]) => {
          const state = profile.clothes[id];
          return (
            <button
              key={id}
              type="button"
              disabled={!state.can}
              onClick={() => toggleClothes(id)}
              title={t(state.worn ? "UI_CLOTHES_OFF" : "UI_CLOTHES_ON")}
              className={cn(
                "group relative flex size-[8.6vh] flex-col items-center justify-center rounded-[1vh] border transition-[background-color,border-color,opacity,transform] duration-150 enabled:active:[transform:scale(0.95)] disabled:cursor-default",
                state.worn
                  ? "border-tgi-green-40 bg-tgi-green-10 enabled:hover:bg-tgi-green-15"
                  : "border-white/8 bg-[#1a1a1acc] enabled:hover:border-white/20",
                !state.can && "opacity-40",
              )}
            >
              <span className="absolute top-[0.7vh] left-[0.8vh] text-[0.95vh] font-semibold text-text-3 uppercase">
                {t(`UI_CLOTHES_${id.toUpperCase()}`)}
              </span>
              <FontAwesomeIcon
                icon={ICONS[id]}
                className={cn(
                  "mt-[1vh] text-[2.6vh] transition-colors duration-150",
                  state.worn
                    ? "text-tgi-green"
                    : "text-text-4 group-enabled:group-hover:text-text-3",
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
