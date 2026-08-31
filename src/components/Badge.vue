<script setup lang="ts">
import { computed } from 'vue'

// This is the Phase 2 "YOUR TURN" exercise, built now because the nav
// needs it for the Rep Queue count — same spec as given then: renders
// nothing at 0, caps the display at "99+".
interface Props {
  count: number
}
const props = defineProps<Props>()

const display = computed(() => (props.count > 99 ? '99+' : String(props.count)))
</script>

<template>
  <span v-if="count > 0" class="badge">{{ display }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--space-1);
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: var(--color-accent-text);
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1;
}
</style>
