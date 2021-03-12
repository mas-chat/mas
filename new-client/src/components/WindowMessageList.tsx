import React, { Fragment, FunctionComponent, useRef } from 'react';
import { Flex, Box } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import useResizeObserver from 'use-resize-observer';
import { MessageRow, WindowMemberList, WindowDayDivider } from '.';
import WindowModel from '../models/Window';
import { WindowType } from '../types/notifications';
import MessageModel from '../models/Message';
import { useCurrentDate } from '../hooks/currentDate';

interface WindowMessageListProps {
  window: WindowModel;
}

const WindowMessageList: FunctionComponent<WindowMessageListProps> = ({ window }: WindowMessageListProps) => {
  const placeholder = useRef<HTMLDivElement>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const measurerContainer = useRef<HTMLDivElement>(null);
  const currentDate = useCurrentDate();
  const lastMessage = window.sortedMessages[window.sortedMessages.length - 1];

  const scrollToBottom = () => {
    const el = scrollContainer.current;
    el?.scrollTo({ top: el.scrollHeight, left: 0, behavior: 'auto' });
  };

  useResizeObserver<HTMLDivElement>({ ref: measurerContainer, onResize: scrollToBottom });
  const { width = 0, height = 0 } = useResizeObserver<HTMLDivElement>({ ref: placeholder });

  const isFromSameDay = (current: MessageModel, previous: MessageModel) =>
    current.createdAt.isSame(previous.createdAt, 'd');

  return (
    <Flex margin="0.3rem" flex="1">
      <Box flex="1" ref={placeholder}>
        <Box
          position="absolute"
          width={width}
          height={height}
          overflowY="scroll"
          overflowX="hidden"
          ref={scrollContainer}
        >
          <Box ref={measurerContainer}>
            {window.sortedMessages.map((message, index, messages) => (
              <Fragment key={message.gid}>
                {(index === 0 || !isFromSameDay(message, messages[index - 1])) && (
                  <WindowDayDivider ts={message.createdAt} />
                )}
                <MessageRow isUnread={message.gid > window.lastSeenMessageGid} message={message} />
              </Fragment>
            ))}
            {lastMessage && !currentDate.isSame(lastMessage.createdAt, 'd') && <WindowDayDivider ts={currentDate} />}
          </Box>
        </Box>
      </Box>
      {window.type === WindowType.Group && window.isMemberListVisible && (
        <WindowMemberList window={window} height={height} />
      )}
    </Flex>
  );
};

export default observer(WindowMessageList);
