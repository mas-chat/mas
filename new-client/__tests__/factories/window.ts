import WindowModel, { WindowModelProps } from '../../src/models/Window';
import { Role, Network, WindowType } from '../../src/types/notifications';
let sequence = 0;

function build(overrides: Partial<WindowModelProps> = {}): WindowModel {
  sequence++;

  return new WindowModel({
    id: sequence,
    type: WindowType.Group,
    generation: '1',
    role: Role.Operator,
    network: Network.Mas,
    desktopId: 1,
    row: 1,
    column: 1,
    alerts: { email: true, notification: true, sound: true, title: true },
    ...overrides
  });
}

export default {
  build
};
