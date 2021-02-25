import React, { FunctionComponent } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th
} from '@chakra-ui/react';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: FunctionComponent<HelpModalProps> = ({ onClose }: HelpModalProps) => (
  <Modal size="4xl" isOpen={true} onClose={onClose}>
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>Available commands</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Table>
          <Thead>
            <Tr>
              <Th>Command</Th>
              <Th>Description</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>
                <b>/1on1</b> &lt;nick&gt;
              </Td>
              <Td>Start 1on1 discussion with a MAS user</Td>
            </Tr>
            <Tr>
              <Td>
                <b>/ircquery</b> &lt;nick&gt;
              </Td>
              <Td>Start 1on1 discussion with an IRC user. Only available in an IRC window.</Td>
            </Tr>
            <Tr>
              <Td>
                <b>/me</b> drinks coffee
              </Td>
              <Td>Send an action. Only available in an IRC window.</Td>
            </Tr>
            <Tr>
              <Td>
                <b>/topic</b> Meeting at 10 o&apos;clock
              </Td>
              <Td>Set the channel topic. Only available in an IRC window.</Td>
            </Tr>
            <Tr>
              <Td colSpan={2}>
                Other IRC commands like <b>/mode</b> and <b>/kick</b> are also available for IRC channels. These
                commands are sent directly to IRC server unmodified. Meaning you need to follow IRC protocol and for
                example have to include channel name in the mode command, <b>/mode</b> #copenhagen +ob ilkka *!*@*.se
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Okay</Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

export default HelpModal;
