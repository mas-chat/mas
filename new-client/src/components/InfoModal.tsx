import React, { FunctionComponent } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button
} from '@chakra-ui/react';
import { Modal as ModalModel } from '../models/Modal';

interface InfoModalProps {
  modal: ModalModel;
  onClose: () => void;
}

const InfoModal: FunctionComponent<InfoModalProps> = ({ modal, onClose }: InfoModalProps) => {
  const onCloseAction = () => {
    modal.action?.submit();
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} closeOnEsc={!modal.forced} closeOnOverlayClick={!modal.forced}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{modal.title}</ModalHeader>
        {!modal.forced && <ModalCloseButton />}
        <ModalBody>{modal.body}</ModalBody>
        {modal.action ? (
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onCloseAction}>
              {modal.action.executedButton}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {modal.action.cancelButton}
            </Button>
          </ModalFooter>
        ) : (
          !modal.forced && (
            <ModalFooter>
              <Button onClick={onClose}>Okay</Button>
            </ModalFooter>
          )
        )}
      </ModalContent>
    </Modal>
  );
};

export default InfoModal;
