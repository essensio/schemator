import type { InjectionKey, Ref } from 'vue'
import type { Names } from './core'

// Контекст разметки: общий для дерева JSON. Хранит имена (essential state) и
// действия именования; группы одинаковых форм — для «применить ко всем похожим».
export type MarkupCtx = {
  names: Names
  editing: Ref<string | null>
  nameOf: (path: string) => string | undefined
  /** Сколько кортежей той же формы — для bulk-именования (структурные типы). */
  groupCount: (signature: string) => number
  start: (path: string) => void
  cancel: () => void
  submit: (path: string, signature: string, name: string, all: boolean) => void
  clear: (path: string) => void
}

export const MARKUP: InjectionKey<MarkupCtx> = Symbol('markup')
