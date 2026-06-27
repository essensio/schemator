import { describe, it, expect } from 'vitest'
import {
  analyze,
  emitEssensio,
  valueKind,
  elementNameKind,
  unionMembers,
  signatureOfValue,
  isValidTypeName,
} from '../src/core'

const ORDERS = `{
  "orders": [
    { "address": "Машиностроителей 15", "date": "2024-04-23", "qty": 2 },
    { "address": "Ленина 1",            "date": "2024-04-24", "qty": 5 }
  ]
}`

function ok(source: string, names: Record<string, string>): string {
  const a = analyze(source, names)
  if (a.status !== 'ok') throw new Error(`ожидался ok, получено ${a.status}`)
  return a.essensio
}

describe('классификация значения', () => {
  it('виды', () => {
    expect(valueKind(1)).toBe('scalar')
    expect(valueKind(null)).toBe('scalar')
    expect(valueKind({})).toBe('tuple')
    expect(valueKind([{ x: 1 }, { x: 2 }])).toBe('relation')
    expect(valueKind([{ a: 1, b: 2 }, { a: 3 }])).toBe('relation') // разные поля — объединяются
    expect(valueKind([1, 'a'])).toBe('relation') // разнородный — отношение с union элемента
    expect(valueKind([])).toBe('empty')
  })
})

describe('сигнатуры формы', () => {
  it('независимы от значений и порядка ключей', () => {
    expect(signatureOfValue({ x: 1, y: 2 })).toBe(signatureOfValue({ y: 9, x: 8 }))
    expect(signatureOfValue([{ x: 1 }, { x: 2 }])).toBe('{"x":Число}[]')
  })
})

describe('печать essensio (через движок)', () => {
  it('скаляры и краевые формы', () => {
    expect(emitEssensio({}, {})).toBe('{}')
    expect(emitEssensio([1, 2, 3], {})).toBe('Число[]')
    expect(emitEssensio([], {})).toBe('{}[]') // пустой массив: элемент — пустой кортеж-заглушка
    expect(emitEssensio({ a: null }, {})).toBe('{a: Пусто}')
    expect(emitEssensio({ 'order-id': 1 }, {})).toBe('{"order-id": Число}')
  })

  it('разнородный массив → union элемента', () => {
    expect(emitEssensio([1, 'a'], {})).toBe('(Число | Строка)[]')
    expect(emitEssensio([1, null], {})).toBe('(Число | Пусто)[]') // необязательность
    expect(emitEssensio([{ x: 1 }, null], {})).toBe('({x: Число} | Пусто)[]')
    expect(emitEssensio([1, 'a', true], {})).toBe('(Число | Строка | Булево)[]')
  })

  it('union: имя всему союзу — по пути позиции', () => {
    expect(emitEssensio([1, 'a'], { '$[]': 'Значение' })).toBe('Значение = Число | Строка\n\nЗначение[]')
    expect(emitEssensio([{ x: 1 }, null], { '$[]': 'Точка' })).toBe(
      'Точка = {x: Число} | Пусто\n\nТочка[]',
    )
  })

  it('union: имя члену — по пути `путь|тег`', () => {
    expect(emitEssensio([1, 'a'], { '$[]|Число': 'Целое', '$[]|Строка': 'Текст' })).toBe(
      'Целое = Число\nТекст = Строка\n\n(Целое | Текст)[]',
    )
    // кортеж-член
    expect(emitEssensio([{ x: 1 }, null], { '$[]|{}': 'Заказ' })).toBe(
      'Заказ = {x: Число}\n\n(Заказ | Пусто)[]',
    )
  })

  it('union: имя члену и всему союзу сочетаются', () => {
    expect(emitEssensio([1, 'a'], { '$[]': 'Значение', '$[]|Число': 'Целое' })).toBe(
      'Целое = Число\nЗначение = Целое | Строка\n\nЗначение[]',
    )
  })

  it('массив объектов с разными полями — объединение в кортеж', () => {
    expect(emitEssensio([{ a: 1, b: 2 }, { a: 3 }], {})).toBe('{a: Число, b: Число}[]')
    expect(emitEssensio([{ a: 1 }, { b: 'x' }], {})).toBe('{a: Число, b: Строка}[]')
  })

  it('именование элемента отношения', () => {
    expect(ok(ORDERS, { '$.orders[]': 'Заказ' })).toBe(
      'Заказ = {address: Строка, date: Строка, qty: Число}\n\n{orders: Заказ[]}',
    )
  })

  it('отношение не именуется (таблица неявна) — имя получает только элемент', () => {
    // имя на пути отношения ($.orders) игнорируется; именуется лишь элемент
    expect(ok(ORDERS, { '$.orders': 'Заказы', '$.orders[]': 'Заказ' })).toBe(
      'Заказ = {address: Строка, date: Строка, qty: Число}\n\n{orders: Заказ[]}',
    )
  })

  it('именование скаляра — подтип-домен', () => {
    expect(ok(ORDERS, { '$.orders[].qty': 'Количество' })).toBe(
      'Количество = Число\n\n' +
        '{orders: {address: Строка, date: Строка, qty: Количество}[]}',
    )
  })
})

