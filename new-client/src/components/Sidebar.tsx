import React, { FunctionComponent, useContext } from 'react';
import { Box, Flex, Heading, Spacer, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import { ServerContext } from './ServerContext';

const Sidebar: FunctionComponent = () => {
  const { windowStore, profileStore } = useContext(ServerContext);

  const switchDesktop = (desktopId: number) => {
    profileStore.changeActiveDesktop(desktopId);
  };

  return (
    <Flex width="140px" flexDirection="column" bgColor="gray.100">
      {windowStore.desktops.map((desktop, index) => {
        return (
          <Box key={desktop.id} p="8px">
            <Heading
              as="button"
              onClick={() => switchDesktop(desktop.id)}
              size="s"
              width="100%"
              _hover={{
                color: 'teal.500'
              }}
              bgColor={desktop.id === profileStore.settings.activeDesktop ? 'blue.100' : 'transparent'}
            >
              Desktop #{index}
            </Heading>
            {desktop.windows.map(window => {
              return (
                <Text key={window.id} pl="10px" isTruncated>
                  {window.simplifiedName}
                </Text>
              );
            })}
          </Box>
        );
      })}
      <Spacer />
      <Box p="8px">
        <Heading as="button" size="s" width="100%">
          Search
        </Heading>
      </Box>
      <Box p="8px">
        <Heading as="button" size="s" width="100%">
          Profile
        </Heading>
      </Box>
    </Flex>
  );
};

export default observer(Sidebar);
