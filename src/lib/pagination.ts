export type PageParams = { page: number; limit: number; skip: number };

export function parsePage(
  params: URLSearchParams,
  opts: { defaultLimit?: number; maxLimit?: number } = {},
): PageParams {
  const maxLimit = opts.maxLimit ?? 100;
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(params.get("limit")) || opts.defaultLimit || 25)));
  return { page, limit, skip: (page - 1) * limit };
}

export function envelope<T>(items: T[], total: number, { page, limit }: PageParams) {
  return { items, total, page, limit, hasMore: page * limit < total };
}
