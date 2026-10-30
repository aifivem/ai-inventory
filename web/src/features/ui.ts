import { useSyncExternalStore } from "react"

export type AmountAction = "give" | "drop" | "split"

export interface MenuState {
  inv: string
  slot: number
  x: number
  y: number
}

export interface AmountState {
  action: AmountAction
  inv: string
  slot: number
  max: number
}

/** Which item menu or amount dialog is open; screen-local, not server data. */
class UiStore {
  menu: MenuState | null = null
  amount: AmountState | null = null
  private readonly listeners = new Set<() => void>()
  private version = 0

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  snapshot = (): number => this.version

  setMenu(menu: MenuState | null): void {
    this.menu = menu
    this.emit()
  }

  setAmount(amount: AmountState | null): void {
    this.amount = amount
    this.emit()
  }

  private emit(): void {
    this.version++
    for (const listener of this.listeners) listener()
  }
}

export const ui = new UiStore()

export function useUi(): UiStore {
  useSyncExternalStore(ui.subscribe, ui.snapshot)
  return ui
}
