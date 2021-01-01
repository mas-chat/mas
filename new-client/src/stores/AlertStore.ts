import { observable, computed, makeObservable } from 'mobx';
import AlertModel from '../models/Alert';
import socket from '../lib/socket';

class AlertStore {
  alerts = new Map();

  constructor() {
    makeObservable(this, {
      alerts: observable,
      currentAlert: computed
    });
  }

  get currentAlert() {
    // values() returns values in the insertion order
    return this.alerts.values().next().value || false;
  }

  handleShowAlert({ alertId, message, ackLabel, resultCallback, postponeLabel, nackLabel }) {
    this.alerts.set(
      alertId,
      new AlertModel(this, { alertId, resultCallback, message, postponeLabel, ackLabel, nackLabel })
    );
  }

  handleShowAlertServer({ alertId, message, ackLabel = 'Dismiss', postponeLabel = 'Show again later', nackLabel }) {
    const resultCallback = result => {
      if (result === 'ack') {
        socket.send({
          id: 'ACKALERT',
          alertId
        });
      }
    };

    this.alerts.set(
      alertId,
      new AlertModel(this, { alertId, resultCallback, message, postponeLabel, ackLabel, nackLabel })
    );
  }

  handleCloseAlert({ alertId, result }) {
    const alert = this.alerts.get(alertId);

    if (alert.resultCallback) {
      alert.resultCallback(result);
    }

    this.alerts.delete(alertId);
  }
}

export default new AlertStore();
