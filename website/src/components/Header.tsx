import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, Flex, Text, Button } from '@chakra-ui/react';
import { IoMenu, IoClose, IoChatbox } from 'react-icons/io5';

const pages = [
  {
    url: 'about',
    title: 'About'
  }
];

const MenuItem = ({ children, isLast = false, to = '/' }: { children: ReactNode; isLast?: boolean; to?: string }) => {
  return (
    <Text mb={{ base: isLast ? 0 : 8, sm: 0 }} mr={{ base: 0, sm: isLast ? 0 : 8 }} display="block">
      <Link to={to}>{children}</Link>
    </Text>
  );
};

export const Header = ({ onOpenLoginModal }: { onOpenLoginModal: () => void }) => {
  const [show, setShow] = React.useState(false);
  const toggleMenu = () => setShow(!show);

  return (
    <Flex as="nav" align="center" justify="space-between" wrap="wrap" width="100%" mb={8} p={8}>
      <Link to="/">
        <Flex align="center" color="blue.300">
          <IoChatbox />
          <Box ml={3}>MAS</Box>
        </Flex>
      </Link>

      <Box display={{ base: 'block', md: 'none' }} onClick={toggleMenu}>
        {show ? <IoClose /> : <IoMenu />}
      </Box>

      <Box display={{ base: show ? 'block' : 'none', md: 'block' }} flexBasis={{ base: '100%', md: 'auto' }}>
        <Flex
          align="center"
          justify={['center', 'space-between', 'flex-end', 'flex-end']}
          direction={['column', 'row', 'row', 'row']}
          pt={[4, 4, 0, 0]}
        >
          {pages.map(page => (
            <MenuItem key={page.url} to={page.url}>
              {page.title}
            </MenuItem>
          ))}
          <MenuItem to="#" isLast>
            <Button onClick={onOpenLoginModal}>Sign In</Button>
          </MenuItem>
        </Flex>
      </Box>
    </Flex>
  );
};
