import * as types from './types';

export function select(windowId) {
  return {
    type: types.SELECT,
    windowId
  };
}

export function foo() {} // TODO: Workaround to avoid eslint warning
