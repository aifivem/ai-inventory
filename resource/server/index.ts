import { aiLogChannels } from "@aicore-fivem/lib/server";
import { prepareDatabase } from "./repo";
import { log } from "./log";
import "./session";
import "./open";
import "./actions";
import "./use";
import "./shop";
import "./exports";
import "./compat/ox";
import "./compat/qb";

aiLogChannels({
  moves: { active: false },
  drops: {},
  gives: {},
  purchases: {},
  crafting: {},
});

prepareDatabase().catch((error: unknown) =>
  log.error("database setup failed", error),
);