describe('analyze: статусы', () => {
  it('пусто и ошибка', () => {
    expect(analyze('   ', {}).status).toBe('empty')
    expect(analyze('{bad', {}).status).toBe('error')
  })
})

describe('валидация имени (движок)', () => {
  it('имена и не-имена', () => {
    expect(isValidTypeName('Заказ')).toBe(true)
    expect(isValidTypeName('order-id')).toBe(false)
    expect(isValidTypeName('or')).toBe(false)
  })
})

describe('elementNameKind: именуемая ветвь элемент-типа массива', () => {
  it('есть объекты → кортеж, независимо от порядка', () => {
    expect(elementNameKind([{ a: 1 }, { a: 2 }])).toBe('tuple')
    expect(elementNameKind([{ a: 1 }, null])).toBe('tuple')
    expect(elementNameKind([null, { a: 1 }])).toBe('tuple') // ключ бага: кортеж не первым
    expect(elementNameKind([1, { a: 1 }])).toBe('tuple')
    expect(elementNameKind([{ a: 1 }, [1]])).toBe('tuple') // кортеж + отношение
  })

  it('ровно один член-скаляр (или Пусто) → скаляр', () => {
    expect(elementNameKind([1, 2, 3])).toBe('scalar')
    expect(elementNameKind(['a'])).toBe('scalar')
    expect(elementNameKind([null])).toBe('scalar') // Пусто — тоже именуемый домен
  })

  it('союз без кортежа или отношение → именовать нечего', () => {
    expect(elementNameKind([1, 'a'])).toBe(null) // Число | Строка
    expect(elementNameKind([1, null])).toBe(null) // Число | Пусто
    expect(elementNameKind([[1], [2]])).toBe(null) // отношение само не именуется
  })
})

describe('unionMembers: члены союза для UI', () => {
  it('одиночный тип — не союз', () => {
    expect(unionMembers([1, 2, 3])).toEqual([])
    expect(unionMembers([{ a: 1 }, { a: 2 }])).toEqual([])
    expect(unionMembers([[1], [2]])).toEqual([])
  })

  it('скалярный союз — члены-домены, именуемы', () => {
    expect(unionMembers([1, 'a'])).toEqual([
      { tag: 'Число', label: 'Число', kind: 'scalar', nameable: true },
      { tag: 'Строка', label: 'Строка', kind: 'scalar', nameable: true },
    ])
  })

  it('кортеж-или-Пусто — канонический порядок', () => {
    expect(unionMembers([null, { a: 1 }])).toEqual([
      { tag: '{}', label: '{…}', kind: 'tuple', nameable: true },
      { tag: 'Пусто', label: 'Пусто', kind: 'scalar', nameable: true },
    ])
  })

  it('отношение-член — не именуется', () => {
    const ms = unionMembers([[1], { a: 1 }])
    expect(ms.find((m) => m.tag === '[]')).toMatchObject({ nameable: false })
  })
})
