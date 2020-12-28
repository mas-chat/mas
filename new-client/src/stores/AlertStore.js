import { observable, computed } from 'mobx';
import AlertModel from '../models/Alert';
import socket from '../utils/socket';
import mandatory from '../utils/parameters';

class AlertStore {
  @observable alerts = new Map();

  @computed
  get currentAlert() {
    // values() returns values in the insertion order
    return this.alerts.values().next().value || false;
  }

  handleShowAlert({
    alertId = mandatory(),
    message = mandatory(),
    ackLabel = mandatory(),
    resultCallback,
    postponeLabel,
    nackLabel
  }) {
    this.alerts.set(
      alertId,
      new AlertModel(this, { alertId, resultCallback, message, postponeLabel, ackLabel, nackLabel })
    );
  }

  handleShowAlertServer({
    alertId = mandatory(),
    message = mandatory(),
    ackLabel = 'Dismiss',
    postponeLabel = 'Show again later',
    nackLabel
  }) {
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

  handleCloseAlert({ alertId = mandatory(), result = mandatory() }) {
    const alert = this.alerts.get(alertId);

    if (alert.resultCallback) {
      alert.resultCallback(result);
    }

    this.alerts.delete(alertId);
  }
}

export default new AlertStore();
