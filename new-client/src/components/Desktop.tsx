import React, { FunctionComponent, Fragment, useContext, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Flex } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Window } from '.';
import { ServerContext } from './ServerContext';
import { BASE_ID, windowUrl, rootUrl } from '../lib/urls';

interface DesktopProps {
  singleWindowMode?: boolean;
}

const Desktop: FunctionComponent<DesktopProps> = ({ singleWindowMode = false }: DesktopProps) => {
  const { windowStore } = useContext(ServerContext);
  const { windowId: windowIdUrlParam } = useParams();
  const navigate = useNavigate();
  const windows = windowStore.windowsArray;
  const activeWindow = windowStore.activeWindow;
  const visibleWindows = windows.filter(window => window.desktopId === activeWindow?.desktopId);
  const rows = [...new Set(visibleWindows.map(window => window.row))].sort();

  useEffect(() => {
    // windowId URL parameter is source of truth for the active window. This hook
    // detects changes in the URL and syncs the activeWindow store prop. If the
    // URL points to non-existing window then we navigate to root which makes
    // some other window active by navigating second time.
    const newWindowId = parseInt(windowIdUrlParam, 36) - BASE_ID;
    const success = windowStore.tryChangeActiveWindowById(newWindowId);

    navigate(success ? windowUrl({ windowId: newWindowId }) : rootUrl());
  }, [windowStore, windowIdUrlParam, navigate, ...windows.map(window => window.id)]); // eslint-disable-line react-hooks/exhaustive-deps

  if (singleWindowMode) {
    return <Window singleWindowMode={true} window={activeWindow} />;
  }

  return (
    <Flex flex="1" minWidth="0" flexDirection="column">
      {rows.map(row => {
        return (
          <Fragment key={row}>
            {row !== 0 && <Box borderTop="1px solid #bbb" />}
            <Flex flex="1" minWidth="0" flexDirection="row">
              {visibleWindows
                .filter(window => window.row === row)
                .map(window => {
                  return (
                    <Fragment key={window.id}>
                      <Box borderLeft="1px solid #bbb" />
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
