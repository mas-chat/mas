export default class AlertModel {
  store;
  alertId;
  resultCallback;
  message;
  postponeLabel;
  ackLabel;
  nackLabel;

  constructor(store, props) {
    this.store = store;
    Object.assign(this, props);
  }
}
