import React, { FunctionComponent, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { ServerContext } from './ServerContext';
import { ModalType } from '../models/Modal';
import { HelpModal, InfoModal } from '.';

const ModalManager: FunctionComponent = () => {
  const { modalStore } = useContext(ServerContext);
  const modals = modalStore.modals;

  if (modals.length === 0) {
    return null;
  }

  const activeModal = modals[0];
  const onClose = () => modalStore.closeModal();

  switch (activeModal.type) {
    case ModalType.Info:
      return <InfoModal modal={activeModal} onClose={onClose} />;
    case ModalType.Help:
      return <HelpModal onClose={onClose} />;
  }
};

export default observer(ModalManager);
