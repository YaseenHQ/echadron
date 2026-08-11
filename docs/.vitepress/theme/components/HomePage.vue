<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useData, withBase } from "vitepress";
import type { Root } from "react-dom/client";

const host = ref<HTMLElement>();
const { lang } = useData();
let root: Root | undefined;

async function renderHome() {
  const target = host.value;
  if (!target) return;

  const [{ createRoot }, { createElement }, { EchadronHome }] =
    await Promise.all([
      import("react-dom/client"),
      import("react"),
      import("../astryx-home/EchadronHome"),
    ]);

  if (!target.isConnected) return;
  root ??= createRoot(target);
  root.render(
    createElement(EchadronHome, {
      locale: lang.value,
      docsHref: withBase(
        lang.value.startsWith("zh")
          ? "/zh/guides/getting-started"
          : "/en/guides/getting-started"
      ),
      sourceHref: withBase(
        lang.value.startsWith("zh")
          ? "/zh/guides/getting-started#从源码安装"
          : "/en/guides/getting-started#install-from-source"
      ),
      imageSrc: withBase("/media/echadron-terminal-window.png"),
    })
  );
}

onMounted(() => {
  document.documentElement.classList.add("echadron-home-page");
  void renderHome();
});

watch(lang, () => void renderHome());

onUnmounted(() => {
  document.documentElement.classList.remove("echadron-home-page");
  root?.unmount();
});
</script>

<template>
  <div ref="host" class="EchadronReactHome" />
</template>
