import React from 'react';
import { observer } from 'mobx-react-lite';
import { Flex } from '@chakra-ui/react';
import { Window } from '.';
import type RootStore from '../stores/RootStore';
import WindowModel from '../models/Window';

interface DesktopProps {
  flex?: string;
  rootStore: RootStore;
}

const Desktop: React.FunctionComponent<DesktopProps> = ({ rootStore, flex }: DesktopProps) => {
  const windows: WindowModel[] = Array.from(rootStore.windowStore.windows.values());
  const visibleWindows = windows.filter(window => window.desktopId === rootStore.settingStore.settings.activeDesktop);
  const rows = [...new Set(visibleWindows.map(window => window.row))].sort();

  const onSendMessage = (window: WindowModel, message: string) => {
    rootStore.windowStore.sendText(window, message);
  };

  return (
    <Flex flex={flex} flexDirection="column">
      {rows.map(row => {
        return (
          <Flex key={row} flex="1" flexDirection="row">
            {visibleWindows
              .filter(window => window.row === row)
              .map(window => {
                return (
                  <Window
                    key={window.id}
                    onSendMessage={message => onSendMessage(window, message)}
                    window={window}
                    initDone={rootStore.windowStore.initDone}
                  />
                );
              })}
          </Flex>
        );
      })}
    </Flex>
  );
};

export default observer(Desktop);
