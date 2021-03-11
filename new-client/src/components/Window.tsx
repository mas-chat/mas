import React, { FunctionComponent, KeyboardEvent, useContext, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDropzone } from 'react-dropzone';
import { Box, IconButton, Heading, Flex, Input } from '@chakra-ui/react';
import { PlusSquareIcon, ArrowBackIcon } from '@chakra-ui/icons';
import { Link, useNavigate } from 'react-router-dom';
import { WindowMessageList, WindowMenu } from '.';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';
import { rootUrl, windowUrl } from '../lib/urls';

interface WindowProps {
  window: WindowModel;
  singleWindowMode?: boolean;
}

const Window: FunctionComponent<WindowProps> = ({ window, singleWindowMode }: WindowProps) => {
  const { windowStore } = useContext(ServerContext);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
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

  const onDrop = (acceptedFiles: File[]) => {
    windowStore.uploadFiles(window, acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <Flex onClick={handleWindowClick} flex="1" minWidth="0" height="100%" flexDirection="column" p="4px">
      <Flex
        px="0.6rem"
        py="0.20rem"
        bg={window.focused ? 'blue.100' : 'gray.100'}
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
      <WindowMessageList window={window} />
      <Flex>
        <Input
          flex="1"
          ref={input}
          variant="flushed"
          onKeyUp={onKeyUp}
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
