import React, { FunctionComponent, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import {
  BoldExtension,
  ItalicExtension,
  UnderlineExtension,
  MarkdownExtension,
  HardBreakExtension
} from 'remirror/extensions';
import { Remirror, EditorComponent, useRemirror, useRemirrorContext, useKeymap, useHelpers } from '@remirror/react';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';

interface MessageEditorProps {
  window: WindowModel;
  singleWindowMode?: boolean;
}

interface UseSaveHook {
  saving: boolean;
  error: Error | undefined;
}

function useSaveHook(onSave: (text: string) => void) {
  const helpers = useHelpers();
  const [state, setState] = useState<UseSaveHook>({ saving: false, error: undefined });

  useKeymap(
    'Enter',
    useCallback(() => {
      const markdown = helpers.getMarkdown();

      setState({ saving: true, error: undefined });
      onSave(markdown);

      return true;
    }, [helpers, onSave])
  );

  return state;
}

const MessageEditor: FunctionComponent<MessageEditorProps> = ({ window, singleWindowMode }: MessageEditorProps) => {
  const { windowStore } = useContext(ServerContext);

  const extensions = useMemo(
    () => () =>
      [
        new BoldExtension(),
        new ItalicExtension(),
        new UnderlineExtension(),
        new MarkdownExtension(),
        new HardBreakExtension()
      ],
    []
  );

  const { manager, onChange, state, getContext } = useRemirror({
    extensions,
    content: '',
    stringHandler: 'html',
    selection: 'end'
  });

  useEffect(() => {
    // singleWindowMode check is here because we don't want the VKB to open automatically on mobile
    if (!singleWindowMode && window.focused) {
      getContext()?.chain.focus('end').run();
    }
  }, [window.focused, singleWindowMode, getContext]);

  const EditorBindings = () => {
    const { chain } = useRemirrorContext();

    useSaveHook(text => {
      windowStore.processLine(window, text);
      chain.setContent('').focus('end').run();
    });

    return null;
  };

  return (
    <Box
      flex="1"
      py="3px"
      px="0.5rem"
      borderColor={window.focused ? '#bbb' : 'inherit'}
      borderWidth="1px"
      borderRadius="base"
      __css={{
        '& .remirror-editor:focus-visible': { outline: 'none' },
        '& .remirror-editor:focus': { outline: 'none' }
      }}
    >
      <Remirror onChange={onChange} manager={manager} initialContent={state}>
        <div>
          <EditorBindings />
          <EditorComponent />
        </div>
      </Remirror>
    </Box>
  );
};

export default MessageEditor;
