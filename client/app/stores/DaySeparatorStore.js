import Mobx from 'mobx';
import moment from 'moment';

const { observable } = Mobx;

class DaySeparatorStore {
  @observable dayCounter = 0;

  constructor() {
    const timeToTomorrow =
      moment()
        .endOf('day')
        .diff(moment()) + 1;

    const changeDay = () => {
      this.dayCounter++;
      setTimeout(changeDay, 1000 * 60 * 60 * 24);
    };

    setTimeout(changeDay, timeToTomorrow);
  }
}

export default new DaySeparatorStore();
