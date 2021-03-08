import React, { FunctionComponent, Fragment, useContext, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Flex } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Window } from '.';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';

interface DesktopProps {
  singleWindowMode?: boolean;
}

const Desktop: FunctionComponent<DesktopProps> = ({ singleWindowMode = false }: DesktopProps) => {
  const { windowStore } = useContext(ServerContext);
  const windows: WindowModel[] = Array.from(windowStore.windows.values());
  const activeDesktop = windowStore.activeWindow?.desktopId;
  const visibleWindows = windows.filter(window => window.desktopId === activeDesktop);
  const rows = [...new Set(visibleWindows.map(window => window.row))].sort();
  const { windowId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fallbackWindowId = windowStore.setActiveWindowByIdWithFallback(parseInt(windowId));

    if (fallbackWindowId) {
      navigate(`/app/c/${fallbackWindowId}`);
    }
  }, [windowStore, windowId, navigate]);

  if (singleWindowMode) {
    return windowStore.activeWindow ? <Window mobile={true} window={windowStore.activeWindow} /> : null;
  }

  return (
    <Flex flex="1" flexDirection="column">
      {rows.map(row => {
        return (
          <Fragment key={row}>
            {row !== 0 && <Box borderTop="1px solid #bbb" />}
            <Flex flex="1" flexDirection="row">
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
