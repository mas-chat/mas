import Mobx from 'npm:mobx';
import AlertModel from '../models/Alert';
import socket from '../utils/socket';

const { observable, computed } = Mobx;

class AlertStore {
  @observable alerts = [];

  @computed
  get currentAlert() {
    return this.alerts.length === 0 ? null : this.alerts[0];
  }

  handleShowAlert(data) {
    this.alerts.push(new AlertModel(this, data));
  }

  handleShowAlertServer(data) {
    // Default labels for alerts
    data.postponeLabel = 'Show again later';
    data.ackLabel = 'Dismiss';

    data.resultCallback = result => {
      if (result === 'ack') {
        socket.send({
          id: 'ACKALERT',
          alertId: data.alertId
        });
      }
    };

    this.alerts.push(new AlertModel(this, data));
  }

  handleCloseAlert(data) {
    const callback = this.alerts[0].resultCallback;

    if (callback) {
      callback(data.result);
    }

    this.alerts.shift();
  }
}

export default new AlertStore();
