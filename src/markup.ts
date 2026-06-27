import type { InjectionKey, Ref } from 'vue'
import type { Names } from './core'

// Контекст разметки: общий для дерева JSON. Хранит имена (essential state) и
// действия именования. Имя на одну форму: `submit` принимает имя, лишь если оно
// свободно для формы позиции (см. `nameFreeFor`); занятое другой формой — нет.
export type MarkupCtx = {
  names: Names
  editing: Ref<string | null>
  nameOf: (path: string) => string | undefined
  start: (path: string) => void
  cancel: () => void
  submit: (path: string, name: string) => void
  clear: (path: string) => void
}

export const MARKUP: InjectionKey<MarkupCtx> = Symbol('markup')
