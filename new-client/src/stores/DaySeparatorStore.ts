import { observable, makeObservable } from 'mobx';
import dayjs from 'dayjs';

class DaySeparatorStore {
  dayCounter = 0;

  constructor() {
    makeObservable(this, {
      dayCounter: observable
    });

    const timeToTomorrow = dayjs().endOf('day').diff(dayjs()) + 1;

    const changeDay = () => {
      this.dayCounter++;
      setTimeout(changeDay, 1000 * 60 * 60 * 24);
    };

    setTimeout(changeDay, timeToTomorrow);
  }
}

export default new DaySeparatorStore();
