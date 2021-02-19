import React, { FunctionComponent, useRef, useState } from 'react';
import { Flex, Box } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import useResizeObserver from 'use-resize-observer';
import { MessageRow, WindowMemberList } from '.';
import WindowModel from '../models/Window';
import { WindowType } from '../types/notifications';

const SCROLL_BOTTOM = Number.MAX_SAFE_INTEGER;

interface MessageListProps {
  window: WindowModel;
}

const MessageList: FunctionComponent<MessageListProps> = ({ window }: MessageListProps) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const placeholder = useRef<HTMLDivElement>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const measurerContainer = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const el = scrollContainer.current;
    el && (el.scrollTop = SCROLL_BOTTOM);
  };

  const handleContainerResize = ({ width = 0, height = 0 }: { width?: number; height?: number }) => {
    setDimensions({ width, height });
  };

  useResizeObserver<HTMLDivElement>({ ref: measurerContainer, onResize: scrollToBottom });
  useResizeObserver<HTMLDivElement>({ ref: placeholder, onResize: handleContainerResize });

  return (
    <Flex margin="0.3rem" flex="1">
      <Box flex="1" ref={placeholder}>
        <Box
          position="absolute"
          width={dimensions.width}
          height={dimensions.height}
          overflowY="scroll"
          overflowX="hidden"
          ref={scrollContainer}
        >
          <Box ref={measurerContainer}>
            {window.sortedMessages.map(message => (
              <MessageRow key={message.gid} message={message} />
            ))}
          </Box>
        </Box>
      </Box>
      {window.type === WindowType.Group && window.isMemberListVisible && (
        <WindowMemberList window={window} height={dimensions.height} />
      )}
    </Flex>
  );
};

export default observer(MessageList);
