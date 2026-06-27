<script setup lang="ts">
import { computed, inject } from 'vue'
import type { JsonValue } from '../core'
import { valueKind, elementNameKind, unionMembers, isValidTypeName } from '../core'
import { MARKUP } from '../markup'
import TypeControl from './TypeControl.vue'

// Ходим по JSON-значению с путём. Вид узла берём из valueKind (единый источник),
// имя — из карты по пути. plain — режим «эхо»: данные без контрола и подсветки.
// topless — узел не рисует собственный контрол имени (его за узел рисует массив-
// родитель: имя элемент-типа привязано к массиву), но вложенные контролы остаются.
const props = defineProps<{ value: JsonValue; path: string; plain?: boolean; topless?: boolean }>()
const ctx = inject(MARKUP)!

const LIMIT = 25
const kind = computed(() => valueKind(props.value))
const name = computed(() => ctx.nameOf(props.path))

const obj = computed(() => props.value as Record<string, JsonValue>)
const keys = computed(() => Object.keys(obj.value))
const arr = computed(() => props.value as JsonValue[])
const shown = computed(() => arr.value.slice(0, LIMIT))
const hidden = computed(() => Math.max(0, arr.value.length - LIMIT))

// Элемент-тип массива: какой контрол имени рисует сам массив (см. elementNameKind).
// Образец — первый элемент-кортеж (а не индекс 0): он несёт вложенные контролы;
// нет кортежа — берём индекс 0 (отношение рекурсивно, скаляр без вложенности).
const elemKind = computed(() => (kind.value === 'relation' ? elementNameKind(arr.value) : null))
// Союз элемент-типа: непусто → именуем члены (`путь[]|тег`) и весь союз (`путь[]`);
// пусто → один тип, контрол по elemKind.
const union = computed(() => (kind.value === 'relation' ? unionMembers(arr.value) : []))
const sampleIndex = computed(() => {
  if (kind.value !== 'relation') return 0
  const i = arr.value.findIndex((v) => valueKind(v) === 'tuple')
  return i >= 0 ? i : 0
})

const highlight = computed(() => kind.value === 'tuple' && !name.value && !props.plain)

const scalarText = computed(() => {
  const v = props.value
  if (v === null) return 'null'
  if (typeof v === 'string') return JSON.stringify(v)
  return String(v)
})
const scalarClass = computed(() => {
  const v = props.value
  if (v === null) return 'text-slate-400'
  if (typeof v === 'string') return 'text-emerald-700'
  if (typeof v === 'number') return 'text-sky-700'
  return 'text-fuchsia-700'
})
const keyText = (key: string) => (isValidTypeName(key) ? key : JSON.stringify(key))
</script>

<template>
  <!-- скаляр: значение + тихая аффорданса «назвать» (подтип-домен) -->
  <span v-if="kind === 'scalar'" class="inline-flex items-center gap-1">
    <span :class="scalarClass">{{ scalarText }}</span>
    <TypeControl v-if="!plain && !topless" :path="path" kind="scalar" />
  </span>

  <!-- кортеж: подсветка amber у образца, если анонимен -->
  <span
    v-else-if="kind === 'tuple'"
    class="inline-block align-top"
    :class="highlight ? 'rounded bg-amber-50 px-1.5 ring-1 ring-amber-200' : ''"
  >
    <TypeControl v-if="!plain && !topless" :path="path" kind="tuple" />
    <template v-if="keys.length === 0">
      <span class="text-slate-400"> {}</span>
    </template>
    <template v-else>
      <span class="text-slate-400"> {</span>
      <div class="pl-4">
        <div v-for="(k, i) in keys" :key="k">
          <span class="text-slate-700">{{ keyText(k) }}</span><span class="text-slate-400">: </span><JsonNode :value="obj[k]" :path="`${path}.${k}`" :plain="plain" /><span v-if="i < keys.length - 1" class="text-slate-400">,</span>
        </div>
      </div>
      <span class="text-slate-400">}</span>
    </template>
  </span>

  <!-- отношение: само НЕ именуется (таблица неявна). Имя элемент-типа массив рисует
       у себя — один контрол, не зависящий от порядка элементов. Элементы — эхо;
       образец (первый кортеж) рендерится topless ради вложенных контролов. -->
  <span v-else-if="kind === 'relation'" class="inline-block align-top">
    <span class="text-slate-400">[</span>
    <!-- союз элемент-типа: имя каждому члену и всему союзу -->
    <span v-if="!plain && union.length" class="ml-1 inline-flex flex-wrap items-center gap-1 align-middle">
      <span class="text-slate-400">(</span>
      <template v-for="(m, i) in union" :key="m.tag">
        <span v-if="i > 0" class="text-slate-400">|</span>
        <span class="text-slate-500">{{ m.label }}</span>
        <TypeControl
          v-if="m.nameable"
          :path="`${path}[]|${m.tag}`"
          :kind="m.kind === 'tuple' ? 'tuple' : 'scalar'"
        />
      </template>
      <span class="text-slate-400">)</span>
      <span class="text-slate-400">весь союз:</span>
      <TypeControl :path="`${path}[]`" kind="tuple" />
    </span>
    <!-- один тип: кортеж/скаляр — один контрол (отношение неявно — без контрола) -->
    <TypeControl v-else-if="!plain && elemKind" :path="`${path}[]`" :kind="elemKind" />
    <div class="pl-4">
      <div v-for="(item, i) in shown" :key="i">
        <JsonNode
          :value="item"
          :path="`${path}[]`"
          :plain="plain || union.length > 0 || i !== sampleIndex"
          :topless="true"
        /><span v-if="i < shown.length - 1 || hidden > 0" class="text-slate-400">,</span>
      </div>
      <div v-if="hidden > 0" class="text-xs italic text-slate-400">… ещё {{ hidden }}</div>
    </div>
    <span class="text-slate-400">]</span>
  </span>

  <!-- пустой массив -->
  <span v-else-if="kind === 'empty'" class="text-slate-400">
    [] <span class="text-xs italic">пусто</span>
  </span>
</template>
