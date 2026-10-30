import { aiLogChannels, createDatabaseTables } from "@aicore-fivem/lib/server"
import { ResourceName } from "common"
import { log } from "./log"
import { restoreOnline } from "./session"
import "./open"
import "./actions"
import "./use"
import "./shop"
import "./exports"
import "./compat/ox"
import "./compat/qb"

aiLogChannels({
  moves: { active: false },
  drops: {},
  gives: {},
  purchases: {},
  crafting: {},
})

createDatabaseTables(ResourceName, "sql/main.sql")
  .then(restoreOnline)
  .catch((error: unknown) => log.error("database setup failed", error))
