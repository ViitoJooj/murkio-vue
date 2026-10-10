import { getMurkio, reset } from '@murkio/html';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { murkio, MurkioIdentityCanvas, MurkioIdentityEmailInput, MurkioIdentityLoginButton, useAuth } from '../src';

const fetch = (async () => new Response('{}', { status: 503 })) as typeof globalThis.fetch;

function jwt(claims: Record<string, unknown>) {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'EdDSA' })}.${encode(claims)}.sig`;
}

function mount(component: Parameters<typeof createApp>[0]) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const app = createApp(component);
  app.use(murkio, { publishableKey: 'pk_vue', apiUrl: 'https://api.example.com', fetch });
  app.mount(host);
  return { host, app };
}

afterEach(() => {
  document.body.textContent = '';
  localStorage.clear();
  reset();
});

describe('@murkio/vue', () => {
  it('follows the session with useAuth', async () => {
    let auth: ReturnType<typeof useAuth> | null = null;
    mount(defineComponent({ setup() { auth = useAuth(); return () => h('p', auth!.isSignedIn.value ? 'in' : 'out'); } }));
    expect(auth!.isLoaded.value).toBe(true);
    expect(document.body.textContent).toBe('out');

    getMurkio()!.session.setSession(
      { access_token: jwt({ sub: 'u', sid: 's', exp: Math.floor(Date.now() / 1000) + 900, roles: [] }), token_type: 'Bearer', expires_in: 900, refresh_token: 'rt', session_id: 's' },
      true,
    );
    await nextTick();
    expect(document.body.textContent).toBe('in');
  });

  it('renders the elements, passes classes and emits events', async () => {
    const seen: string[] = [];
    const { host } = mount(
      defineComponent({
        setup: () => () =>
          h('div', [
            h(MurkioIdentityCanvas, { screen: 'sign_up', lightDom: true, onLogin: () => seen.push('login'), onStep: (step: string) => seen.push(step) }),
            h(MurkioIdentityEmailInput, { class: 'input', placeholder: 'you@example.com' }),
            h(MurkioIdentityLoginButton, { class: 'btn' }, () => 'Sign in'),
          ]),
      }),
    );
    await nextTick();

    const canvas = host.querySelector('murkio-identity-canvas')!;
    expect(canvas.getAttribute('screen')).toBe('sign_up');
    expect(canvas.hasAttribute('light-dom')).toBe(true);
    canvas.dispatchEvent(new CustomEvent('murkio-login'));
    canvas.dispatchEvent(new CustomEvent('murkio-step', { detail: { step: 'verify_email' } }));
    expect(seen).toEqual(['login', 'verify_email']);

    expect(host.querySelector('murkio-identity-email-input input')?.className).toBe('input');
    expect(host.querySelector('murkio-identity-email-input input')?.getAttribute('placeholder')).toBe('you@example.com');
    expect(host.querySelector('murkio-identity-login-button button')?.textContent).toBe('Sign in');
  });
});
