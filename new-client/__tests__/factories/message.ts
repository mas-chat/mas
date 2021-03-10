import MessageModel, { MessageModelProps } from '../../src/models/Message';
import { MessageCategory, MessageStatus } from '../../src/types/notifications';

let sequence = 0;

function build(overrides: Partial<MessageModelProps> & Pick<MessageModelProps, 'window' | 'user'>): MessageModel {
  sequence++;

  return new MessageModel({
    gid: sequence,
    category: MessageCategory.Message,
    body: 'Hello world',
    timestamp: Date.now(),
    status: MessageStatus.Original,
    ...overrides
  });
}

export default {
  build
};
