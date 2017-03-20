import * as types from './types';

export function select(windowId) { // eslint-disable-line import/prefer-default-export
  return {
    type: types.SELECT,
    windowId
  };
}
