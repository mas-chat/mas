import React, { FunctionComponent } from 'react';
import { ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Image, Text, Flex, Link } from '@chakra-ui/react';

interface ImageModalProps {
  src: string;
}

const ImageModal: FunctionComponent<ImageModalProps> = ({ src }: ImageModalProps) => {
  return (
    <>
      <ModalHeader>Image</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Flex height="100%" alignItems="center">
          <Image flex="1" maxHeight="100%" objectFit="scale-down" src={src} />
        </Flex>
      </ModalBody>
      <ModalFooter justifyContent="center">
        <Text fontSize="sm">
          <Link href={src}>{src}</Link>
        </Text>
      </ModalFooter>
    </>
  );
};

export default ImageModal;
