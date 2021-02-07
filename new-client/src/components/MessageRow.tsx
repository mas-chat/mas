import React, { FunctionComponent, useContext } from 'react';
import { Box, Flex, Link, Text, Badge, Image } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import URI from 'urijs';
import { ImageModal } from '.';
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

  const imageLink = (uri: URI) => (
    <Link key={Math.random()} onClick={() => showModal(uri)} color="tomato">
      {uri.filename()}
    </Link>
  );
  const genericLink = (uri: URI) => (
    <Link key={Math.random()} href={uri.toString()} target="_blank" color="tomato">
      {uri.readable()}
    </Link>
  );
  const link = (uri: URI, subType: UrlPartSubType) =>
    subType === UrlPartSubType.Image ? imageLink(uri) : genericLink(uri);

  const mention = (text: string) => (
    <Badge key={Math.random()} variant="subtle" colorScheme="green">
      {text}
    </Badge>
  );

  const emoji = (emoji: string) => <span key={Math.random()}>{emoji}</span>;

  const images =
    message.hasImages &&
    message.images.map(image => (
      <Image
        onClick={() => showModal(image.url)}
        key={Math.random()}
        maxHeight="8rem"
        m="1rem"
        src={image.url.toString()}
      />
    ));

  const parts = message.bodyTokens.map(token => {
    if (token.type === 'url') {
      return link(token.url, token.class);
    } else if (token.type === 'text') {
      return token.text;
    } else if (token.type === 'mention') {
      return mention(token.text);
    } else if (token.type === 'emoji') {
      return emoji(token.emoji);
    }
  });

  return (
    <Flex key={message.gid} flexDirection="row">
      <Box minWidth="50px">{message.createdTime}</Box>
      <Box flex="1">
        <Text as="b" flex="1">
          {message.nick}:
        </Text>{' '}
        <Text overflowWrap="break-word" wordBreak="break-word" as="span">
          {parts}
        </Text>
        <Flex flexDirection="row">{images}</Flex>
      </Box>
    </Flex>
  );
};

export default observer(MessageRow);
