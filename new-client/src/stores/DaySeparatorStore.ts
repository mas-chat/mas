import { observable, makeObservable } from 'mobx';
import moment from 'moment';

class DaySeparatorStore {
  dayCounter = 0;

  constructor() {
    makeObservable(this, {
      dayCounter: observable
    });

    const timeToTomorrow = moment().endOf('day').diff(moment()) + 1;

    const changeDay = () => {
      this.dayCounter++;
      setTimeout(changeDay, 1000 * 60 * 60 * 24);
    };

    setTimeout(changeDay, timeToTomorrow);
  }
}

export default new DaySeparatorStore();
