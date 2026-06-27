// Приёмка (tester): враждебные кейсы для именования union-типа.
// Чёрный ящик: вход (JSON + имена / клики) → текст схемы / поведение UI.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { emitEssensio, unionMembers } from '../src/core'
import App from '../src/App.vue'

// ── Ядро: краевые формы союза ────────────────────────────────────────────────
describe('ПРИЁМКА ядро: краевые входы союза', () => {
  it('один элемент — союза нет (это не разнородный массив)', () => {
    expect(unionMembers([1])).toEqual([])
    expect(emitEssensio([1], {})).toBe('Число[]')
  })

  it('три разных скаляра — все три члена именуемы по тегам', () => {
    expect(emitEssensio([1, 'a', true], { '$[]|Число': 'И', '$[]|Строка': 'С', '$[]|Булево': 'Б' })).toBe(
      'И = Число\nС = Строка\nБ = Булево\n\n(И | С | Б)[]',
    )
  })

  it('вложенный союз: массив массивов разнородных', () => {
    // [[1,"a"],[2]] → внешний — отношение, элемент — (Число|Строка)[]
    expect(emitEssensio([[1, 'a'], [2]], {})).toBe('(Число | Строка)[][]')
    // имя внутреннему союзу по вложенному пути
    expect(emitEssensio([[1, 'a'], [2]], { '$[][]': 'В' })).toBe('В = Число | Строка\n\nВ[][]')
  })

  it('союз внутри кортежа-члена союза', () => {
    // [{x:1},{x:"a"},null] → кортеж сливает x в (Число|Строка); + Пусто
    const out = emitEssensio([{ x: 1 }, { x: 'a' }, null], {})
    expect(out).toBe('({x: (Число | Строка)} | Пусто)[]')
  })

  it('именовать вложенный союз поля внутри кортежа-члена', () => {
    const out = emitEssensio([{ x: 1 }, { x: 'a' }, null], { '$[]|{}': 'Зап', '$[].x': 'Зн' })
    // x внутри кортежа — путь $[].x (поле кортежа), не $[]|{}|...
    expect(out).toContain('Зн = Число | Строка')
    expect(out).toContain('Зап = {x: Зн}')
    expect(out).toContain('(Зап | Пусто)[]')
  })

  it('T | Пусто — назвать только не-Пусто член', () => {
    expect(emitEssensio([1, null], { '$[]|Число': 'Ц' })).toBe('Ц = Число\n\n(Ц | Пусто)[]')
  })

  it('назвать сам Пусто-член (необязательность как домен)', () => {
    expect(emitEssensio([1, null], { '$[]|Пусто': 'Отсутствует' })).toBe(
      'Отсутствует = Пусто\n\n(Число | Отсутствует)[]',
    )
  })

  it('кортеж-член + отношение-член: отношение не именуется, кортеж да', () => {
    // [{a:1},[1,2]] → ({a: Число} | Число[])
    const plain = emitEssensio([{ a: 1 }, [1, 2]], {})
    expect(plain).toBe('({a: Число} | Число[])[]')
    expect(emitEssensio([{ a: 1 }, [1, 2]], { '$[]|{}': 'Т' })).toBe('Т = {a: Число}\n\n(Т | Число[])[]')
    // попытка назвать отношение-член по тегу [] — должна игнорироваться (таблица неявна)
    expect(emitEssensio([{ a: 1 }, [1, 2]], { '$[]|[]': 'Реляция' })).toBe('({a: Число} | Число[])[]')
  })

  it('весь союз И отдельный член — комбинация имён', () => {
    expect(emitEssensio([1, 'a'], { '$[]': 'Знач', '$[]|Строка': 'Текст' })).toBe(
      'Текст = Строка\nЗнач = Число | Текст\n\nЗнач[]',
    )
  })
})

async function load(json: string) {
  const w = mount(App)
  await w.get('textarea').setValue(json)
  await new Promise((r) => setTimeout(r, 0))
  return w
}

