import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
  type QueryCtx,
} from "./_generated/server";
import { INTERNAL_getCurrentUser, INTERNAL_getCurrentUserOrThrow } from "./lib";
import { mutationWithRLS, queryWithRLS } from "./rls";
import { subscriptionTiers } from "./schema";

const INTERNAL_getUserChatPreferences = async (
  ctx: QueryCtx,
  args: { userId: Id<"users"> }
) => {
  const { userId } = args;
  const userChatPreferences = await ctx.db
    .query("userChatPreferences")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();
  return userChatPreferences;
};
const INTERNAL_upsertUserChatPreferences = async (
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    patch?: Partial<Doc<"userChatPreferences">>;
  }
) => {
  const { userId, patch } = args;

  const existingUserChatPreferences = await ctx.db
    .query("userChatPreferences")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (existingUserChatPreferences) {
    await ctx.db.patch(existingUserChatPreferences._id, {
      ...patch,
      updatedAt: Date.now(),
    });
    return existingUserChatPreferences._id;
  }

  const userChatPreferencesId = await ctx.db.insert("userChatPreferences", {
    ...patch,
    userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return userChatPreferencesId;
};

export const getUserChatPreferences = queryWithRLS({
  args: {},
  handler: async (ctx) => {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    return await INTERNAL_getUserChatPreferences(ctx, { userId: user._id });
  },
});

export const upsertUserChatPreferences = mutationWithRLS({
  args: {
    patch: v.optional(
      v.object({
        preferredModelId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    return await INTERNAL_upsertUserChatPreferences(ctx, {
      userId: user._id,
      patch: args.patch,
    });
  },
});

// ==========================================
// USER MANAGEMENT - STANDARD PATTERN
// ==========================================
// Call ensureUserExists() after sign-in, then use RLS functions freely

export const ensureUserExists = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("byTokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (existingUser) {
      return existingUser;
    }

    // Create new user with free tier
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
      name: identity.name,
      tier: "free",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(userId);
  },
});

export const getCurrentUser = queryWithRLS({
  args: {},
  handler: async (ctx) => await INTERNAL_getCurrentUser(ctx),
});

export const updateUserTier = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    tier: subscriptionTiers,
    // stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byTokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();

    if (!user) throw new Error("User not found");

    // todo: check stripe api if subscription is active or throw error

    await ctx.db.patch(user._id, {
      tier: args.tier,
      // stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now(),
    });
  },
});
