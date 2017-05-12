import { createStore, compose } from 'redux';
import { batchedSubscribe } from 'redux-batched-subscribe';
import devEnchancers from './enhancers.dev';
import prodEnhancers from './enhancers.prod';
import rootReducer from '../reducers';

let startUpFinished = false;
const enhancers = process.env.NODE_ENV === 'production' ? prodEnhancers : devEnchancers;

export default function configureStore(initialState) {
  const enhancer = compose(
    ...enhancers(),
    batchedSubscribe(notify => {
      if (startUpFinished) {
        notify();
      }
    })
  );

  return createStore(rootReducer, initialState, enhancer);
}

export function setstartUpFinished(value) {
  startUpFinished = value;
}
