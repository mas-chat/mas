import Component from '@ember/component';
import React from 'react';
import ReactDOM from 'react-dom';

const Wrapper = Component.extend({
  didInsertElement(...args) {
    this._super(...args);
    ReactDOM.render(React.createElement(this.reactComponent, this.attrs), this.element);
  },

  willDestroyComponent(...args) {
    this._super(...args);
    ReactDOM.unmountComponentAtNode(this.element);
  }
});

export default function(component) {
  return Wrapper.extend({ reactComponent: component });
}
