import { onStop } from "@aicore-fivem/lib/client";
import { worldPed } from "./worldPed";

onStop(() => worldPed.hide());
