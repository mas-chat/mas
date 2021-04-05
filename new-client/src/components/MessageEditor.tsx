import React, { FunctionComponent, useContext, useEffect, useState, useMemo, KeyboardEvent } from 'react';
import { createEditor, Descendant, Node } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { Box } from '@chakra-ui/react';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';

interface MessageEditorProps {
  window: WindowModel;
  singleWindowMode?: boolean;
}

const initialValue = [
  {
    type: 'paragraph',
    children: [{ text: '' }]
  }
];

const MessageEditor: FunctionComponent<MessageEditorProps> = ({ window, singleWindowMode }: MessageEditorProps) => {
  const { windowStore } = useContext(ServerContext);

  const [message, setMessage] = useState<Descendant[]>(initialValue);
  // TODO: Remove type cast after https://github.com/ianstormtaylor/slate/issues/4144
  const editor = useMemo(() => withHistory(withReact(createEditor() as ReactEditor)), []);

  useEffect(() => {
    // singleWindowMode check is here because we don't want the VKB to open automatically on mobile
    if (!singleWindowMode && window.focused) {
      ReactEditor.focus(editor);
    }
  }, [window.focused, singleWindowMode, editor]);

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      windowStore.processLine(window, message.map(n => Node.string(n)).join('\n'));
      setMessage(initialValue);
    }
  };

  return (
    <Box
      flex="1"
      py="3px"
      px="0.5rem"
      borderColor={window.focused ? '#bbb' : 'inherit'}
      borderWidth="1px"
      borderRadius="base"
      // onClick={e => e.stopPropagation()}
    >
      <Slate editor={editor} value={message} onChange={value => setMessage(value)}>
        <Editable onKeyUp={handleKeyUp} placeholder="Write here…" />
      </Slate>
    </Box>
  );
};

export default MessageEditor;
