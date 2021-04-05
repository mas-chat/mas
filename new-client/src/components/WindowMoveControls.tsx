import React, { ChangeEvent, FunctionComponent, useContext, useLayoutEffect } from 'react';
import { IoArrowUp, IoArrowDown, IoArrowBack, IoArrowForward, IoRadioButtonOff } from 'react-icons/io5';
import { Flex, IconButton, Button, Select } from '@chakra-ui/react';
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

  useLayoutEffect(() => {
    windowStore.startWindowMove();
  }, [windowStore]);

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

  const handleDesktopSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    windowStore.moveWindowToDesktop(window, value === 'new' ? 'new' : parseInt(value));
  };

  return (
    <Flex direction="column" flex="1" alignItems="center">
      <Flex flex="1" alignItems="flex-end">
        <IconButton
          onClick={() => handleMove(WindowMoveDirection.Up)}
          size="sm"
          m="0.2rem"
          aria-label="Move up"
          icon={<IoArrowUp />}
        />
      </Flex>
      <Flex alignItems="center">
        <IconButton
          onClick={() => handleMove(WindowMoveDirection.Left)}
          size="sm"
          mx="0.6rem"
          aria-label="Move left"
          icon={<IoArrowBack />}
        />
        <IoRadioButtonOff />
        <IconButton
          onClick={() => handleMove(WindowMoveDirection.Right)}
          size="sm"
          mx="0.6rem"
          aria-label="Move right"
          icon={<IoArrowForward />}
        />
      </Flex>
      <Flex>
        <IconButton
          onClick={() => handleMove(WindowMoveDirection.Down)}
          size="sm"
          m="0.2rem"
          aria-label="Move down"
          icon={<IoArrowDown />}
        />
      </Flex>
      <Flex my="1rem">
        <Select size="sm" width="100px" onChange={handleDesktopSelect} placeholder="Desktop">
          {windowStore.desktops
            .filter(desktop => desktop.id !== window.desktopId)
            .map(desktop => (
              <option key={desktop.id} value={desktop.id}>
                {desktop.name}
              </option>
            ))}
          <option value="new">New desktop</option>
        </Select>
      </Flex>
      <Flex my="0.5rem" flex="1" justifyContent="space-between">
        <Button size="sm" mx="0.5rem" onClick={handleSave}>
          Done
        </Button>
        <Button size="sm" mx="0.5rem" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </Flex>
    </Flex>
  );
};

export default WindowMoveControls;
