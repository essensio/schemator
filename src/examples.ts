// Каталог примеров JSON. Идентификаторы фиксированы (статические uuid) — выбор
// примера в строке состояния опознаётся по нему; источник истины — сам текст.

export type Example = {
  id: string
  title: string
  json: string
}

export const examples: Example[] = [
  {
    id: '0a7f3c12-5b8e-4d21-9f3a-1c2b4e6d8a90',
    title: 'Заказы',
    json: `{
  "orders": [
    { "address": "Машиностроителей 15", "date": "2024-04-23", "qty": 2 },
    { "address": "Ленина 1", "date": "2024-04-24", "qty": 5 }
  ]
}`,
  },
  {
    id: '1b8e4d23-6c9f-4e32-8a4b-2d3c5f7e9b01',
    title: 'Товары',
    json: `[
  { "productId": 1, "productName": "A green door", "price": 12.50, "tags": ["home", "green"] },
  { "productId": 2, "productName": "An ice sculpture", "price": 25.00, "tags": ["cold", "ice"] }
]`,
  },
  {
    id: '2c9f5e34-7da0-4f43-9b5c-3e4d6a8f0c12',
    title: 'Разные поля',
    json: `[
  { "id": 1, "name": "A" },
  { "id": 2, "name": "B", "tag": "new" }
]`,
  },
  {
    id: '3da06f45-8eb1-4054-ac6d-4f5e7b9a1d23',
    title: 'Клиент с заказами',
    json: `{
  "name": "Пятёрочка",
  "address": { "city": "Москва", "street": "Ленина 1" },
  "orders": [
    { "date": "2024-04-23", "qty": 2 },
    { "date": "2024-04-24", "qty": 5 }
  ]
}`,
  },
]
