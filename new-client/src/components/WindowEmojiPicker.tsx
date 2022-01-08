import React, { FunctionComponent, useState } from 'react';
import { Picker, EmojiData } from 'emoji-mart';
import { IconButton, Button, Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@chakra-ui/react';
import { BaseEmoji } from 'emoji-mart';
import { IoHappyOutline } from 'react-icons/io5';
import { MessageRemirrorManager } from '../hooks/remirror';

interface WindowMenuProps {
  manager: MessageRemirrorManager;
}

const WindowMenu: FunctionComponent<WindowMenuProps> = ({ manager }: WindowMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  const handleSelect = (emoji: EmojiData) => {
    manager.store.commands.addEmoji((emoji as BaseEmoji).native);
    close();
  };

  return (
    <Popover isLazy isOpen={isOpen} onClose={close}>
      <PopoverTrigger>
        <Button
          as={IconButton}
          onClick={open}
          aria-label="Options"
          icon={<IoHappyOutline />}
          variant="outline"
          size="sm"
        />
      </PopoverTrigger>
      <PopoverContent width="auto">
        <PopoverArrow />
        <Picker set="apple" theme="dark" native={true} title="Select emoji" onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
};

export default WindowMenu;
