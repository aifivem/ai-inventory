import "./state";
import "./weapons";
import "./screen";
import "./nuiActions";
import "./drops";
import "./places";
import "./open";
import "./use";
import "./exports";
import { onServerEvent } from "@aicore-fivem/lib/client";
import { CORE, NUI_LAYER } from "@aicore-fivem/shared";
import { screen } from "./screen";
import { weapons } from "./weapons";

// Stacking among NUI pages (`NUI_LAYER`): set at start, not left to load order.
SetNuiZindex(NUI_LAYER.screen);

// The character left (switch or death screen): close the screen and put the weapon away.
on(CORE.clientPlayerUnloadedEvent, () => {
  screen.close();
  weapons.holster();
});
onServerEvent("ai-core:client:openCharacters", () => screen.close());
import "./wheel";
