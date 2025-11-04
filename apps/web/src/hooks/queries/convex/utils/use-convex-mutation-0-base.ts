/**
 * Add auth check to convex mutation to a mutation isn't run before auth is ready
 * but queue all invocations while auth is pending to play them back once auth is ready
 */
