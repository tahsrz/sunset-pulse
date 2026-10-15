export function isRemoteImageSource(source: string | null | undefined) {
  return /^https?:\/\//i.test(source?.trim() || '');
}
