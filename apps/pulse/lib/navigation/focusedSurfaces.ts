const focusedGamePrefixes = [
  '/value-guess',
  '/location-guess',
  '/play-jamie',
  '/retail-clash',
  '/pulse-quest',
];

const operatorSurfacePrefixes = [
  '/command-center',
  '/jamie-chat',
  '/admin',
];

export function isFocusedGameSurface(pathname?: string | null) {
  return matchesPrefix(pathname, focusedGamePrefixes);
}

export function isOperatorSurface(pathname?: string | null) {
  return matchesPrefix(pathname, operatorSurfacePrefixes);
}

export function isLightweightGlobalSurface(pathname?: string | null) {
  return isFocusedGameSurface(pathname) || isOperatorSurface(pathname);
}

function matchesPrefix(pathname: string | null | undefined, prefixes: string[]) {
  return prefixes.some((prefix) => pathname?.startsWith(prefix));
}
