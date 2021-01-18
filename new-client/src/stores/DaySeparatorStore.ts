import { observable, makeObservable } from 'mobx';
import dayjs from 'dayjs';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class DaySeparatorStore {
  rootStore: RootStore;
  socket: Socket;
  dayCounter = 0;

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

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

  handlerServerNotification(): boolean {
    return false;
  }
}

export default DaySeparatorStore;
