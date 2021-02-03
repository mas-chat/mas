import React, { FunctionComponent, Fragment, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Divider, Flex } from '@chakra-ui/react';
import { Window } from '.';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';

const Desktop: FunctionComponent = () => {
  const { windowStore, profileStore } = useContext(ServerContext);
  const windows: WindowModel[] = Array.from(windowStore.windows.values());
  const visibleWindows = windows.filter(window => window.desktopId === profileStore.settings.activeDesktop);
  const rows = [...new Set(visibleWindows.map(window => window.row))].sort();

  return (
    <Flex flex="1" flexDirection="column">
      {rows.map(row => {
        return (
          <Fragment key={row}>
            <Divider colorScheme="gray" />
            <Flex flex="1" flexDirection="row">
              {visibleWindows
                .filter(window => window.row === row)
                .map(window => {
                  return (
                    <Fragment key={window.id}>
                      <Divider orientation="vertical" />
                      <Window window={window} />
                    </Fragment>
                  );
                })}
            </Flex>
          </Fragment>
        );
      })}
    </Flex>
  );
};

export default observer(Desktop);
