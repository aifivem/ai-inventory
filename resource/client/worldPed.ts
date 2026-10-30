import { cache, TickLoop } from "@aicore-fivem/lib/client";

/** The screen area (0 - 1) the equipment column keeps for the character. */
export interface PedArea {
  x: number;
  top: number;
  bottom: number;
}

type Vec = [number, number, number];

/** Metres of body the area shows: bigger = farther and smaller. */
const PED_HEIGHT = 1.62;
/** Degrees the copy turns toward the inventory on the right. */
const TURN = 15;
/** Share of the screen height the copy sits above the middle of its area. */
const RAISE = 0.06;
/** A small copy right in front of the lens fills the same area without reaching the ground or walls. */
const SCALE = 0.2;
const SMOOTH_FRAMES = 5;

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const vec = (v: number[]): Vec => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];

/** The world point under a screen position, `depth` metres in front of the camera plane. */
function screenPoint(sx: number, sy: number, depth: number): Vec {
  const [, forward] = GetWorldCoordFromScreenCoord(0.5, 0.5);
  const [origin, dir] = GetWorldCoordFromScreenCoord(sx, sy);
  const f = vec(forward);
  const d = vec(dir);
  const along = Math.max(0.1, d[0] * f[0] + d[1] * f[1] + d[2] * f[2]);
  return add(vec(origin), mul(d, depth / along));
}

/**
 * The equipment column's character (tgiann-inventory's grid layout): a local copy of the player stands in front of
 * the game camera, just far enough that the whole body fills the area the NUI keeps for it, upright on screen,
 * turned toward the inventory and lit from the front. The player's own ped hides meanwhile.
 */
class WorldPed {
  private ped = 0;
  private area: PedArea | null = null;
  private readonly history: Vec[] = [];
  private readonly frame = new TickLoop(() => this.place());

  get active(): boolean {
    return this.area !== null;
  }

  show(area: PedArea): void {
    this.area = area;
    if (!this.ped || !DoesEntityExist(this.ped)) this.create();
    this.frame.set(true);
  }

  hide(): void {
    this.area = null;
    this.frame.set(false);
    this.history.length = 0;
    if (this.ped && DoesEntityExist(this.ped)) DeleteEntity(this.ped);
    this.ped = 0;
  }

  /** The clothes changed (the clothes column): the copy wears them too. */
  refresh(): void {
    if (this.ped && DoesEntityExist(this.ped)) ClonePedToTarget(cache.ped, this.ped);
  }

  private create(): void {
    const model = GetEntityModel(cache.ped);
    const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
    const ped = CreatePed(4, model, x, y, z - 10, 0, false, false);
    FreezeEntityPosition(ped, true);
    SetEntityCollision(ped, false, false);
    SetEntityInvincible(ped, true);
    SetBlockingOfNonTemporaryEvents(ped, true);
    ClonePedToTarget(cache.ped, ped);
    this.ped = ped;
  }

  private place(): void {
    const area = this.area;
    const ped = this.ped;
    if (!area || !ped || !DoesEntityExist(ped)) return;
    const share = Math.max(0.1, area.bottom - area.top);
    const halfV = Math.tan(((GetFinalRenderedCamFov() * Math.PI) / 180) * 0.5);
    const depth = (PED_HEIGHT * SCALE) / (share * 2 * halfV);
    this.history.push(screenPoint(area.x, (area.top + area.bottom) * 0.5 - RAISE, depth));
    if (this.history.length > SMOOTH_FRAMES) this.history.shift();
    let point: Vec = [0, 0, 0];
    for (const p of this.history) point = add(point, p);
    point = mul(point, 1 / this.history.length);
    this.face(ped, point);
    // Without these the copy turns its head and steps toward its own heading against the matrix every frame.
    SetIkTarget(ped, 1, ped, 12844, 0, 0, 0, 0, -1, -1);
    ForcePedMotionState(ped, GetHashKey("MotionState_None"), false, 1, true);
    SetEntityLocallyInvisible(cache.ped);
    const light = screenPoint(area.x, area.top + share * 0.3 - RAISE, depth * 0.6);
    DrawLightWithRange(light[0], light[1], light[2], 255, 255, 255, depth * 2, 1.2);
  }

  /** Faces the camera with the camera's own up axis (upright on screen at any pitch), turned by TURN degrees. */
  private face(ped: number, point: Vec): void {
    const [rx = 0, , rz = 0] = GetFinalRenderedCamRot(2);
    const pitch = (rx * Math.PI) / 180;
    const yaw = (rz * Math.PI) / 180;
    const camForward: Vec = [
      -Math.sin(yaw) * Math.cos(pitch),
      Math.cos(yaw) * Math.cos(pitch),
      Math.sin(pitch),
    ];
    const up = cross([Math.cos(yaw), Math.sin(yaw), 0], camForward);
    const turn = (TURN * Math.PI) / 180;
    const back = mul(camForward, -1);
    const forward = add(mul(back, Math.cos(turn)), mul(cross(up, back), Math.sin(turn)));
    const right = cross(forward, up);
    const [f, r, u] = [mul(forward, SCALE), mul(right, SCALE), mul(up, SCALE)];
    SetEntityMatrix(ped, f[0], f[1], f[2], r[0], r[1], r[2], u[0], u[1], u[2], point[0], point[1], point[2]);
  }
}

export const worldPed = new WorldPed();

on("onResourceStop", (resource: string) => {
  if (resource === GetCurrentResourceName()) worldPed.hide();
});
