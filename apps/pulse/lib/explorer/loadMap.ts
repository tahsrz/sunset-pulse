// Imported only from a client effect, so Mapbox never evaluates during SSR.
export const loadExplorerMap = () => import('@/components/ExplorerMap');
