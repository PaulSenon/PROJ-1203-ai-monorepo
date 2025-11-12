import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);

/**
 * Total migrations:
 *
 *
 * Many migrations
 * pnpm dlx convex run migrations:runAll
 * @example
 * ```ts
 * export const runAll = migrations.runner([
 *   internal.migrations.toto,
 * ]);
 * ```
 * assuming: `export const toto = migrations.define({...})`
 *
 * Single migration
 * pnpm dlx convex run migrations:toto
 * @example
 * ```ts
 * export const toto = migrations.runner(
 *   internal.migrations.toto
 * );
 * ```
 * assuming: `export const toto = migrations.define({...})`
 */

// DEV: DONE
// PROD: DONE
export const _1_2025_11_07_add_created_at_bulk_order_to_messages =
  migrations.define({
    table: "messages",
    migrateOne(_ctx, doc) {
      if (doc.createdAtBulkOrder) return doc;
      return {
        createdAtBulkOrder: 0,
      };
    },
  });
// pnpm dlx convex run migrations:runAddCreatedAtBulkOrder
export const runAddCreatedAtBulkOrder = migrations.runner(
  internal.migrations._1_2025_11_07_add_created_at_bulk_order_to_messages
);

// DEV: DONE
// PROD: DONE
export const _1_2025_11_12_add_user_preferences_model_to_pick_for_new_thread =
  migrations.define({
    table: "userChatPreferences",
    migrateOne(_ctx, doc) {
      if (doc.modelToPickForNewThread) return doc;
      return {
        modelToPickForNewThread: "lastUsed" as const,
      };
    },
  });
// pnpm dlx convex run migrations:runAddUserPreferencesModelToPickForNewThread
export const runAddUserPreferencesModelToPickForNewThread = migrations.runner(
  internal.migrations
    ._1_2025_11_12_add_user_preferences_model_to_pick_for_new_thread
);
