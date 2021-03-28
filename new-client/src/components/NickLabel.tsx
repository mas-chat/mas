import React, { ReactNode, FunctionComponent } from 'react';
import { Text } from '@chakra-ui/react';

interface NickLabelProps {
  children: ReactNode;
}

const NickLabel: FunctionComponent<NickLabelProps> = ({ children }: NickLabelProps) => (
  <Text as="span" textDecor="underline" fontWeight="extrabold" colorScheme="green">
    {children}
  </Text>
);

export default NickLabel;
