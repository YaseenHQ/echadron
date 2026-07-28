<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 56 })
</script>

<template>
  <div
    class="EchadronLogo"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.58}px` }"
    role="img"
    aria-label="Echadron"
  >
    E
  </div>
</template>

<style scoped>
.EchadronLogo {
  display: grid;
  place-items: center;
  border-radius: 20%;
  background: var(--echadron-brand-gradient);
  color: white;
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 1;
  box-shadow: 0 12px 32px rgba(10, 122, 255, 0.28);
}
</style>
