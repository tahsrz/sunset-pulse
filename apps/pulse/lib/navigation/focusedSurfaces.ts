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

const standaloneSurfacePrefixes = [
  '/abidan/war-room',
  '/register',
  '/scythe',
];

const minimalChromeSurfacePrefixes = [
  '/agent',
];

function isGuidedJourney(pathname?: string | null) {
  return pathname === '/seller-plan/preview' || pathname === '/seller-plan/start' || pathname === '/buyer-plan/start';
}

export function isFocusedGameSurface(pathname?: string | null) {
  return matchesPrefix(pathname, focusedGamePrefixes);
}

export function isOperatorSurface(pathname?: string | null) {
  return matchesPrefix(pathname, operatorSurfacePrefixes);
}

export function isLightweightGlobalSurface(pathname?: string | null) {
  return isGuidedJourney(pathname) || isFocusedGameSurface(pathname) || isOperatorSurface(pathname) || matchesPrefix(pathname, standaloneSurfacePrefixes);
}

export function isMinimalChromeSurface(pathname?: string | null) {
  return pathname?.startsWith('/property-profile/') || isGuidedJourney(pathname)
    || matchesPrefix(pathname, minimalChromeSurfacePrefixes) || matchesPrefix(pathname, standaloneSurfacePrefixes);
}

function matchesPrefix(pathname: string | null | undefined, prefixes: string[]) {
  return prefixes.some((prefix) => pathname?.startsWith(prefix));
}
