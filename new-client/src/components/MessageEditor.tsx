import React, { FunctionComponent, useCallback, useContext, useEffect, useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import {
  BoldExtension,
  ItalicExtension,
  UnderlineExtension,
  HardBreakExtension,
  LinkExtension,
  CodeBlockExtension,
  PlaceholderExtension,
  MentionExtension
} from 'remirror/extensions';
import css from 'refractor/lang/css';
import javascript from 'refractor/lang/javascript';
import json from 'refractor/lang/json';
import typescript from 'refractor/lang/typescript';
import markdown from 'refractor/lang/markdown';
import {
  ThemeProvider,
  Remirror,
  EditorComponent,
  useRemirror,
  useRemirrorContext,
  useKeymap,
  useHelpers
} from '@remirror/react';
import { MentionSuggestor } from './MentionSuggestor';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';

interface MessageEditorProps {
  window: WindowModel;
  singleWindowMode?: boolean;
}

const MessageEditor: FunctionComponent<MessageEditorProps> = ({ window, singleWindowMode }: MessageEditorProps) => {
  const { windowStore } = useContext(ServerContext);

  const extensions = useMemo(
    () => () =>
      [
        new BoldExtension(),
        new ItalicExtension(),
        new UnderlineExtension(),
        new HardBreakExtension(),
        new LinkExtension({ autoLink: true }),
        new CodeBlockExtension({
          supportedLanguages: [css, javascript, json, typescript, markdown]
        }),
        new MentionExtension({
          matchers: [{ name: 'user', char: '@', appendText: ' ', matchOffset: 0 }]
        }),
        new PlaceholderExtension({ placeholder: 'Write here' })
      ],
    []
  );

  const { manager, onChange, state, getContext } = useRemirror({
    extensions,
    content: '',
    stringHandler: 'text',
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
    const { getJSON, getText } = useHelpers();

    useKeymap(
      'Enter',
      useCallback(() => {
        windowStore.processLine(window, getText(), getJSON());
        chain.setContent('').focus('end').run();
        return true;
      }, [chain, getText, getJSON])
    );

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
      <ThemeProvider>
        <Remirror onChange={onChange} manager={manager} initialContent={state}>
          <EditorBindings />
          <MentionSuggestor users={window.participants} />
          <EditorComponent />
        </Remirror>
      </ThemeProvider>
    </Box>
  );
};

export default MessageEditor;
