import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { LoadingView, DesktopApp } from '.';
import type RootStore from '../stores/RootStore';

interface RootContainerProps {
  rootStore: RootStore;
}

const RootContainer: React.FunctionComponent<RootContainerProps> = ({ rootStore }: RootContainerProps) => {
  const [isDesktopReady, setIsDesktopReady] = useState(false);
  const { progress, currentlyLoading } = rootStore.startupStore;

  return (
    <>
      {!isDesktopReady && <LoadingView progress={progress} loadingDetail={currentlyLoading} />}
      {progress == 100 && <DesktopApp rootStore={rootStore} firstRenderComplete={() => setIsDesktopReady(true)} />}
    </>
  );
};

export default observer(RootContainer);
