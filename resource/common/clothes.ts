/** The clothes column of the inventory screen: pieces a player takes off and puts back on with a click. No natives. */

export type ClothesId =
  | "hat"
  | "mask"
  | "neck"
  | "ear"
  | "shirt"
  | "glasses"
  | "vest"
  | "bag"
  | "bracelet"
  | "watch"
  | "pants"
  | "shoes";

interface Anim {
  dict: string;
  clip: string;
  ms: number;
  flag: number;
}

/** A freemode component: the drawable worn while the piece is off (base game, per sex) and parts changed with it. */
export interface ComponentPiece {
  kind: "component";
  id: number;
  off: { male: number; female: number };
  extra?: Array<{ id: number; off: { male: number; female: number } }>;
  anim: Anim;
}

/** A prop (any ped): cleared while off. */
export interface PropPiece {
  kind: "prop";
  id: number;
  anim: Anim;
}

export type ClothesPiece = ComponentPiece | PropPiece;

const anim = (dict: string, clip: string, ms: number, flag = 51): Anim => ({
  dict,
  clip,
  ms,
  flag,
});
const TIE_NO = anim("clothingtie", "try_tie_negative_a", 1200);
const WRIST = anim("nmt_3_rcm-10", "cs_nigel_dual-10", 1200);

/** In screen order: two columns, top to bottom. */
export const CLOTHES: ReadonlyArray<[ClothesId, ClothesPiece]> = [
  [
    "hat",
    {
      kind: "prop",
      id: 0,
      anim: anim("missheist_agency2ahelmet", "take_off_helmet_stand", 1200),
    },
  ],
  [
    "mask",
    {
      kind: "component",
      id: 1,
      off: { male: 0, female: 0 },
      anim: anim("mp_masks@standard_car@ds@", "put_on_mask", 800),
    },
  ],
  [
    "neck",
    {
      kind: "component",
      id: 7,
      off: { male: 0, female: 0 },
      anim: anim("clothingtie", "try_tie_positive_a", 2100),
    },
  ],
  [
    "ear",
    { kind: "prop", id: 2, anim: anim("mp_cp_stolen_tut", "b_think", 900) },
  ],
  [
    "shirt",
    {
      kind: "component",
      id: 11,
      off: { male: 252, female: 74 },
      extra: [
        { id: 8, off: { male: 15, female: 15 } },
        { id: 3, off: { male: 15, female: 15 } },
        { id: 10, off: { male: 0, female: 0 } },
      ],
      anim: TIE_NO,
    },
  ],
  [
    "glasses",
    { kind: "prop", id: 1, anim: anim("clothingspecs", "take_off", 1400) },
  ],
  [
    "vest",
    { kind: "component", id: 9, off: { male: 0, female: 0 }, anim: TIE_NO },
  ],
  [
    "bag",
    {
      kind: "component",
      id: 5,
      off: { male: 0, female: 0 },
      anim: anim("anim@heists@ornate_bank@grab_cash", "intro", 1600),
    },
  ],
  ["bracelet", { kind: "prop", id: 7, anim: WRIST }],
  ["watch", { kind: "prop", id: 6, anim: WRIST }],
  [
    "pants",
    {
      kind: "component",
      id: 4,
      off: { male: 61, female: 14 },
      anim: anim("re@construction", "out_of_breath", 1300),
    },
  ],
  [
    "shoes",
    {
      kind: "component",
      id: 6,
      off: { male: 34, female: 35 },
      anim: anim("random@domestic", "pickup_low", 1200, 0),
    },
  ],
];

/** What the screen shows per piece: worn now, and whether a click can change it (off and nothing to put back = no). */
export type ClothesState = Record<ClothesId, { worn: boolean; can: boolean }>;

export const isClothesId = (v: unknown): v is ClothesId =>
  typeof v === "string" && CLOTHES.some(([id]) => id === v);
