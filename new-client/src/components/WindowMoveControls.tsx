import React, { FunctionComponent, useContext } from 'react';
import { IoArrowUp, IoArrowDown, IoArrowBack, IoArrowForward, IoRadioButtonOff } from 'react-icons/io5';
import { Flex, IconButton, Button } from '@chakra-ui/react';
import { ServerContext } from './ServerContext';
import WindowModel, { WindowMoveDirection } from '../models/Window';

interface WindowMoveControlsProps {
  onEndMove: () => void;
  window: WindowModel;
}

const WindowMoveControls: FunctionComponent<WindowMoveControlsProps> = ({
  window,
  onEndMove
}: WindowMoveControlsProps) => {
  const { windowStore } = useContext(ServerContext);

  const handleSave = () => {
    windowStore.saveWindowMove();
    onEndMove();
  };

  const handleCancel = () => {
    windowStore.cancelWindowMove();
    onEndMove();
  };

  const handleMove = (direction: WindowMoveDirection) => {
    windowStore.moveWindow(window, direction);
  };

  return (
    <Flex direction="column" flex="1" alignItems="center">
      <Flex flex="1" alignItems="flex-end">
        <IconButton
          onClick={() => handleMove(WindowMoveDirection.Up)}
          m="0.3rem"
          aria-label="Move up"
          icon={<IoArrowUp />}
        />
      </Flex>
      <Flex alignItems="center">
        <IconButton
          onClick={() => handleMove(WindowMoveDirection.Left)}
          mx="1.0rem"
          aria-label="Move left"
          icon={<IoArrowBack />}
        />
        <IoRadioButtonOff />
        <IconButton
          onClick={() => handleMove(WindowMoveDirection.Right)}
          mx="1.0rem"
          aria-label="Move right"
          icon={<IoArrowForward />}
        />
      </Flex>
      <Flex>
        <IconButton
          onClick={() => handleMove(WindowMoveDirection.Down)}
          m="0.3rem"
          aria-label="Move down"
          icon={<IoArrowDown />}
        />
      </Flex>
      <Flex my="1rem" flex="1" justifyContent="space-between">
        <Button m="0.5rem" onClick={handleSave}>
          Done
        </Button>
        <Button m="0.5rem" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </Flex>
    </Flex>
  );
};

export default WindowMoveControls;
