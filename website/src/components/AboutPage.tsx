import React, { FunctionComponent } from 'react';
import { Box, Heading, HStack } from '@chakra-ui/react';

export const AboutPage: FunctionComponent = () => (
  <Box>
    MAS is a web based chat tool. Source code is available at
    <HStack>
      <Heading my={10} size="md">
        <a href="https://github.com/mas-chat/mas">https://github.com/mas-chat/mas</a>
      </Heading>
    </HStack>
  </Box>
);
