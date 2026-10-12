import { defineElements, init, type AccessClaims, type Me, type Murkio, type MurkioOptions } from '@murkio/html';
import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type App,
  type ComponentObjectPropsOptions,
  type InjectionKey,
  type PropType,
  type ShallowRef,
} from 'vue';

const MURKIO: InjectionKey<ShallowRef<Murkio | null>> = Symbol('murkio');

/**
 * The Vue plugin: `app.use(murkio, { publishableKey: 'pk_...' })`. The client
 * is created only in the browser (never during SSR); the composables report
 * `isLoaded: false` until then.
 */
export const murkio = {
  install(app: App, options: MurkioOptions) {
    const client = shallowRef<Murkio | null>(null);
    app.provide(MURKIO, client);
    if (typeof window !== 'undefined') {
      defineElements();
      client.value = init(options);
    }
    const compiler = app.config.compilerOptions;
    const previous = compiler.isCustomElement;
    compiler.isCustomElement = (tag: string) => tag.startsWith('murkio-identity-') || (previous?.(tag) ?? false);
  },
};

export function useMurkio(): ShallowRef<Murkio | null> {
  const client = inject(MURKIO, null);
  if (!client) throw new Error('[murkio] install the plugin first: app.use(murkio, { publishableKey })');
  return client;
}

/** `{ isLoaded, isSignedIn, claims, getToken, signOut }`, following the session in every tab. */
export function useAuth() {
  const client = useMurkio();
  const claims = shallowRef<AccessClaims | null>(null);
  let stop: (() => void) | null = null;

  watch(
    client,
    (value) => {
      stop?.();
      stop = value ? value.onAuthChange((next) => (claims.value = next)) : null;
    },
    { immediate: true },
  );
  onBeforeUnmount(() => stop?.());

  return {
    isLoaded: computed(() => client.value !== null),
    isSignedIn: computed(() => claims.value !== null),
    claims,
    getToken: () => client.value?.getToken() ?? Promise.resolve(null),
    signOut: () => client.value?.signOut() ?? Promise.resolve(),
  };
}

/** The signed-in user's profile (POST /v1/me: email, verification, roles, 2FA). */
export function useUser() {
  const client = useMurkio();
  const { claims } = useAuth();
  const user = ref<Me | null>(null);
  const isLoaded = ref(false);

  watch(
    [client, () => claims.value?.sid],
    async ([value]) => {
      if (!value) return;
      user.value = claims.value ? await value.getUser().catch(() => null) : null;
      isLoaded.value = true;
    },
    { immediate: true },
  );

  return { user, isLoaded };
}

const EVENTS = ['login', 'error', 'step'] as const;

/**
 * A Vue component around one custom element. Props become attributes (the
 * class falls through to the element, which hands it to the real control),
 * and with `withEvents` the element's murkio-* DOM events become Vue events.
 */
function element(tag: string, props: ComponentObjectPropsOptions, withEvents = false) {
  return defineComponent({
    props,
    emits: withEvents ? [...EVENTS] : [],
    setup(componentProps: Record<string, unknown>, { emit, slots }) {
      const node = ref<HTMLElement | null>(null);
      const listeners = EVENTS.map(
        (name) => [`murkio-${name}`, (event: Event) => emit(name, name === 'step' ? (event as CustomEvent<{ step: string }>).detail.step : (event as CustomEvent).detail)] as const,
      );
      if (withEvents) {
        onMounted(() => {
          for (const [name, listener] of listeners) node.value?.addEventListener(name, listener);
        });
        onBeforeUnmount(() => {
          for (const [name, listener] of listeners) node.value?.removeEventListener(name, listener);
        });
      }
      return () => {
        const attributes: Record<string, unknown> = { ref: node };
        for (const [key, value] of Object.entries(componentProps)) {
          if (value === undefined || value === false) continue;
          attributes[key === 'lightDom' ? 'light-dom' : key] = value === true ? '' : value;
        }
        return h(tag, attributes, slots.default?.());
      };
    },
  });
}

const fieldProps = { form: String, placeholder: String, label: String, autocomplete: String };

/** The login canvas designed in the dashboard. Emits `login`, `error` (MurkioError) and `step`. */
export const MurkioIdentityCanvas = element('murkio-identity-canvas', { screen: String as PropType<'sign_in' | 'sign_up'>, locale: String, lightDom: Boolean }, true);
export const MurkioIdentityEmailInput = element('murkio-identity-email-input', fieldProps);
export const MurkioIdentityPasswordInput = element('murkio-identity-password-input', fieldProps);
export const MurkioIdentityKeepLogged = element('murkio-identity-keep-logged', { form: String, label: String, checked: Boolean });
export const MurkioIdentityLoginButton = element('murkio-identity-login-button', { form: String, label: String }, true);
export const MurkioIdentityRegisterButton = element('murkio-identity-register-button', { form: String, label: String }, true);
export const MurkioIdentityError = element('murkio-identity-error', { form: String });

export { MurkioError, translate } from '@murkio/html';
export type { AccessClaims, Me, MurkioOptions } from '@murkio/html';
