import React, { FunctionComponent, KeyboardEvent, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDropzone } from 'react-dropzone';
import { Box, Button, IconButton, Heading, Flex, Input } from '@chakra-ui/react';
import { PlusSquareIcon } from '@chakra-ui/icons';
import { WindowMessageList, WindowMenu } from '.';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';

interface WindowProps {
  window: WindowModel;
  onExit?: () => void;
  mobile?: boolean;
}

const Window: FunctionComponent<WindowProps> = ({ window, mobile, onExit }: WindowProps) => {
  const { windowStore, profileStore } = useContext(ServerContext);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const isActive = windowStore.activeWindow === window;

  const focusIfActive = () => {
    if (!mobile && windowStore.activeWindow === window) {
      input.current?.focus();
    }
  };

  useEffect(focusIfActive, [window, windowStore.activeWindow, mobile]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      windowStore.sendText(window, message);
      setMessage('');
    }
  };

  const onClick = () => {
    profileStore.changeActiveWindowId(window.id);
  };

  const onDrop = (acceptedFiles: File[]) => {
    windowStore.uploadFiles(window, acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <Flex onClick={onClick} flex="1" height="100%" width="100%" flexDirection="column" p="4px">
      <Flex px="0.6rem" py="0.20rem" bg={isActive ? 'blue.100' : 'gray.100'} flexDirection="row" alignItems="center">
        {onExit && (
          <Button mr="1rem" onClick={onExit}>
            Back
          </Button>
        )}
        <Heading flex="1" isTruncated size="s">
          {window.simplifiedName}
        </Heading>
      </Flex>
      <WindowMessageList window={window} />
      <Flex>
        <Input
          flex="1"
          ref={input}
          variant="flushed"
          onKeyDown={onKeyDown}
          onChange={e => setMessage(e.target.value)}
          placeholder="Write here…"
          value={message}
          size="sm"
          padding="6px"
        />
        <Box>
          <input {...getInputProps()} />
          <IconButton {...getRootProps()} aria-label="Options" isActive={isDragActive} icon={<PlusSquareIcon />} />
        </Box>
        <WindowMenu window={window} />
      </Flex>
    </Flex>
  );
};

export default observer(Window);
