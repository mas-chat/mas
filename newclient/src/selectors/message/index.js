import { createSelector } from 'reselect'

const getMessages = (state) => state.messages.messages

export const getFormattedMessages = createSelector(getMessages, messages => messages.toArray().map(message => ({
  ts: formatTimeStamp(message.ts)
})));

function formatTimeStamp(ts) {
  return 'xx';
}
