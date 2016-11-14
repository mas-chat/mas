import { combineReducers } from 'redux';
import windows from './windows';
import users from './users';

export default combineReducers({
  windows,
  users
});
