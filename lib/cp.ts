// Path: lib/cp.ts

export type CpPoint = {
  cp_id: string;
  type: 'nickname' | 'place' | 'preference' | 'relationship';
  value: string;
};

export function resolveCp(points: CpPoint[]): CpPoint[] {
  return points;
}
