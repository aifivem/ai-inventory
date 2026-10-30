import { motion } from "motion/react";
import { imageUrl, tint } from "../../lib/cell";
import { useAppSelector } from "../../store";
import { useQuickStacks } from "./Equipment";

/**
 * The quick slots bar while the screen is closed (Tab), tgiann-inventory's hotbar: five square boxes at the bottom
 * centre, the key number faint behind each item, the count top left, the name at the bottom, the rarity as a line.
 */
export function Hotbar() {
  const items = useAppSelector((s) => s.inventory.items);
  const slots = useQuickStacks();
  return (
    <motion.div
      className="pointer-events-none fixed bottom-[6vh] left-1/2 grid w-[45vh] [transform:translateX(-50%)] grid-cols-5 gap-[0.5vh]"
      initial={{ opacity: 0, y: "0.8vh" }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
    >
      {slots.map((stack, i) => {
        const def = stack ? items[stack.name] : undefined;
        const src = def ? imageUrl(def.image) : null;
        return (
          <div
            key={i}
            className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[0.5vh] border-[0.1vh] border-white/8 bg-black/30 [box-shadow:inset_0_0_3vh_1vh_rgba(0,0,0,0.2)]"
            style={
              def?.rarity
                ? {
                    backgroundColor: tint(def.rarity, 0.22),
                    borderColor: tint(def.rarity, 0.45),
                  }
                : undefined
            }
          >
            <span className="absolute inset-0 flex items-center justify-center text-[6vh] leading-none font-medium text-white/5">
              {i + 1}
            </span>
            {stack && (
              <span className="absolute top-[0.6vh] left-[0.7vh] flex items-baseline gap-[0.2vh] text-[1vh] text-white">
                {stack.count}
                <span className="text-[0.9vh] text-white/50">x</span>
              </span>
            )}
            {src && (
              <img
                src={src}
                alt=""
                draggable={false}
                className="relative max-h-[60%] max-w-[60%] object-contain"
              />
            )}
            {def && (
              <span className="absolute bottom-[0.6vh] w-full truncate px-[0.8vh] text-center text-[1vh] text-white/60">
                {def.label}
              </span>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
