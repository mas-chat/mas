import React, { FunctionComponent, KeyboardEvent, useContext, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDropzone } from 'react-dropzone';
import { HStack, IconButton, Heading, Flex, Input } from '@chakra-ui/react';
import { PlusSquareIcon, ArrowBackIcon } from '@chakra-ui/icons';
import { Link, useNavigate } from 'react-router-dom';
import { WindowMessageList, WindowMenu, WindowMoveControls } from '.';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';
import { rootUrl, windowUrl } from '../lib/urls';

interface WindowProps {
  window: WindowModel;
  height?: number;
  singleWindowMode?: boolean;
}

const Window: FunctionComponent<WindowProps> = ({ window, height = 100, singleWindowMode }: WindowProps) => {
  const { windowStore } = useContext(ServerContext);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>('');
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    // singleWindowMode check is here because we don't want the VKB to open automatically on mobile
    if (!singleWindowMode && window.focused) {
      input.current?.focus();
    }
  }, [window.focused, singleWindowMode]);

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      windowStore.processLine(window, message);
      setMessage('');
    }
  };

  const handleWindowClick = () => {
    // Focus this window
    navigate(windowUrl({ windowId: window.id }));
  };

  const handleStartMove = () => {
    setIsMoving(true);
  };

  const handleEndMove = () => {
    setIsMoving(false);
  };

  const onDrop = (acceptedFiles: File[]) => {
    windowStore.uploadFiles(window, acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <Flex
      onClick={handleWindowClick}
      flex="1"
      minWidth="0"
      minHeight="0"
      height={`${height}%`}
      flexDirection="column"
      p="4px"
      opacity={windowStore.windowMoveInProgress && !isMoving ? '30%' : '100%'}
    >
      <Flex
        px="0.6rem"
        py="0.20rem"
        bg={window.focused ? 'themeActiveBg' : 'themeBg'}
        flexDirection="row"
        alignItems="center"
      >
        {singleWindowMode && (
          <IconButton
            as={Link}
            to={rootUrl()}
            mr="1rem"
            aria-label="Back"
            icon={<ArrowBackIcon />}
            onClick={e => e.stopPropagation()}
          />
        )}
        <Heading flex="1" isTruncated size="s">
          {`${window.decoratedTitle}${window.topic ? `- ${window.topic}` : ''}`}
        </Heading>
      </Flex>
      {isMoving ? (
        <WindowMoveControls window={window} onEndMove={handleEndMove} />
      ) : (
        <WindowMessageList window={window} />
      )}
      <Flex>
        <Input
          flex="1"
          ref={input}
          _focus={{ boxShadow: 'none', borderColor: '#bbb' }}
          onKeyUp={onKeyUp}
          onChange={e => setMessage(e.target.value)}
          placeholder="Write here…"
          value={message}
          size="sm"
          padding="6px"
        />
        <HStack spacing="0.2rem">
          <input {...getInputProps()} />
          <IconButton
            {...getRootProps()}
            aria-label="Options"
            isActive={isDragActive}
            icon={<PlusSquareIcon />}
            variant="outline"
            size="sm"
          />
          <WindowMenu window={window} onStartMove={handleStartMove} />
        </HStack>
      </Flex>
    </Flex>
  );
};

export default observer(Window);
