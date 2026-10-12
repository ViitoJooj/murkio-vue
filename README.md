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

```sh
npm ci     # also builds the package (the `prepare` script)
npm test
```

`@murkio/html` is not on the npm registry yet, so `package.json` takes it from its
repository at a pinned commit, built on install; `.npmrc` allows that (npm 12 refuses git
dependencies by default) and `npm publish` refuses to run until the dependency is a plain
version. The tests run against that build, the same code an application gets.

The checks in `infra/pipeline/` are kept in the Murkio identity service and synced from
there, so they are not edited here.

Every pull request runs the workflows in `.github/workflows`. The same checks, locally:

| Workflow | What it runs |
| --- | --- |
| Build | `npm run build`, `npm run package:check` (publint) and `npm pack --dry-run`, on Node.js 20 and 24 |
| Format | `npm run format:check` (Biome; `npm run format` fixes) |
| Lint | `npm run lint` (Biome), `npm run typecheck` (strict TypeScript) |
| Tests | `npm test` on Node.js 20 and 24 |
| Quality & Governance Checks | `for check in infra/pipeline/*.py; do python3 "$check"; done` |
| Security | `npm audit --omit=dev`, `npm audit --audit-level=high`, `npm audit signatures`, `gitleaks git .`, `zizmor --pedantic .` |
| CodeQL, Dependency Review | run by GitHub on the pull request |

Security reports: see [SECURITY.md](SECURITY.md).
