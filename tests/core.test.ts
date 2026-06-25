import { describe, it, expect } from 'vitest'
import {
  analyze,
  emitEssensio,
  valueKind,
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
    expect(valueKind([{ a: 1, b: 2 }, { a: 3 }])).toBe('relation') // разные поля — не сырьё
    expect(valueKind([1, 'a'])).toBe('raw') // объект+скаляр/разные скаляры — сырьё
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
    expect(emitEssensio([], {})).toBe('?[]')
    expect(emitEssensio([1, 'a'], {})).toBe('?[]')
    expect(emitEssensio({ a: null }, {})).toBe('{a: Пусто}')
    expect(emitEssensio({ 'order-id': 1 }, {})).toBe('{"order-id": Число}')
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

  it('именование самого отношения и его элемента', () => {
    expect(ok(ORDERS, { '$.orders': 'Заказы', '$.orders[]': 'Заказ' })).toBe(
      'Заказ = {address: Строка, date: Строка, qty: Число}\n' +
        'Заказы = Заказ[]\n\n' +
        '{orders: Заказы}',
    )
  })

  it('именование скаляра — подтип-домен', () => {
    expect(ok(ORDERS, { '$.orders[].qty': 'Количество' })).toBe(
      'Количество = Число\n\n' +
        '{orders: {address: Строка, date: Строка, qty: Количество}[]}',
    )
  })
})

describe('analyze: статусы и группы', () => {
  it('пусто и ошибка', () => {
    expect(analyze('   ', {}).status).toBe('empty')
    expect(analyze('{bad', {}).status).toBe('error')
  })

  it('одинаковые формы группируются для «применить ко всем»', () => {
    const a = analyze('{ "a": { "x": 1 }, "b": { "x": 2 } }', {})
    if (a.status !== 'ok') throw new Error(a.status)
    expect(a.groups.get(signatureOfValue({ x: 1 }))?.sort()).toEqual(['$.a', '$.b'])
  })
})

describe('валидация имени (движок)', () => {
  it('имена и не-имена', () => {
    expect(isValidTypeName('Заказ')).toBe(true)
    expect(isValidTypeName('order-id')).toBe(false)
    expect(isValidTypeName('or')).toBe(false)
  })
})
