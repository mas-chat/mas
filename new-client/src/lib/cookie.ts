import Cookies from 'js-cookie';

let userId: string | undefined;

export function logout(reason?: string): never {
  console.log(reason);

  Cookies.remove('mas', { path: '/' });
  window.location.pathname = '/';
}

export function getCookie(): string {
  const cookie = Cookies.get('mas');

  if (!cookie) {
    logout('Cookie does not exist');
  }

  return cookie;
}

export function setCookie(cookie: string): void {
  Cookies.set('mas', cookie, { expires: 7 });
}

export function getUserId(): string {
  if (userId) {
    return userId;
  }

  try {
    userId = `m${JSON.parse(window.atob(getCookie())).userId}`;
  } catch (e) {
    logout('Corrupted cookie');
  }

  return userId;
}
