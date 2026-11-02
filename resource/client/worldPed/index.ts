import { onStop } from "@aifivem/lib/client";
import { worldPed } from "./worldPed";

onStop(() => worldPed.hide());
