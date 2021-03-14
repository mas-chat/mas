import React, { FunctionComponent, useContext } from 'react';
import { Box, Flex, Link, Text, Badge, Image } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import URI from 'urijs';
import { ImageModal, YouTubePreview } from '.';
import { ModalContext } from './ModalContext';
import MessageModel, {
  EmojiPart,
  MentionPart,
  TextPart,
  UrlPartType,
  UrlPartSubType,
  UrlPart
} from '../models/Message';

const TWEMOJI_CDN_BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/13.0.1';

interface MessageRowProps {
  message: MessageModel;
  isUnread: boolean;
}

const MessageRow: FunctionComponent<MessageRowProps> = ({ message, isUnread }: MessageRowProps) => {
  const modal = useContext(ModalContext);
  const showModal = (url: URI) => modal.onShow(<ImageModal src={url.toString()} />);

  const renderText = (text: TextPart) => text.text;

  const renderImageLink = (uri: URI) => (
    <Link key={Math.random()} onClick={() => showModal(uri)} color="tomato">
      {uri.filename()}
    </Link>
  );
  const renderGenericLink = (uri: URI) => (
    <Link key={Math.random()} href={uri.toString()} target="_blank" color="tomato">
      {uri.readable()}
    </Link>
  );
  const renderLink = (url: UrlPart) =>
    url.class === UrlPartSubType.Image ? renderImageLink(url.url) : renderGenericLink(url.url);

  const renderMention = (mention: MentionPart | string) => (
    <Badge key={Math.random()} variant="subtle" colorScheme="green">
      {typeof mention === 'string' ? mention : mention.text}
    </Badge>
  );

  const renderEmoji = (emoji: EmojiPart) => (
    <Image
      key={Math.random()}
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
        key={Math.random()}
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
          return renderMention(token);
        case UrlPartType.Emoji:
          return renderEmoji(token);
      }
    });

  const renderMessage = () => {
    const color = message.fromMe ? 'blue.600' : undefined;
    const nickColor = message.fromMe ? 'blue.600' : '#617eb5';

    return (
      <>
        <Text fontWeight="extrabold" display="inline-block" flex="1" color={nickColor}>
          {message.nick}:
        </Text>{' '}
        <Text overflowWrap="break-word" wordBreak="break-word" as="span" color={color}>
          {renderMessageParts()}
        </Text>
      </>
    );
  };

  const renderNotMessage = () => {
    if (message.isChannelAction) {
      return (
        <Text overflowWrap="break-word" wordBreak="break-word" as="span">
          {renderMention(message.channelAction.nick)} {message.channelAction.text}
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

  return (
    <Flex
      key={message.gid}
      flexDirection="row"
      fontSize="15px"
      width="100%"
      bgColor={isUnread ? 'blue.100' : 'transparent'}
      transition="background-color 1.5s ease-in"
    >
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
  );
};

export default observer(MessageRow);
