import React, { FunctionComponent, useContext, useState, KeyboardEvent } from 'react';
import {
  Box,
  Flex,
  Icon,
  Link,
  Text,
  Badge,
  Image,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input
} from '@chakra-ui/react';
import { IoMenu, IoPencil } from 'react-icons/io5';
import { observer } from 'mobx-react-lite';
import URI from 'urijs';
import { ServerContext } from './ServerContext';
import { ImageModal, YouTubePreview, UserInfoPopover } from '.';
import { ModalContext } from './ModalContext';
import MessageModel, { EmojiPart, TextPart, UrlPartType, UrlPartSubType, UrlPart } from '../models/Message';
import UserModel from '../models/User';
import { Network } from '../types/notifications';

const TWEMOJI_CDN_BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/13.0.1';

interface MessageRowProps {
  message: MessageModel;
  isUnread: boolean;
}

const MessageRow: FunctionComponent<MessageRowProps> = ({ message, isUnread }: MessageRowProps) => {
  const modal = useContext(ModalContext);
  const { windowStore } = useContext(ServerContext);
  const [isFocused, setFocused] = useState<boolean>(false);
  const [editedBody, setEditedBody] = useState<string | null>(null);

  const showModal = (url: URI) => modal.onShow(<ImageModal src={url.toString()} />);

  const renderText = (text: TextPart) => text.text;

  const renderImageLink = (uri: URI) => (
    <Link key={message.body} onClick={() => showModal(uri)} color="tomato">
      {uri.filename()}
    </Link>
  );
  const renderGenericLink = (uri: URI) => (
    <Link key={message.body} href={uri.toString()} target="_blank" color="tomato">
      {uri.readable()}
    </Link>
  );
  const renderLink = (url: UrlPart) =>
    url.class === UrlPartSubType.Image ? renderImageLink(url.url) : renderGenericLink(url.url);

  const renderMention = (user: UserModel, network: Network) => (
    <UserInfoPopover key={message.body} user={user}>
      <Badge variant="subtle" colorScheme="green">
        {user.nick[network]}
      </Badge>
    </UserInfoPopover>
  );

  const renderEmoji = (emoji: EmojiPart) => (
    <Image
      key={message.body}
      display="inline-block"
      draggable="false"
      height="1.2rem"
      verticalAlign="text-top"
      marginTop="-0.05rem"
      alt={emoji.shortCode}
      title={emoji.shortCode}
      src={`${TWEMOJI_CDN_BASE_URL}/svg/${emoji.codePoint}.svg`}
    />
  );

  const renderImagePreviews = () =>
    message.images.map(image => (
      <Image
        onClick={() => showModal(image.url)}
        key={message.body}
        maxHeight="8rem"
        m="1rem"
        src={image.url.toString()}
      />
    ));

  const renderVideoPreviews = () =>
    message.videos.map(video => (
      <YouTubePreview key={video.videoId} videoId={video.videoId} startTime={video.startTime} />
    ));

  const renderMessageParts = () =>
    message.bodyTokens.map(token => {
      switch (token.type) {
        case UrlPartType.Url:
          return renderLink(token);
        case UrlPartType.Text:
          return renderText(token);
        case UrlPartType.Mention:
          return renderMention(token.user, message.window.network);
        case UrlPartType.Emoji:
          return renderEmoji(token);
      }
    });

  const editedLabel = () =>
    message.edited && (
      <Text as="span" fontSize="xs" ml="0.5rem">
        <Icon as={IoPencil} /> {message.updatedTime}
      </Text>
    );

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      windowStore.editMessage(message, editedBody || '');
      setEditedBody(null);
    }

    if (event.key === 'Escape') {
      setEditedBody(null);
    }
  };

  const renderMessage = () => {
    const color = message.isFromMe ? 'blue.600' : undefined;
    const nickColor = message.isFromMe ? 'blue.600' : '#617eb5';

    if (editedBody) {
      return <Input onKeyUp={onKeyUp} onChange={e => setEditedBody(e.target.value)} value={editedBody} />;
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
            {renderMessageParts()}
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
            <Menu placement="left">
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
              <MenuList minWidth="0">
                <MenuItem onClick={handleEdit}>Edit</MenuItem>
                <MenuItem onClick={handleDelete}>Delete</MenuItem>
              </MenuList>
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
