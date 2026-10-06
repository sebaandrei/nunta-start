import { type GodparentPair, MAX_GODPARENT_PAIRS } from './schema';

export function addGodparentPair(list: GodparentPair[]): GodparentPair[] {
  if (list.length >= MAX_GODPARENT_PAIRS) return list;
  return [...list, { godmother: '', godfather: '' }];
}

export function updateGodparentPair(
  list: GodparentPair[],
  index: number,
  patch: Partial<GodparentPair>,
): GodparentPair[] {
  return list.map((pair, i) => (i === index ? { ...pair, ...patch } : pair));
}

export function removeGodparentPair(list: GodparentPair[], index: number): GodparentPair[] {
  return list.filter((_, i) => i !== index);
}
