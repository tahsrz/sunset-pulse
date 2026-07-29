const focusedGamePrefixes = [
  '/value-guess',
  '/location-guess',
  '/play-jamie',
  '/retail-clash',
  '/pulse-quest',
];

const operatorSurfacePrefixes = [
  '/agent',
  '/command-center',
  '/jamie-chat',
  '/admin',
];

const minimalChromeSurfacePrefixes = [
  '/agent',
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

export function isMinimalChromeSurface(pathname?: string | null) {
  return matchesPrefix(pathname, minimalChromeSurfacePrefixes);
}

function matchesPrefix(pathname: string | null | undefined, prefixes: string[]) {
  return prefixes.some((prefix) => pathname?.startsWith(prefix));
}
