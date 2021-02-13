import React, { FunctionComponent, useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import useResizeObserver from 'use-resize-observer';
import { MessageRow } from '.';
import WindowModel from '../models/Window';

interface MessageListProps {
  window: WindowModel;
}

const MessageList: FunctionComponent<MessageListProps> = ({ window }: MessageListProps) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const placeholder = useRef<HTMLDivElement>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const measurerContainer = useRef<HTMLDivElement>(null);
  const { width = 0, height = 0 } = useResizeObserver<HTMLDivElement>({ ref: placeholder });

  const scrollToBottom = () => {
    const el = scrollContainer.current;
    el && (el.scrollTop = 9999999);
  };

  useResizeObserver<HTMLDivElement>({ ref: measurerContainer, onResize: scrollToBottom });

  useLayoutEffect(() => {
    const el = placeholder.current;

    if (el) {
      const { offsetWidth, offsetHeight } = el;

      if (dimensions.width !== offsetWidth || dimensions.height !== offsetHeight) {
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    }
  }, [width, height, dimensions.width, dimensions.height]);

  return (
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
  );
};

export default observer(MessageList);
