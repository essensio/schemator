<script setup lang="ts">
import { computed, inject } from 'vue'
import type { JsonValue } from '../core'
import { valueKind, signatureOfValue, isValidTypeName } from '../core'
import { MARKUP } from '../markup'
import TypeControl from './TypeControl.vue'

// Ходим по JSON-значению с путём. Вид узла берём из valueKind (единый источник),
// имя — из карты по пути. plain — режим «эхо»: данные без контрола и подсветки;
// в массиве интерактивен только первый элемент (образец типа).
const props = defineProps<{ value: JsonValue; path: string; plain?: boolean }>()
const ctx = inject(MARKUP)!

const LIMIT = 25
const kind = computed(() => valueKind(props.value))
const name = computed(() => ctx.nameOf(props.path))
const signature = computed(() => signatureOfValue(props.value))

const obj = computed(() => props.value as Record<string, JsonValue>)
const keys = computed(() => Object.keys(obj.value))
const arr = computed(() => props.value as JsonValue[])
const shown = computed(() => arr.value.slice(0, LIMIT))
const hidden = computed(() => Math.max(0, arr.value.length - LIMIT))

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
    <TypeControl v-if="!plain" :path="path" :signature="signature" kind="scalar" />
  </span>

  <!-- кортеж: подсветка amber у образца, если анонимен -->
  <span
    v-else-if="kind === 'tuple'"
    class="inline-block align-top"
    :class="highlight ? 'rounded bg-amber-50 px-1.5 ring-1 ring-amber-200' : ''"
  >
    <TypeControl v-if="!plain" :path="path" :signature="signature" kind="tuple" />
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

  <!-- отношение: именуемо (`Заказы = Заказ[]`); все элементы, первый интерактивен -->
  <span v-else-if="kind === 'relation'" class="inline-block align-top">
    <TypeControl v-if="!plain" :path="path" :signature="signature" kind="relation" />
    <span class="text-slate-400"> [</span>
    <div class="pl-4">
      <div v-for="(item, i) in shown" :key="i">
        <JsonNode
          :value="item"
          :path="`${path}[]`"
          :plain="plain || i > 0"
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

  <!-- разнородный массив: сырьё -->
  <span v-else class="inline-block align-top">
    <span class="mr-1 text-xs italic text-amber-700">сырьё</span>
    <span class="text-slate-400">[</span>
    <div class="pl-4">
      <div v-for="(item, i) in arr" :key="i">
        <JsonNode :value="item" :path="`${path}[${i}]`" :plain="plain" /><span v-if="i < arr.length - 1" class="text-slate-400">,</span>
      </div>
    </div>
    <span class="text-slate-400">]</span>
  </span>
</template>
