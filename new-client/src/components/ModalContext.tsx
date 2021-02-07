import React, { createContext, FunctionComponent, useState, ReactNode } from 'react';
import { Modal, ModalOverlay, ModalContent } from '@chakra-ui/react';

interface ModalContextValue {
  onShow: (content?: ReactNode) => void;
  onHide: () => void;
}

export const ModalContext = createContext<ModalContextValue>({
  onShow: () => {
    // Do nothing
  },
  onHide: () => {
    // Do nothing
  }
});

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalContextProvider: FunctionComponent<ModalProviderProps> = ({ children }: ModalProviderProps) => {
  const [visible, setVisible] = useState(false);
  const [component, setComponent] = useState<ReactNode | undefined>(undefined);

  const onShow = (newComponent?: ReactNode) => {
    if (newComponent) {
      setComponent(newComponent);
      setVisible(true);
    }
  };
  const onHide = () => setVisible(false);

  return (
    <ModalContext.Provider value={{ onShow, onHide }}>
      {visible && (
        <Modal onClose={onHide} size="full" isOpen={visible} isCentered scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent>{component}</ModalContent>
        </Modal>
      )}
      {children}
    </ModalContext.Provider>
  );
};
