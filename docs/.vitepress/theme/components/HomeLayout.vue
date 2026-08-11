<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import HomePage from './HomePage.vue'

const { Layout } = DefaultTheme
const { frontmatter } = useData()
</script>

<template>
  <Layout>
    <template v-if="frontmatter.layout === 'home'" #home-hero-before>
      <HomePage />
    </template>
  </Layout>
</template>

<style>
/* Hide the default hero + features rendered by VitePress when our custom home is active.
   We keep frontmatter.layout: home so VitePress still applies layout-specific behavior. */
.VPHome > .VPHero {
  display: none;
}
.VPHome > .VPFeatures {
  display: none;
}
</style>
