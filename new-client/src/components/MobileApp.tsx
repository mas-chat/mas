import React, { FunctionComponent, useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Flex, Box, Slide } from '@chakra-ui/react';
import { Sidebar, Window } from '.';
import { ServerContext } from './ServerContext';

interface MobileAppProps {
  firstRenderComplete: () => void;
}

const MobileApp: FunctionComponent<MobileAppProps> = ({ firstRenderComplete }: MobileAppProps) => {
  const { windowStore } = useContext(ServerContext);
  const [windowSelector, setWindowSelector] = useState(true);

  useEffect(firstRenderComplete, []);

  const onSwitchWindow = () => {
    setWindowSelector(false);
  };

  const onExit = () => {
    setWindowSelector(true);
  };

  return (
    <>
      <Slide direction="left" in={windowSelector} style={{ zIndex: 10 }}>
        <Box height="100%" bgColor="red.300">
          <Sidebar width="100%" onSwitchWindow={onSwitchWindow} showDesktops={false} />
        </Box>
      </Slide>

      {windowStore.activeWindow && <Window onExit={onExit} window={windowStore.activeWindow} />}
    </>
  );
};

export default observer(MobileApp);
