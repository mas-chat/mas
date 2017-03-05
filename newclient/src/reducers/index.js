import { combineReducers } from 'redux';
import desktop from './desktop';
import windows from './windows';
import messages from './messages';
import users from './users';

export default combineReducers({
  desktop,
  windows,
  messages,
  users
});
