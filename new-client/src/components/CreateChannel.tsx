import React, { FunctionComponent } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { Box, Flex, CloseButton, Heading } from '@chakra-ui/react';
import { rootUrl } from '../lib/urls';

const Search: FunctionComponent = () => {
  return (
    <Flex width="100%" height="100%" p="1rem" direction="column">
      <Flex width="100%" justifyContent="center" pb="1rem" direction="row">
        <Heading flex="1">Create Channel</Heading>
        <CloseButton as={Link} to={rootUrl()} />
      </Flex>
      <Box flex="1">Coming soon..</Box>
    </Flex>
  );
};

export default observer(Search);
