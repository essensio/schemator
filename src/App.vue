<script setup lang="ts">
import { computed, onMounted, provide, reactive, ref, watch } from 'vue'
import { analyze, isValidTypeName, nameFreeFor, type Names } from './core'
import { MARKUP, type MarkupCtx } from './markup'
import { examples } from './examples'
import Button from './components/Button.vue'
import JsonNode from './components/JsonNode.vue'

const source = ref('')
const names = reactive<Names>({})
const editing = ref<string | null>(null)
const copied = ref(false)

const analysis = computed(() => analyze(source.value, names))
// Выбранный пример выводим из текста — без отдельного состояния.
const currentExample = computed(() => examples.find((e) => e.json === source.value) ?? null)

function clearAll() {
  source.value = ''
  for (const key of Object.keys(names)) delete names[key]
  editing.value = null
}
function loadExample(id: string) {
  const example = examples.find((e) => e.id === id)
  if (!example) return
  clearAll()
  source.value = example.json
}
async function copyOut() {
  if (analysis.value.status !== 'ok') return
  await navigator.clipboard.writeText(analysis.value.essensio)
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1500)
}

const ctx: MarkupCtx = {
  names,
  editing,
  nameOf: (path) => names[path],
  start: (path) => (editing.value = path),
  cancel: () => (editing.value = null),
  // Имя принимается ⟺ валидно по грамматике И свободно для формы позиции (нет
  // активного пути той же формы под другим именем — см. nameFreeFor). Иначе ввод
  // отклоняется: имя не сохраняется, поле остаётся открытым (как при недопустимом).
  submit: (path, name) => {
    const trimmed = name.trim()
    if (!isValidTypeName(trimmed)) return
    if (analysis.value.status !== 'ok') return
    if (!nameFreeFor(analysis.value.value, names, path, trimmed)) return
    names[path] = trimmed
    editing.value = null
  },
  clear: (path) => {
    delete names[path]
    if (editing.value === path) editing.value = null
  },
}
provide(MARKUP, ctx)

// Синхронизация выбранного примера с адресной строкой (?example=<uuid>): читаем при
// загрузке (deep-link) и отражаем выбор в URL. Свой JSON — параметр убирается.
const EXAMPLE_PARAM = 'example'
onMounted(() => {
  const id = new URLSearchParams(window.location.search).get(EXAMPLE_PARAM)
  if (id) loadExample(id)
})
watch(
  () => currentExample.value?.id ?? null,
  (id) => {
    const url = new URL(window.location.href)
    if (id) url.searchParams.set(EXAMPLE_PARAM, id)
    else url.searchParams.delete(EXAMPLE_PARAM)
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
  },
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50 text-slate-800">
    <div class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Схематор</h1>
          <p class="mt-1 text-sm text-slate-500">
            JSON → схема essensio. Назовите подсвеченные анонимные типы.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <select
            class="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            :value="currentExample?.id ?? ''"
            @change="loadExample(($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Примеры…</option>
            <option v-for="e in examples" :key="e.id" :value="e.id">{{ e.title }}</option>
          </select>
          <Button :disabled="!source" @click="clearAll">Очистить</Button>
        </div>
      </header>

      <main class="grid gap-4 lg:grid-cols-2">
        <section class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Разметка</h2>

          <textarea
            v-model="source"
            spellcheck="false"
            placeholder="Вставьте сюда JSON…"
            class="h-36 w-full resize-y rounded-md bg-slate-50 p-3 font-mono text-sm text-slate-800 ring-1 ring-slate-200 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo-500"
          ></textarea>

          <div
            v-if="analysis.status === 'empty'"
            class="mt-4 rounded-md border border-dashed border-slate-200 px-4 py-8 text-center"
          >
            <p class="text-sm text-slate-500">Пока пусто.</p>
            <Button variant="primary" class="mt-3" @click="loadExample(examples[0].id)">
              Загрузить пример
            </Button>
          </div>

          <div
            v-else-if="analysis.status === 'error'"
            class="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
          >
            <span class="font-medium">Невалидный JSON.</span> {{ analysis.message }}
          </div>

          <div v-else class="mt-4">
            <p class="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <span class="inline-block h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-300"></span>
              анонимный тип — кликните, чтобы назвать
            </p>
            <div
              class="overflow-auto rounded-md bg-slate-50 p-3 font-mono text-sm leading-relaxed ring-1 ring-slate-200"
            >
              <JsonNode :value="analysis.value" path="$" />
            </div>
          </div>
        </section>

        <section class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Схема essensio</h2>
            <Button v-if="analysis.status === 'ok'" size="sm" @click="copyOut">
              {{ copied ? 'Скопировано' : 'Копировать' }}
            </Button>
          </div>

          <pre
            v-if="analysis.status === 'ok'"
            class="overflow-auto rounded-md bg-slate-900 p-3 font-mono text-sm leading-relaxed text-slate-100"
          >{{ analysis.essensio }}</pre>
          <p v-else class="px-1 py-8 text-center text-sm text-slate-400">Схема появится здесь.</p>
        </section>
      </main>
    </div>

    <footer class="border-t border-slate-200 bg-white px-4 py-2 text-xs sm:px-6">
      <div class="mx-auto flex max-w-6xl items-center gap-2">
        <span class="font-medium text-slate-600">Пример:</span>
        <template v-if="currentExample">
          <span class="text-slate-700">{{ currentExample.title }}</span>
          <span class="font-mono text-slate-400">{{ currentExample.id }}</span>
        </template>
        <span v-else-if="source" class="text-slate-400">свой JSON</span>
        <span v-else class="text-slate-400">—</span>
      </div>
    </footer>
  </div>
</template>
