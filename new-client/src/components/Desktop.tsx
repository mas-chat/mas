import React from 'react';
import { observer } from 'mobx-react-lite';
import { Grid } from '@chakra-ui/react';
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

  return (
    <Grid
      flex={flex}
      templateColumns={`repeat(${visibleWindows.length}, 1fr)`}
      templateRows="1fr"
      overflow="hidden"
      gap={6}
    >
      {visibleWindows.map(window => {
        return <Window key={window.id} window={window} />;
      })}
    </Grid>
  );
};

export default observer(Desktop);
