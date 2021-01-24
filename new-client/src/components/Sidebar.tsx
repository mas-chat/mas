import React from 'react';
import { observer } from 'mobx-react-lite';
import type RootStore from '../../stores/RootStore';

interface SidebarProps {
  rootStore: RootStore;
}

const Sidebar: React.FunctionComponent<SidebarProps> = observer(({ rootStore }) => {
  const windows = rootStore.windowStore.windows;

  return (
    <span>
      {Array.from(windows.entries()).map(([windowKey, window]) => {
        return <p key={windowKey}>Group: {window.name}</p>;
      })}
    </span>
  );
});

export default Sidebar;
