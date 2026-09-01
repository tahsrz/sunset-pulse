export const VIBE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function toVibeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function isValidVibeSlug(value: string) {
  return VIBE_SLUG_PATTERN.test(value);
}
