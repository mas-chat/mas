import React from 'react';
import { observer } from 'mobx-react-lite';
import type RootStore from '../../stores/RootStore';

interface DesktopProps {
  rootStore: RootStore;
}

const Desktop: React.FunctionComponent<DesktopProps> = observer(({ rootStore }) => {
  const windows = rootStore.windowStore.windows;

  return (
    <span>
      {Array.from(windows.entries()).map(([windowKey, window]) => {
        return (
          <p key={windowKey}>
            Group: {window.name}, topic: {window.topic}
            {Array.from(window.messages.entries()).map(([messageKey, message]) => {
              return (
                <div key={messageKey}>
                  {message.nick}: {message.body}
                </div>
              );
            })}
          </p>
        );
      })}
    </span>
  );
});

export default Desktop;
