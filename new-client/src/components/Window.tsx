import React, { FunctionComponent, useContext, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDropzone } from 'react-dropzone';
import { HStack, IconButton, Heading, Flex } from '@chakra-ui/react';
import { IoShareOutline, IoArrowBack } from 'react-icons/io5';
import { Link, useNavigate } from 'react-router-dom';
import { WindowMessageList, WindowEmojiPicker, WindowMenu, WindowMoveControls, MessageEditor } from '.';
import WindowModel from '../models/Window';
import { useMessageRemirror } from '../hooks/remirror';
import { ServerContext } from './ServerContext';
import { rootUrl, windowUrl } from '../lib/urls';

interface WindowProps {
  window: WindowModel;
  height?: number;
  singleWindowMode?: boolean;
}

const Window: FunctionComponent<WindowProps> = ({ window, height = 100, singleWindowMode }: WindowProps) => {
  const { windowStore } = useContext(ServerContext);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const navigate = useNavigate();

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

  const messageRemirror = useMessageRemirror();

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
            icon={<IoArrowBack />}
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
        <MessageEditor window={window} messageRemirror={messageRemirror} />
        <HStack ml="0.2rem" spacing="0.2rem">
          <WindowEmojiPicker manager={messageRemirror.manager} />
          <input {...getInputProps()} />
          <IconButton
            {...getRootProps()}
            aria-label="Options"
            isActive={isDragActive}
            icon={<IoShareOutline />}
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
