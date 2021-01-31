type AlertModelProps = {
  alertId: number | string;
  message: string;
  ackLabel?: string;
  nackLabel?: false | string;
  postponeLabel?: false | string;
  resultCallback?: (result: string) => void;
};

export default class AlertModel {
  public readonly alertId: number | string;
  public readonly message: string;
  public readonly ackLabel: string;
  public readonly nackLabel: false | string;
  public readonly postponeLabel: false | string;
  public readonly resultCallback: (result: string) => void;

  constructor({ alertId, message, ackLabel, nackLabel, postponeLabel, resultCallback }: AlertModelProps) {
    this.alertId = alertId;
    this.message = message;
    this.ackLabel = ackLabel || 'Dismiss';
    this.nackLabel = nackLabel === false ? false : nackLabel || 'Reject';
    this.postponeLabel = postponeLabel === false ? false : postponeLabel || 'Show again later';
    this.resultCallback =
      resultCallback ||
      (() => {
        // do nothing
      });
  }
}
