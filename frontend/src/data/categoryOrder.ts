/**
 * Explicit, hand-picked browsing order on the homepage:
 * sneakers → formal shoes → slippers → watches → perfumes → shades → ladies purse.
 * Anything that doesn't match one of these keys (added later) falls through to
 * the end, sorted by productCount, so a new category doesn't need a code change
 * to appear sensibly. Matched against category.name (case-insensitive, partial
 * match) — swap to slug matching if you'd rather, it's more robust than name text.
 */
export const CATEGORY_ORDER = [
  "shoes",
  "formal shoes",
  "slippers",
  "watches",
  "perfumes & deos",
  "shades",
  "ladies purse",
];