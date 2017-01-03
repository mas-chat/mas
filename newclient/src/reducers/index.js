import { combineReducers } from 'redux';
import windows from './windows';
import messages from './messages';
import users from './users';

export default combineReducers({
  windows,
  messages,
  users
});
