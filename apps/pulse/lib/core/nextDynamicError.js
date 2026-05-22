export function isNextDynamicServerUsage(error) {
  return (
    error?.digest === 'DYNAMIC_SERVER_USAGE' ||
    error?.description?.includes("couldn't be rendered statically") ||
    error?.message?.includes("couldn't be rendered statically")
  );
}
