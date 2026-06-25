// Ввод и состояние приложения. Типы essensio (AST) живут в @essensio/engine
// (`nodes`) — здесь они НЕ дублируются. Тут только то, что принадлежит schemator:
// разбираемое значение JSON, путь до узла и карта присвоенных имён.

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

/** Стабильный путь до узла: `$`, `$.orders`, `$.orders[]`, `$.orders[].addr`. */
export type Path = string

/** Имена, присвоенные узлам по пути. */
export type Names = Record<Path, string>
