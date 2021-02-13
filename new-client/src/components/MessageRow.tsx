import React, { FunctionComponent, useContext } from 'react';
import { Box, Flex, Link, Text, Badge, Image } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import URI from 'urijs';
import { ImageModal, YouTubePreview } from '.';
import { ModalContext } from './ModalContext';
import MessageModel, { UrlPartSubType } from '../models/Message';

interface MessageRowProps {
  message: MessageModel;
}

// private renderEmoji(name: string, src: string) {
//   return `<img align="absmiddle" alt="${name}" title="${name}" class="emoji" src="https://twemoji.maxcdn.com/v/latest/72x72/${src}.png"/>`;
// }

const MessageRow: FunctionComponent<MessageRowProps> = ({ message }: MessageRowProps) => {
  const modal = useContext(ModalContext);
  const showModal = (url: URI) => modal.onShow(<ImageModal src={url.toString()} />);

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
  const renderLink = (uri: URI, subType: UrlPartSubType) =>
    subType === UrlPartSubType.Image ? renderImageLink(uri) : renderGenericLink(uri);

  const renderMention = (text: string) => (
    <Badge key={Math.random()} variant="subtle" colorScheme="green">
      {text}
    </Badge>
  );

  const renderEmoji = (emoji: string) => <span key={Math.random()}>{emoji}</span>;

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
      if (token.type === 'url') {
        return renderLink(token.url, token.class);
      } else if (token.type === 'text') {
        return token.text;
      } else if (token.type === 'mention') {
        return renderMention(token.text);
      } else if (token.type === 'emoji') {
        return renderEmoji(token.emoji);
      }
    });

  const renderMessage = () => {
    const color = message.fromMe ? 'blue.600' : 'black';

    return (
      <>
        <Text as="b" flex="1" color={color}>
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
    <Flex key={message.gid} flexDirection="row" fontSize="15px" width="100%">
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
