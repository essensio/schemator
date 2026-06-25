<script setup lang="ts">
// Базовая кнопка дизайн-системы: вариант и размер — типизированы, классы Tailwind
// инкапсулированы здесь, а не размазаны по разметке. disabled/click пролетают на
// нативный <button> как fallthrough-атрибуты.
type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md'

withDefaults(defineProps<{ variant?: Variant; size?: Size }>(), {
  variant: 'ghost',
  size: 'md',
})

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'bg-slate-100 text-slate-800 ring-1 ring-slate-300 hover:bg-slate-200',
  ghost: 'text-slate-600 hover:bg-slate-200/70',
}
const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
}
</script>

<template>
  <button
    type="button"
    class="rounded-md font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:pointer-events-none disabled:opacity-40"
    :class="[variants[variant], sizes[size]]"
  >
    <slot />
  </button>
</template>
