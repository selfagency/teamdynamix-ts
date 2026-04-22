---
aside: false
outline: false
---

# API Operation

<!-- markdownlint-disable MD033 -->
<script setup lang="ts">
import { useRoute } from 'vitepress';

const route = useRoute();
const operationId = route.data.params.operationId;
</script>

<OAOperation :operationId="operationId" />
<!-- markdownlint-enable MD033 -->
