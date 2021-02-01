import React from 'react';
import { Box, Flex, Link, Text, Badge } from '@chakra-ui/react';
import MessageModel from '../models/Message';

interface MessageRowProps {
  message: MessageModel;
}

// private renderEmoji(name: string, src: string) {
//   return `<img align="absmiddle" alt="${name}" title="${name}" class="emoji" src="https://twemoji.maxcdn.com/v/latest/72x72/${src}.png"/>`;
// }

// private renderMention(beforeCharacter: string, nick: string) {
//   return `${beforeCharacter}<span class="nick-mention">${nick}</span>`;
// }

const MessageRow: React.FunctionComponent<MessageRowProps> = ({ message }: MessageRowProps) => {
  const link = (href: string) => (
    <Link key={Math.random()} href={href} target="_blank" color="tomato">
      {href}
    </Link>
  );
  const mention = (text: string) => (
    <Badge key={Math.random()} variant="subtle" colorScheme="green">
      {text}
    </Badge>
  );

  const emoji = (emoji: string) => <span key={Math.random()}>{emoji}</span>;

  const parts = message.bodyTokens.map(token => {
    if (token.type === 'url') {
      return link(token.url.readable());
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
        <Text as="span">{parts}</Text>
      </Box>
    </Flex>
  );
};

export default MessageRow;
