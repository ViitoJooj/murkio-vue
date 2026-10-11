# @murkio/vue

Murkio identity for Vue 3 (and Nuxt on the client). Wraps [`@murkio/html`](../html/README.md).

```ts
// main.ts
import { createApp } from 'vue';
import { murkio } from '@murkio/vue';
createApp(App).use(murkio, { publishableKey: 'pk_...', afterLogin: '/dashboard' }).mount('#app');
```

```vue
<script setup lang="ts">
import { MurkioIdentityCanvas, useAuth, useUser } from '@murkio/vue';
const { isSignedIn, signOut } = useAuth();
const { user } = useUser();
</script>

<template>
  <MurkioIdentityCanvas v-if="!isSignedIn" @login="console.log('signed in')" @error="(e) => console.log(e.code)" />
  <button v-else @click="signOut">Sign out {{ user?.email }}</button>
</template>
```

Your own layout: `MurkioIdentityEmailInput`, `MurkioIdentityPasswordInput`,
`MurkioIdentityKeepLogged`, `MurkioIdentityLoginButton`, `MurkioIdentityRegisterButton`
and `MurkioIdentityError`. `class` reaches the real `<input>`/`<button>`. The plugin
tells the template compiler that `<murkio-identity-*>` are custom elements; with SFCs
compiled by Vite, add `isCustomElement: (tag) => tag.startsWith('murkio-identity-')`
to `vue({ template: { compilerOptions } })` if you use the tags directly.

## Developing

This repository is a git submodule of the Murkio identity service
(`libs/external/vue`) and is developed from there: the JavaScript packages share one
npm workspace, and the tests read the contract, the vectors and the fixtures every Murkio
SDK shares (`libs/spec`).

```sh
# in libs/ of the service repository, cloned with --recurse-submodules
npm ci
npm run build
npm test
```
