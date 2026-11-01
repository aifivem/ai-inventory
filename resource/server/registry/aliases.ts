/** Other names of inventories: `trunk:<plate>` of an owned vehicle stored under its vehicle id. */
export class InventoryAliases {
  /** Alias -> inventory id. */
  private readonly aliases = new Map<string, string>();
  /** Inventory id -> its alias (one each, gone when the inventory leaves memory). */
  private readonly aliasOf = new Map<string, string>();

  idOf(name: string): string | undefined {
    return this.aliases.get(name);
  }

  /** Lets scripts find inventory `id` under `name` too (until another inventory takes the name or it unloads). */
  set(name: string, id: string): void {
    if (name === id) return;
    const old = this.aliasOf.get(id);
    if (old !== undefined && old !== name && this.aliases.get(old) === id)
      this.aliases.delete(old);
    const previous = this.aliases.get(name);
    if (previous !== undefined && previous !== id)
      this.aliasOf.delete(previous);
    this.aliases.set(name, id);
    this.aliasOf.set(id, name);
  }

  /** The inventory left memory: its alias goes too (unless another inventory took the name since). */
  drop(id: string): void {
    const name = this.aliasOf.get(id);
    if (name === undefined) return;
    this.aliasOf.delete(id);
    if (this.aliases.get(name) === id) this.aliases.delete(name);
  }
}
