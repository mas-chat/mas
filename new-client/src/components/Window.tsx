import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box } from '@chakra-ui/react';
import WindowModel from '../models/Window';

interface WindowProps {
  window: WindowModel;
}

const Window: React.FunctionComponent<WindowProps> = ({ window }: WindowProps) => {
  return (
    <Box bg="tomato" color="white">
      <p key={window.windowId}>Group: {window.name}</p>;
      {Array.from(window.messages.entries()).map(([messageKey, message]) => {
        return (
          <div key={messageKey}>
            {message.nick}: {message.body}
          </div>
        );
      })}
    </Box>
  );
};

export default observer(Window);
