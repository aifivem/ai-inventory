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
import { CORE } from "@aicore-fivem/shared";
import { screen } from "./screen";
import { weapons } from "./weapons";

// The character left (switch or death screen): close the screen and put the weapon away.
on(CORE.clientPlayerUnloadedEvent, () => {
  screen.close();
  weapons.holster();
});
onServerEvent("ai-core:client:openCharacters", () => screen.close());
