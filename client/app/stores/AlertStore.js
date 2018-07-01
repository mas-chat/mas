import Mobx from 'mobx';
import AlertModel from '../models/Alert';
import socket from '../utils/socket';

const { observable, computed } = Mobx;

class AlertStore {
  @observable alerts = new Map();

  @computed
  get currentAlert() {
    return this.alerts.size === 0 ? null : this.oldestAlert();
  }

  handleShowAlert(data) {
    this.alerts.set(data.alertId, new AlertModel(this, data));
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

    this.alerts.set(data.alertId, new AlertModel(this, data));
  }

  handleCloseAlert(data) {
    if (data.alert.resultCallback) {
      data.alert.resultCallback(data.result);
    }

    this.alerts.delete(data.alert.alertId);
  }

  oldestAlert() {
    return this.alerts.values().next().value;
  }
}

export default new AlertStore();
