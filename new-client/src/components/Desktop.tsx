import React, { FunctionComponent, Fragment, useContext, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Flex } from '@chakra-ui/react';
import { ThemeProvider } from '@remirror/react';
import { AllStyledComponent } from '@remirror/styles/emotion';
import { Window } from '.';
import { ServerContext } from './ServerContext';
import { useIsMobile } from '../hooks/isMobile';

const border = '1px solid #bbb';
const enableRemirrorTheming = false; // TODO: Enable when needed and fix CSS

const Desktop: FunctionComponent = () => {
  const { windowStore } = useContext(ServerContext);
  const { isMobile } = useIsMobile();
  const activeWindow = windowStore.activeWindow;

  const RemirrorWrapper = ({ children }: { children: ReactNode }) =>
    enableRemirrorTheming ? (
      <ThemeProvider>
        <AllStyledComponent>{children}</AllStyledComponent>
      </ThemeProvider>
    ) : (
      <>{children}</>
    );

  if (isMobile) {
    return (
      activeWindow && (
        <RemirrorWrapper>
          <Window singleWindowMode={true} window={activeWindow} />;
        </RemirrorWrapper>
      )
    );
  }

  const windowHeight = Math.round(100 / windowStore.visibleWindowsGrid.length);
  const grid = windowStore.visibleWindowsGrid.flat();
  const Break = <Box flexBasis="100%" borderTop={border} />;

  return (
    <RemirrorWrapper>
      <Flex flex="1" flexWrap="wrap" minWidth="0">
        {grid.map((window, index) => (
          <Fragment key={window.id}>
            {index > 0 && grid[index - 1]?.row !== window.row && Break}
            <Box borderLeft={border} />
            <Window window={window} height={windowHeight} />
          </Fragment>
        ))}
      </Flex>
    </RemirrorWrapper>
  );
};

export default observer(Desktop);
