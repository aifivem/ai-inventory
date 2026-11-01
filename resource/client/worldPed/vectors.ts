export type Vec = [number, number, number];

export const add = (a: Vec, b: Vec): Vec => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
export const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const vec = (v: number[]): Vec => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];

/** The world point under a screen position, `depth` metres in front of the camera plane. */
export function screenPoint(sx: number, sy: number, depth: number): Vec {
  const [, forward] = GetWorldCoordFromScreenCoord(0.5, 0.5);
  const [origin, dir] = GetWorldCoordFromScreenCoord(sx, sy);
  const f = vec(forward);
  const d = vec(dir);
  const along = Math.max(0.1, d[0] * f[0] + d[1] * f[1] + d[2] * f[2]);
  return add(vec(origin), mul(d, depth / along));
}
