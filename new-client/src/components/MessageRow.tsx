import React, { FunctionComponent, useContext, useState, KeyboardEvent } from 'react';
import {
  Button,
  Box,
  Flex,
  Icon,
  Text,
  Badge,
  Image,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  Portal
} from '@chakra-ui/react';
import { IoMenu, IoPencil } from 'react-icons/io5';
import {
  Callout,
  CodeBlock,
  createIFrameHandler,
  createLinkHandler,
  Doc,
  Heading,
  MarkMap,
  RemirrorRenderer,
  TextHandler
} from '@remirror/react';
import { ProsemirrorNode } from '@remirror/core';
import { observer } from 'mobx-react-lite';
import { ServerContext } from './ServerContext';
import { ImageModal, YouTubePreview, UserInfoPopover, NickLabel } from '.';
import { ModalContext } from './ModalContext';
import MessageModel from '../models/Message';
import UserModel from '../models/User';
import { Network } from '../types/notifications';
import { UserStore } from '../stores';

//const TWEMOJI_CDN_BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/13.0.1';

const renderMention = (user: UserModel, network: Network, insertAt = false) => (
  <UserInfoPopover key={user.nick[network]} user={user}>
    <NickLabel>
      {insertAt ? '@' : ''}
      {user.nick[network]}
    </NickLabel>
  </UserInfoPopover>
);

const createMentionHandler = (userStore: UserStore, network: Network) => {
  const mentionHandler: FunctionComponent<{ node: ProsemirrorNode }> = ({ node }) => {
    const user = userStore.users.get(node.attrs.id);

    if (!user) {
      return <span>{node.attrs.label}</span>;
    }

    return renderMention(user, network, true);
  };

  return mentionHandler;
};

interface MessageRowProps {
  message: MessageModel;
  isUnread: boolean;
}

