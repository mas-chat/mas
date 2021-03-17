import React, { FunctionComponent, useRef } from 'react';
import { ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Image, Text, Flex, Link } from '@chakra-ui/react';
import useResizeObserver from 'use-resize-observer';

interface ImageModalProps {
  src: string;
}

const ImageModal: FunctionComponent<ImageModalProps> = ({ src }: ImageModalProps) => {
  const placeholder = useRef<HTMLDivElement>(null);
  const { width = 0, height = 0 } = useResizeObserver<HTMLDivElement>({ ref: placeholder });

  return (
    <>
      <ModalHeader>Image</ModalHeader>
      <ModalCloseButton />
      <ModalBody ref={placeholder}>
        <Flex position="absolute" width={width} height={height} alignItems="center" justifyContent="center">
          <Image maxHeight="100%" objectFit="scale-down" src={src} />
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
