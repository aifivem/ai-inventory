import { controls } from "@aicore-fivem/lib/client";
import { content } from "./content";

/** Weapon wheel (TAB), scroll and number-key weapon switching: off while the panel setting says so. */
const WHEEL_CONTROLS = [
  37, 14, 15, 16, 17, 99, 100, 115, 116, 157, 158, 159, 160, 161, 162, 163, 164,
  165,
];

function apply(): void {
  if (content.settings.noWeaponWheel)
    controls.disable("weaponwheel", WHEEL_CONTROLS);
  else controls.enable("weaponwheel");
}
apply();
content.subscribe((file) => file === "settings" && apply());
