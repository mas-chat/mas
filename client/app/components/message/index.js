import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Icon from '@mdi/react';
import { mdiAppleKeyboardCommand } from '@mdi/js';
import { shortnameToUnicode } from 'emoji-toolkit';

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const TimeStamp = styled.div`
  color: #26547d;
  width: 42px;
  flex-shrink: 0;
`;

const Nick = styled.span`
  font-weight: bold;
  color: #104d73;
  padding-right: 4px;
`;

const Message = ({ message: { nick, text, decoratedTs } }) => (
  <Wrapper>
    <TimeStamp>{decoratedTs}</TimeStamp>
    <Nick>{nick}:</Nick>
    {shortnameToUnicode(text)}
    <Icon path={mdiAppleKeyboardCommand} size={1} horizontal vertical rotate={90} color="red" />
  </Wrapper>
);

Message.propTypes = {
  message: PropTypes.string.isRequired
};

export default Message;
