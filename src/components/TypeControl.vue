<script setup lang="ts">
import { computed, inject, nextTick, ref } from 'vue'
import { MARKUP } from '../markup'
import { isValidTypeName } from '../core'

const props = defineProps<{ path: string; kind: 'tuple' | 'scalar' }>()
const ctx = inject(MARKUP)!

const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

const editing = computed(() => ctx.editing.value === props.path)
const name = computed(() => ctx.nameOf(props.path))
const valid = computed(() => isValidTypeName(draft.value.trim()))

function edit() {
  draft.value = name.value ?? ''
  ctx.start(props.path)
  nextTick(() => inputEl.value?.focus())
}
// submit принимает имя, лишь если оно свободно для формы позиции; занятое другой
// формой отклоняется — поле остаётся открытым (как при недопустимом имени).
function apply() {
  if (valid.value) ctx.submit(props.path, draft.value)
}
</script>

<template>
  <span class="inline-flex items-center gap-1 align-middle">
    <template v-if="editing">
      <input
        ref="inputEl"
        v-model="draft"
        placeholder="Имя типа"
        spellcheck="false"
        class="w-28 rounded bg-white px-1.5 py-0.5 text-xs text-slate-800 ring-1 ring-indigo-400 focus:outline-none"
        @keyup.enter="apply()"
        @keyup.esc="ctx.cancel()"
      />
      <button
        type="button"
        class="rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
        :disabled="!valid"
        title="Назвать"
        @click="apply()"
      >
        ✓
      </button>
      <button
        type="button"
        class="rounded px-1 text-xs text-slate-400 hover:text-slate-700"
        title="Отмена"
        @click="ctx.cancel()"
      >
        ✕
      </button>
    </template>

    <template v-else-if="name">
      <button
        type="button"
        class="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500"
        title="Переименовать"
        @click="edit"
      >
        {{ name }}
      </button>
      <button
        type="button"
        class="text-xs text-slate-300 hover:text-red-600"
        title="Снять имя"
        @click="ctx.clear(path)"
      >
        ×
      </button>
    </template>

    <template v-else>
      <button
        v-if="kind !== 'scalar'"
        type="button"
        class="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-300 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500"
        @click="edit"
      >
        назвать тип
      </button>
      <button
        v-else
        type="button"
        class="rounded px-1 text-xs text-slate-400 hover:text-indigo-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500"
        @click="edit"
      >
        назвать
      </button>
    </template>
  </span>
</template>
