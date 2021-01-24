import React from 'react';
import { observer } from 'mobx-react-lite';
import { Grid } from '@chakra-ui/react';
import { Window } from '..';
import type RootStore from '../../stores/RootStore';

interface DesktopProps {
  rootStore: RootStore;
}

const Desktop: React.FunctionComponent<DesktopProps> = ({ rootStore }: DesktopProps) => {
  const windows = rootStore.windowStore.windows;

  return (
    <Grid templateColumns="repeat(5, 1fr)" gap={6}>
      {Array.from(windows.entries()).map(([windowId, window]) => {
        return (
          <span key={windowId}>
            <Window window={window} />
          </span>
        );
      })}
    </Grid>
  );
};

export default observer(Desktop);
