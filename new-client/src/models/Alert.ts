export default class AlertModel {
  constructor(
    public readonly alertId: number | string,
    public readonly message: string,
    public readonly ackLabel: string = 'Dismiss',
    public readonly nackLabel: false | string = 'Reject',
    public readonly postponeLabel: false | string = 'Show again later',
    public readonly resultCallback: (result: string) => void = () => {
      // do nothing
    }
  ) {}
}
