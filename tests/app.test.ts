import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { examples } from '../src/examples'

describe('App — сквозной сценарий в jsdom', () => {
  it('пример → анонимная схема → именование элемента обновляет вывод', async () => {
    const w = mount(App)

    await w.findAll('button').find((b) => b.text() === 'Загрузить пример')!.trigger('click')

    expect(w.get('pre').text()).toContain(
      '{orders: {address: Строка, date: Строка, qty: Число}[]}',
    )

    // два анонимных кортежа: корень и элемент (отношение orders не именуется)
    const names = w.findAll('button').filter((b) => b.text() === 'назвать тип')
    expect(names.length).toBe(2)

    // называем элемент (второй контрол) «Заказ»
    await names[1].trigger('click')
    await w.get('input').setValue('Заказ')
    await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')

    const out = w.get('pre').text()
    expect(out).toContain('Заказ = {address: Строка, date: Строка, qty: Число}')
    expect(out).toContain('{orders: Заказ[]}')
  })

  it('массив строк показывает все элементы и даёт тип Строка[]', async () => {
    const w = mount(App)
    await w.get('textarea').setValue(
      '[{"productId":1,"productName":"A green door","price":12.50,"tags":["home","green"]}]',
    )
    await new Promise((r) => setTimeout(r, 0))

    const markup = w.find('.leading-relaxed').text()
    expect(markup).toContain('home')
    expect(markup).toContain('green')

    expect(w.get('pre').text()).toContain('tags: Строка[]')
  })

  it('выбор примера пишет его uuid в адресную строку', async () => {
    const w = mount(App)
    await w.get('select').setValue(examples[1].id)
    expect(window.location.search).toContain(examples[1].id)
  })
})

async function load(json: string) {
  const w = mount(App)
  await w.get('textarea').setValue(json)
  await new Promise((r) => setTimeout(r, 0))
  return w
}

async function name(w: Awaited<ReturnType<typeof load>>, label: string, value: string) {
  await w.findAll('button').find((b) => b.text() === label)!.trigger('click')
  await w.get('input').setValue(value)
  await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')
}

describe('контрол элемент-типа у массива (не зависит от порядка)', () => {
  it('разнородный массив: кортеж НЕ первым — именуется', async () => {
    const w = await load('[null, {"a": 1}]')
    const btn = w.findAll('button').find((b) => b.text() === 'назвать тип')
    expect(btn).toBeTruthy() // контрол есть, хотя кортеж стоит вторым
    await name(w, 'назвать тип', 'Заказ')
    const out = w.get('pre').text()
    expect(out).toContain('Заказ = {a: Число}')
    expect(out).toContain('(Заказ | Пусто)[]')
  })

  it('кортеж первым — по-прежнему именуется (без регресса)', async () => {
    const w = await load('[{"a": 1}, null]')
    expect(w.findAll('button').find((b) => b.text() === 'назвать тип')).toBeTruthy()
  })

  it('скалярный союз: имя всему союзу', async () => {
    const w = await load('[1, "a"]')
    await name(w, 'назвать тип', 'Значение') // «назвать тип» = весь союз (единственный)
    const out = w.get('pre').text()
    expect(out).toContain('Значение = Число | Строка')
    expect(out).toContain('Значение[]')
  })

  it('скалярный союз: имена членам по отдельности', async () => {
    const w = await load('[1, "a"]')
    const unnamed = () => w.findAll('button').filter((b) => b.text() === 'назвать')
    await unnamed()[0].trigger('click') // первый член — Число
    await w.get('input').setValue('Целое')
    await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')
    await unnamed()[0].trigger('click') // оставшийся член — Строка
    await w.get('input').setValue('Текст')
    await w.findAll('button').find((b) => b.text() === '✓')!.trigger('click')
    const out = w.get('pre').text()
    expect(out).toContain('Целое = Число')
    expect(out).toContain('Текст = Строка')
    expect(out).toContain('(Целое | Текст)[]')
  })

  it('однородный скалярный массив — именуется как подтип-домен', async () => {
    const w = await load('[1, 2, 3]')
    await name(w, 'назвать', 'Количество')
    const out = w.get('pre').text()
    expect(out).toContain('Количество = Число')
    expect(out).toContain('Количество[]')
  })

  it('массив массивов — внутренний скаляр остаётся именуемым', async () => {
    const w = await load('[[1], [2]]')
    await name(w, 'назвать', 'Метка')
    const out = w.get('pre').text()
    expect(out).toContain('Метка = Число')
    expect(out).toContain('Метка[][]')
  })
})
