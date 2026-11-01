import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { useDrag } from "../grid/drag";
import { PanelFrame, sideWidth } from "./PanelFrame";

/** Next to the player inventory when nothing else is open: drop target for putting items on the ground. */
export function GroundPanel({ columns }: { columns: number }) {
  const t = useLang();
  const drag = useDrag();
  return (
    <PanelFrame title={t("UI_GROUND")} width={sideWidth(columns)}>
      <div
        data-ground
        className={cn(
          "flex h-[38.4vh] w-full flex-col items-center justify-center gap-[1.2vh] rounded-[1.4vh] border border-dashed bg-black/20 text-center transition-colors duration-150",
          drag?.ground
            ? "border-tgi-green bg-tgi-green-10 text-tgi-green"
            : "border-white/15 text-text-2",
        )}
      >
        <FontAwesomeIcon icon={faArrowDown} className="text-[3vh]" />
        <p className="max-w-[30vh] text-[1.4vh]">{t("UI_GROUND_HINT")}</p>
      </div>
    </PanelFrame>
  );
}
