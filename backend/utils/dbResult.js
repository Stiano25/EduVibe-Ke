/**
 * Resolve a Supabase single-row query.
 * PGRST116 = zero rows for .single() — treat as not found (null), not a 500.
 */
export const oneOrNull = (data, error, mapFn) => {
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? mapFn(data) : null;
};
