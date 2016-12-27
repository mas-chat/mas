import Cookies from 'js-cookie';

const authCookie = Cookies.get('auth') || '';
const [ userId, secret ] = authCookie.split('-');

export { userId, secret };
