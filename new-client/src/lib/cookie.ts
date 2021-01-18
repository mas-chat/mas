import Cookies from 'js-cookie';

export const cookie = Cookies.get('mas');

if (!cookie) {
  logout();
}

export const userId = `m${JSON.parse(window.atob(cookie)).userId}`;

export function logout(): never {
  Cookies.remove('mas', { path: '/' });
  window.location.pathname = '/';
  throw new Error('Logging out');
}

export function setCookie(cookie: string): void {
  Cookies.set('mas', cookie, { expires: 7 });
}
