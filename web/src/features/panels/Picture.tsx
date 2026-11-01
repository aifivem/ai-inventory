import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import type { ItemView } from "../../../../resource/common/nui";
import { imageUrl } from "../../lib/cell";
import { cn } from "../../lib/utils";

export function Picture({
  def,
  className,
}: {
  def: ItemView | undefined;
  className?: string;
}) {
  const src = def ? imageUrl(def.image) : null;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[0.8vh] border border-white/8 bg-white/4 p-[0.5vh]",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <FontAwesomeIcon icon={faBox} className="text-[1.8vh] text-text-3" />
      )}
    </div>
  );
}
