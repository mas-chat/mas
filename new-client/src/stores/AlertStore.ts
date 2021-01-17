import { observable, computed, makeObservable, action } from 'mobx';
import AlertModel from '../models/alert';
import socket from '../lib/socket';
import { Notification } from '../types/notifications';

let nextLocalAlertId = 0;

class AlertStore {
  alerts = new Map<string, AlertModel>();

  constructor() {
    makeObservable(this, {
      alerts: observable,
      currentAlert: computed,
      showAlert: action,
      closeAlert: action
    });
  }

  get currentAlert() {
    // values() returns values in the insertion order
    return this.alerts.values().next().value || false;
  }

  handlerServerNotification(ntf: Notification): boolean {
    switch (ntf.type) {
      case 'ADD_ALERT':
        this.showAlertWithAck(ntf.alertId, ntf.message, ntf.ackLabel, ntf.nackLabel, ntf.postponeLabel);
        break;
      default:
        return false;
    }

    return true;
  }

  showAlertWithAck(
    alertId: number,
    message: string,
    ackLabel?: string,
    nackLabel?: false | string,
    postponeLabel?: false | string
  ) {
    const resultCallback = (result: string) => {
      if (result === 'ack') {
        socket.send({ id: 'ACKALERT', alertId: alertId });
      }
    };

    this.showAlert(alertId, message, ackLabel, nackLabel, postponeLabel, resultCallback);
  }

  showAlert(
    alertId: number | null,
    message = '',
    ackLabel?: string,
    nackLabel?: false | string,
    postponeLabel?: false | string,
    resultCallback?: (result: string) => void
  ) {
    const id = alertId === null ? `local:${nextLocalAlertId++}` : alertId.toString();

    this.alerts.set(id, new AlertModel(id, message, ackLabel, nackLabel, postponeLabel, resultCallback));
  }

  closeAlert(alertId: number, result: string) {
    const alert = this.alerts.get(alertId.toString());

    alert?.resultCallback(result);
    this.alerts.delete(alertId.toString());
  }
}

export default new AlertStore();