const MessageRow: FunctionComponent<MessageRowProps> = ({ message, isUnread }: MessageRowProps) => {
  const modal = useContext(ModalContext);
  const { windowStore, userStore } = useContext(ServerContext);
  const [isFocused, setFocused] = useState<boolean>(false);
  const [editedBody, setEditedBody] = useState<string | null>(null);

  const showModal = (url: URI) => modal.onShow(<ImageModal src={url.toString()} />);

  const markMap: MarkMap = {
    italic: 'em',
    bold: 'strong',
    code: 'code',
    link: createLinkHandler({ target: '_blank' }),
    underline: 'u'
  };

  const typeMap: MarkMap = {
    blockquote: 'blockquote',
    bulletList: 'ul',
    callout: Callout,
    codeBlock: CodeBlock,
    doc: Doc,
    hardBreak: 'br',
    heading: Heading,
    horizontalRule: 'hr',
    iframe: createIFrameHandler(),
    image: 'img',
    listItem: 'li',
    paragraph: 'p',
    orderedList: 'ol',
    text: TextHandler,
    mentionAtom: createMentionHandler(userStore, message.window.network)
  };

  const renderImagePreviews = () =>
    message.images.map(image => (
      <Image
        onClick={() => showModal(image.url)}
        key={image.url.toString()}
        maxHeight="8rem"
        m="1rem"
        src={image.url.toString()}
      />
    ));

  const renderVideoPreviews = () =>
    message.videos.map(video => (
      <YouTubePreview key={video.videoId} videoId={video.videoId} startTime={video.startTime} />
    ));

  const renderUserMessage = () => {
    if (message.doc) {
      return <RemirrorRenderer json={message.doc} typeMap={typeMap} markMap={markMap} />;
    }

    return message.body;
  };

  const editedLabel = () =>
    message.edited && (
      <Text as="span" fontSize="xs" ml="0.5rem">
        <Icon as={IoPencil} /> {message.updatedTime}
      </Text>
    );

  const cancelEdit = () => {
    setEditedBody(null);
  };

  const saveEdit = () => {
    windowStore.editMessage(message, editedBody || '');
    setEditedBody(null);
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      saveEdit();
    }

    if (event.key === 'Escape') {
      cancelEdit();
    }
  };

  const renderMessage = () => {
    const color = message.isFromMe ? 'blue.600' : undefined;
    const nickColor = message.isFromMe ? 'blue.600' : '#617eb5';

    if (editedBody) {
      return (
        <>
          <Input onKeyUp={onKeyUp} onChange={e => setEditedBody(e.target.value)} value={editedBody} autoFocus />
          <Button onClick={saveEdit} size="xs" my="0.5rem">
            Change
          </Button>
          <Button onClick={cancelEdit} size="xs" variant="ghost" ml="0.5rem" my="0.5rem">
            Cancel
          </Button>
        </>
      );
    }

    return (
      <>
        <UserInfoPopover user={message.user}>
          <Text fontWeight="extrabold" display="inline-block" flex="1" color={nickColor}>
            {message.nick}:
          </Text>
        </UserInfoPopover>{' '}
        {message.deleted ? (
          <Badge variant="subtle" colorScheme="red">
            DELETED
          </Badge>
        ) : (
          <Box overflowWrap="break-word" wordBreak="break-word" as="span" color={color}>
            {renderUserMessage()}
            {editedLabel()}
          </Box>
        )}
      </>
    );
  };

  const renderNotMessage = () => {
    if (message.isChannelAction) {
      return (
        <Text overflowWrap="break-word" wordBreak="break-word" as="span">
          {renderMention(message.user, message.window.network)} {message.channelAction}
        </Text>
      );
    } else if (message.isBanner) {
      return (
        <Text fontFamily="monospace" whiteSpace="pre">
          {message.body}
        </Text>
      );
    } else if (message.isServerNote) {
      return <Text color="yellow.600">{message.body}</Text>;
    } else if (message.isInfo) {
      return <Text color="green.600">{message.body}</Text>;
    } else if (message.isError) {
      return <Text color="red.600">{message.body}</Text>;
    }

    return message.body;
  };

  const handleFocused = () => {
    setFocused(true);
  };

  const handleUnfocused = () => {
    setFocused(false);
  };

  const handleDelete = () => {
    windowStore.editMessage(message, '');
  };

  const handleEdit = () => {
    setEditedBody(message.body);
  };

  return (
    <Flex
      key={message.gid}
      flexDirection="row"
      fontSize="15px"
      width="100%"
      bgColor={isUnread ? '#ff024d1a' : 'transparent'}
      transition="background-color 1s ease-in"
    >
      <Flex
        width="100%"
        onMouseEnter={handleFocused}
        onMouseLeave={handleUnfocused}
        bgColor={isFocused ? '#253f726b' : 'transparent'}
      >
        {message.isMessageFromUser && message.isFromMe && !editedBody && (
          <Box position="absolute" right="0">
            <Menu isLazy flip={false} placement="left">
              <MenuButton
                visibility={isFocused ? 'visible' : 'hidden'}
                as={IconButton}
                width="1.1rem"
                minWidth="1.2rem"
                height="1.2rem"
                variant="ghost"
                aria-label="Menu"
                fontSize="1rem"
                icon={<IoMenu />}
              />
              <Portal>
                <MenuList minWidth="0">
                  <MenuItem onClick={handleEdit}>Edit</MenuItem>
                  <MenuItem onClick={handleDelete}>Delete</MenuItem>
                </MenuList>
              </Portal>
            </Menu>
          </Box>
        )}
        <Box minWidth="50px">{message.createdTime}</Box>
        <Box flex="1">
          {message.isMessageFromUser ? renderMessage() : renderNotMessage()}
          {message.hasImages && <Flex flexDirection="row">{renderImagePreviews()}</Flex>}
          {message.hasVideos && (
            <Flex flexDirection="row" height="180px" m="1rem">
              {renderVideoPreviews()}
            </Flex>
          )}
        </Box>
      </Flex>
    </Flex>
  );
};

export default observer(MessageRow);
