import type { CardSpec } from "@aicore-fivem/shared";

export const useCard: CardSpec = {
  icon: "hand-pointer",
  title: "ADMIN_C_USE",
  desc: "ADMIN_C_USE_DESC",
  fields: [
    {
      widget: "switch",
      path: "usable",
      label: "ADMIN_F_USABLE",
      hint: "ADMIN_H_USABLE",
    },
    {
      widget: "number",
      path: "consume",
      label: "ADMIN_F_CONSUME",
      hint: "ADMIN_H_CONSUME",
      min: 0,
      max: 1000,
    },
    {
      widget: "switch",
      path: "close",
      label: "ADMIN_F_CLOSE",
      hint: "ADMIN_H_CLOSE",
    },
    {
      widget: "select",
      path: "use.anim",
      label: "ADMIN_F_ANIM",
      options: [
        { value: "none", label: "ADMIN_O_ANIM_NONE" },
        { value: "eat", label: "ADMIN_O_ANIM_EAT" },
        { value: "drink", label: "ADMIN_O_ANIM_DRINK" },
        { value: "bandage", label: "ADMIN_O_ANIM_BANDAGE" },
        { value: "armour", label: "ADMIN_O_ANIM_ARMOUR" },
      ],
    },
    {
      widget: "number",
      path: "use.time",
      label: "ADMIN_F_USE_TIME",
      hint: "ADMIN_H_USE_TIME",
      min: 0,
      max: 60_000,
      step: 250,
      unit: "ms",
    },
    {
      widget: "number",
      path: "use.status.hunger",
      label: "ADMIN_F_HUNGER",
      hint: "ADMIN_H_STATUS",
      min: -100,
      max: 100,
    },
    {
      widget: "number",
      path: "use.status.thirst",
      label: "ADMIN_F_THIRST",
      min: -100,
      max: 100,
    },
    {
      widget: "number",
      path: "use.status.stress",
      label: "ADMIN_F_STRESS",
      min: -100,
      max: 100,
    },
  ],
};

export const weaponCard: CardSpec = {
  icon: "gun",
  title: "ADMIN_C_WEAPON",
  desc: "ADMIN_C_WEAPON_DESC",
  fields: [
    {
      widget: "text",
      path: "weapon.ammo",
      label: "ADMIN_F_AMMO",
      hint: "ADMIN_H_AMMO",
      placeholder: "ADMIN_P_AMMO",
    },
    {
      widget: "switch",
      path: "weapon.throwable",
      label: "ADMIN_F_THROWABLE",
      hint: "ADMIN_H_THROWABLE",
    },
    {
      widget: "tags",
      path: "component.hashes",
      label: "ADMIN_F_COMPONENTS",
      hint: "ADMIN_H_COMPONENTS",
      placeholder: "ADMIN_P_COMPONENTS",
    },
  ],
};
