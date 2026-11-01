import { asArgs, fail } from "@aicore-fivem/lib/shared";
import { onClientCallback, onClientEvent } from "@aicore-fivem/lib/server";
import { EVENTS } from "common/events";
import { toOpenTarget } from "common/nuiParsers";
import { inventories } from "../registry/registry";
import { scriptShops } from "../scriptShops";
import { open } from "./open";
import { forgetVehicle } from "./vehicleInventory";

on("entityRemoved", (entity: number) => forgetVehicle(entity));

onClientCallback(
  EVENTS.open,
  { args: ([raw]) => asArgs(toOpenTarget(raw)), lock: true },
  (source, target) => {
    if (!inventories.playerOf(source)) return fail("INV_ERR_BUSY");
    scriptShops.close(source);
    return open(source, target);
  },
);

onClientEvent(EVENTS.close, (source) => {
  scriptShops.close(source);
  inventories.close(source);
});
