export default class AlertModel {
  alertId: number;
  resultCallback(): void;
  message: string;
  postponeLabel: string;
  ackLabel: string;
  nackLabel: string;

  constructor(props: number) {
    Object.assign(this, props);
  }
}
