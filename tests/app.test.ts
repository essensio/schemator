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
