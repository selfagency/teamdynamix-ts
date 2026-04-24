---
aside: false
outline: false
---

# API Tag

<!-- markdownlint-disable MD033 -->
<script setup lang="ts">
import { useRoute } from 'vitepress';

const route = useRoute();
const tag = route.data.params.tag;
</script>

<OASpec :tags="[tag]" hide-info hide-servers hide-paths-summary />
<!-- markdownlint-enable MD033 -->
