import React from 'react';
import { observer } from 'mobx-react-lite';
import { Grid } from '@chakra-ui/react';
import { Window } from '.';
import type RootStore from '../stores/RootStore';

interface DesktopProps {
  flex?: string;
  rootStore: RootStore;
}

const Desktop: React.FunctionComponent<DesktopProps> = ({ rootStore, flex }: DesktopProps) => {
  const windows = rootStore.windowStore.windows;

  return (
    <Grid flex={flex} overflow="hidden" gap={6}>
      {Array.from(windows.entries()).map(([windowId, window]) => {
        return <Window key={windowId} window={window} />;
      })}
    </Grid>
  );
};

export default observer(Desktop);
