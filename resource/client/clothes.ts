import { cache, onCache, player } from "@aicore-fivem/lib/client";
import { sleep } from "@aicore-fivem/lib/shared";
import {
  CLOTHES,
  type ClothesId,
  type ClothesPiece,
  type ClothesState,
} from "common/clothes";

/** A worn drawable by collection and local index (never a global index: DLC order differs per server). */
interface Worn {
  collection: string;
  index: number;
  texture: number;
}

const FEMALE = GetHashKey("mp_f_freemode_01");
const FREEMODE = new Set([GetHashKey("mp_m_freemode_01"), FEMALE]);

function readComponent(ped: number, id: number): Worn {
  const drawable = GetPedDrawableVariation(ped, id);
  return {
    collection: GetPedCollectionNameFromDrawable(ped, id, drawable),
    index: GetPedCollectionLocalIndexFromDrawable(ped, id, drawable),
    texture: GetPedTextureVariation(ped, id),
  };
}

function readProp(ped: number, id: number): Worn | null {
  const prop = GetPedPropIndex(ped, id);
  if (prop < 0) return null;
  return {
    collection: GetPedCollectionNameFromProp(ped, id, prop),
    index: GetPedCollectionLocalIndexFromProp(ped, id, prop),
    texture: GetPedPropTextureIndex(ped, id),
  };
}

const setComponent = (ped: number, id: number, w: Worn) =>
  SetPedCollectionComponentVariation(
    ped,
    id,
    w.collection,
    w.index,
    w.texture,
    0,
  );

/**
 * Clothes taken off from the inventory screen: the piece is replaced by its "off" drawable (props cleared) and what
 * was worn is kept here, so the same click puts it back. Ped clothes replicate by themselves; nothing is sent.
 */
class Wardrobe {
  private readonly kept = new Map<ClothesId, Worn[]>();
  private busy = false;

  private female(ped: number): boolean {
    return GetEntityModel(ped) === FEMALE;
  }

  private worn(ped: number, piece: ClothesPiece): boolean {
    if (piece.kind === "prop") return GetPedPropIndex(ped, piece.id) >= 0;
    if (!FREEMODE.has(GetEntityModel(ped))) return false;
    const off = this.female(ped) ? piece.off.female : piece.off.male;
    return GetPedDrawableVariation(ped, piece.id) !== off;
  }

  state(): ClothesState {
    const ped = cache.ped;
    const out = {} as ClothesState;
    for (const [id, piece] of CLOTHES) {
      const worn = this.worn(ped, piece);
      out[id] = { worn, can: !this.busy && (worn || this.kept.has(id)) };
    }
    return out;
  }

  /** Takes the piece off or puts the kept one back on, with its animation; resolves when done. */
  async toggle(id: ClothesId): Promise<void> {
    const piece = CLOTHES.find(([key]) => key === id)?.[1];
    const ped = cache.ped;
    if (!piece || this.busy || cache.vehicle !== false) return;
    const worn = this.worn(ped, piece);
    if (!worn && !this.kept.has(id)) return;
    this.busy = true;
    await player.playAnim(piece.anim.dict, piece.anim.clip, {
      flag: piece.anim.flag,
      duration: piece.anim.ms,
    });
    await sleep(piece.anim.ms);
    if (worn) this.takeOff(ped, id, piece);
    else this.putOn(ped, id, piece);
    this.busy = false;
  }

  private takeOff(ped: number, id: ClothesId, piece: ClothesPiece): void {
    if (piece.kind === "prop") {
      const w = readProp(ped, piece.id);
      if (w) this.kept.set(id, [w]);
      ClearPedProp(ped, piece.id);
      return;
    }
    const female = this.female(ped);
    const parts = [{ id: piece.id, off: piece.off }, ...(piece.extra ?? [])];
    this.kept.set(
      id,
      parts.map((p) => readComponent(ped, p.id)),
    );
    for (const p of parts)
      SetPedComponentVariation(
        ped,
        p.id,
        female ? p.off.female : p.off.male,
        0,
        0,
      );
  }

  private putOn(ped: number, id: ClothesId, piece: ClothesPiece): void {
    const kept = this.kept.get(id);
    this.kept.delete(id);
    if (!kept) return;
    if (piece.kind === "prop") {
      const w = kept[0];
      if (w)
        SetPedCollectionPropIndex(
          ped,
          piece.id,
          w.collection,
          w.index,
          w.texture,
          true,
        );
      return;
    }
    const parts = [piece.id, ...(piece.extra ?? []).map((p) => p.id)];
    parts.forEach((part, i) => {
      const w = kept[i];
      if (w) setComponent(ped, part, w);
    });
  }

  /** A new ped (model change, character switch): what was kept belongs to the old one. */
  reset(): void {
    this.kept.clear();
  }
}

export const wardrobe = new Wardrobe();
onCache("ped", () => wardrobe.reset());
