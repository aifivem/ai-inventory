import { every, onStop } from "@aicore-fivem/lib/server";
import { log } from "../log";
import { inventories } from "./registry";
import { prepareDatabase } from "./repo";

const FLUSH_MS = 30_000;

const saveNow = (why: string): void => {
  inventories
    .flush()
    .catch((error: unknown) =>
      log.error(`saving inventories failed (${why})`, error),
    );
};

every(
  FLUSH_MS,
  () => {
    saveNow("interval");
    inventories
      .sweep()
      .catch((error: unknown) =>
        log.error("unloading idle inventories failed", error),
      );
  },
  { name: "flush" },
);
on("txAdmin:events:serverShuttingDown", () => saveNow("shutdown"));
onStop(() => saveNow("resource stop"));

prepareDatabase().catch((error: unknown) =>
  log.error("database setup failed", error),
);
