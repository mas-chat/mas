import Cookies from 'js-cookie';

const userIdAndSecret = (Cookies.get('auth') || '').split('-');

export const userId = userIdAndSecret[0];
export const secret = userIdAndSecret[1];
