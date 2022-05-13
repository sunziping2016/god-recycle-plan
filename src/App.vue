<template>
  <div ref="el"></div>
</template>

<script lang="ts" setup>
import * as PIXI from "pixi.js";
import { onMounted, ref } from "vue";

const app = new PIXI.Application();
const el = ref<HTMLElement | null>(null);

onMounted(() => el.value?.appendChild(app.view));
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
