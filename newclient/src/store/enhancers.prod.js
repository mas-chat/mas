import { applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';

export default function getEnhancers() {
  return [ applyMiddleware(thunkMiddleware) ];
}