// ── UI: фича «ко всем похожим» удалена ───────────────────────────────────────
describe('ПРИЁМКА UI: «ко всем похожим» убрана', () => {
  it('кнопки «ко всем» нет даже у повторяющихся кортежей одной формы', async () => {
    const w = await load('{ "a": [{"x":1}], "b": [{"x":2}] }')
    const btns = w.findAll('button').filter((b) => b.text() === 'назвать тип')
    await btns[1].trigger('click')
    await w.get('input').setValue('Точка')
    await new Promise((r) => setTimeout(r, 0))
    expect(w.findAll('button').find((b) => /ко всем/.test(b.text()))).toBeUndefined()
  })

  it('одно имя нескольким блокам одной формы — ручным повторным вводом', async () => {
    // $.a[] и $.b[] одной формы {x:Число}; даём обоим «Точка» вручную — оба приняты.
    const w = await load('{ "a": [{"x":1}], "b": [{"x":2}] }')
    const tip = () => w.findAll('button').filter((b) => b.text() === 'назвать тип')
    await tip()[1].trigger('click') // $.a[]
    await w.get('input').setValue('Точка')
    await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await tip()[1].trigger('click') // оставшийся анонимный кортеж-элемент $.b[]
    await w.get('input').setValue('Точка')
    await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    const out = w.get('pre').text()
    expect(out).toContain('Точка = {x: Число}')
    // обе позиции ссылаются на «Точка» — одно имя на две позиции одной формы
    expect(out).toContain('a: Точка[]')
    expect(out).toContain('b: Точка[]')
  })
})

// ── Конфликт имён на ВВОДЕ: занятое имя другой формы отклоняется ──────────────
// Закрытые сценарии SPEC: одно имя на одну форму; submit принимает ⟺ имя свободно.
describe('ПРИЁМКА ядро: конфликт имён закрыт (submit-предусловие)', () => {
  it('одно имя двум разным формам (кортеж vs скаляр) — второй ввод отклонён', async () => {
    // $.t[] — кортеж {a}; $.s[] — Строка. Дать кортежу «Х», затем строке «Х».
    const w = await load('{ "t": [{"a":1}], "s": ["x", "y"] }')
    const tip = w.findAll('button').filter((b) => b.text() === 'назвать тип')
    await tip[tip.length - 1].trigger('click') // $.t[] кортеж-элемент
    await w.get('input').setValue('Х')
    await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    // строка-элемент $.s[] тем же «Х» — должно отклониться (форма другая)
    const scalarBtn = w.findAll('button').find((b) => b.text() === 'назвать')!
    await scalarBtn.trigger('click')
    await w.get('input').setValue('Х')
    await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    const out = w.get('pre').text()
    // строка НЕ названа «Х»: остаётся скаляром Строка, имя Х стоит лишь на кортеже
    expect(out).toContain('Х = {a: Число}')
    expect(out).toContain('s: Строка[]')
    expect(out).not.toContain('s: Х[]')
  })

  it('коллизия внутри одного союза — член нельзя назвать именем всего союза', async () => {
    // [1,"a"]: весь союз назван «Зн»; член-Строка тем же «Зн» — отклоняется (формы разные)
    const w = await load('[1, "a"]')
    await w.findAll('button').find((b) => b.text() === 'назвать тип')!.trigger('click') // весь союз
    await w.get('input').setValue('Зн')
    await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    // член-Строка тем же именем
    const member = w.findAll('button').filter((b) => b.text() === 'назвать')
    await member[member.length - 1].trigger('click')
    await w.get('input').setValue('Зн')
    await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    const out = w.get('pre').text()
    // весь союз остался под «Зн»; Число НЕ потеряно (член-Строка не перехватил имя)
    expect(out).toBe('Зн = Число | Строка\n\nЗн[]')
  })
})
