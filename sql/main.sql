-- Tables of this resource: CREATE TABLE IF NOT EXISTS, names prefixed with the resource (ai_<name>_...),
-- every table ending with ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;".
-- Installed by createDatabaseTables on start: missing tables and columns are added, nothing is dropped,
-- keys are only created with a new table (plan indexes before the first release).

-- One row per stored inventory: `player:<charId>`, `stash:<name>[:<charId>]`, `trunk:v<vehicleId>`, `glovebox:v<vehicleId>`
-- (owned vehicles of ai-vehicles; `trunk:<plate>` for an owned vehicle without an id).
-- `items` is `{ "v": 1, "s": [[slot, name, count, metadata, rotated], ...] }` (resource/server/repo.ts).
CREATE TABLE IF NOT EXISTS `ai_inventory_inventories` (
  `id` VARCHAR(96) NOT NULL,
  `items` MEDIUMTEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
