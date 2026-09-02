export const VIBE_LIST_STATUSES = ['', 'draft', 'in_review', 'published', 'archived', 'trash'] as const;
export const VIBE_LIST_SORTS = ['updatedAt', 'title', 'status'] as const;
export const VIBE_LIST_DIRECTIONS = ['asc', 'desc'] as const;

export type VibeListQuery = {
  q: string;
  status: (typeof VIBE_LIST_STATUSES)[number];
  sort: (typeof VIBE_LIST_SORTS)[number];
  direction: (typeof VIBE_LIST_DIRECTIONS)[number];
  page: number;
};

function first(input: URLSearchParams, key: string) {
  const values = input.getAll(key);
  return values.length === 1 ? values[0] : '';
}

export function parseVibeListQuery(input: URLSearchParams): VibeListQuery {
  const rawStatus = first(input, 'status');
  const rawSort = first(input, 'sort');
  const rawDirection = first(input, 'dir') || first(input, 'direction');
  const parsedPage = Number.parseInt(first(input, 'page'), 10);

  return {
    q: first(input, 'q').trim().slice(0, 120),
    status: (VIBE_LIST_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus as VibeListQuery['status'] : '',
    sort: (VIBE_LIST_SORTS as readonly string[]).includes(rawSort) ? rawSort as VibeListQuery['sort'] : 'updatedAt',
    direction: (VIBE_LIST_DIRECTIONS as readonly string[]).includes(rawDirection) ? rawDirection as VibeListQuery['direction'] : 'desc',
    page: Number.isFinite(parsedPage) && Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1,
  };
}

export function serializeVibeListQuery(query: VibeListQuery): string {
  const normalized = parseVibeListQuery(new URLSearchParams({ q: query.q, status: query.status, sort: query.sort, dir: query.direction, page: String(query.page) }));
  const params = new URLSearchParams();
  if (normalized.q) params.set('q', normalized.q);
  if (normalized.status) params.set('status', normalized.status);
  if (normalized.sort !== 'updatedAt') params.set('sort', normalized.sort);
  if (normalized.direction !== 'desc') params.set('dir', normalized.direction);
  if (normalized.page !== 1) params.set('page', String(normalized.page));
  return params.toString();
}
