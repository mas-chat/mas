import { observable, computed, makeObservable, action } from 'mobx';
import AlertModel from '../models/Alert';
import { Notification } from '../types/notifications';
import RootStore from './RootStore';
import Socket from '../lib/socket';

let nextLocalAlertId = 0;

class AlertStore {
  rootStore: RootStore;
  socket: Socket;
  alerts = new Map<string, AlertModel>();

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      alerts: observable,
      currentAlert: computed,
      showAlert: action,
      closeAlert: action
    });
  }

  get currentAlert(): AlertModel | undefined {
    // values() returns values in the insertion order
    return this.alerts.values().next().value || undefined;
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
  ): void {
    const resultCallback = (result: string) => {
      if (result === 'ack') {
        this.socket.send({ id: 'ACKALERT', alertId: alertId });
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
  ): void {
    const id = alertId === null ? `local:${nextLocalAlertId++}` : alertId.toString();

    this.alerts.set(id, new AlertModel(id, message, ackLabel, nackLabel, postponeLabel, resultCallback));
  }

  closeAlert(alertId: number, result: string): void {
    const alert = this.alerts.get(alertId.toString());

    alert?.resultCallback(result);
    this.alerts.delete(alertId.toString());
  }
}

export default AlertStore;
