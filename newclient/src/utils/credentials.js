import Cookies from 'js-cookie';

const authCookie = Cookies.get('auth') || '';

export const [ userId, secret ] = authCookie.split('-');
