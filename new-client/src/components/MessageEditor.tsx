import React, { FunctionComponent, useContext, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import styled from '@emotion/styled';
import { Remirror, ThemeProvider, EditorComponent, useRemirrorContext, useKeymap, useHelpers } from '@remirror/react';
import { AllStyledComponent } from '@remirror/styles/emotion';
import { MentionSuggestor } from './MentionSuggestor';
import WindowModel from '../models/Window';
import { ServerContext } from './ServerContext';
import { MessageRemirror } from '../hooks/remirror';

const OverridesWrapper = styled.div`
  & .remirror-editor-wrapper,
  & .remirror-editor {
    min-height: unset !important;
    box-shadow: unset !important;
    padding: 0 !important;
  }

  & .remirror-editor:focus,
  & .remirror-editor:focus-visible {
    outline: none;
  }

  & .remirror-mention-atom-user:before: {
    content: '@';
  }

  & .remirror-suggest-atom {
    color: white;
  }
`;

interface MessageEditorProps {
  window: WindowModel;
  singleWindowMode?: boolean;
  messageRemirror: MessageRemirror;
}

const MessageEditor: FunctionComponent<MessageEditorProps> = ({
  window,
  singleWindowMode,
  messageRemirror
}: MessageEditorProps) => {
  const { windowStore } = useContext(ServerContext);
  const { manager, onChange, state, getContext } = messageRemirror;

  useEffect(() => {
    // singleWindowMode check is here because we don't want the VKB to open automatically on mobile
    if (!singleWindowMode && window.focused) {
      getContext()?.chain.focus('end').run();
    }
  }, [window.focused, singleWindowMode, getContext]);

  const EditorBindings = () => {
    const { chain } = useRemirrorContext();
    const { getJSON, getText } = useHelpers();

    useKeymap('Enter', ({ next }) => {
      const enterConsumed = next();

      if (!enterConsumed) {
        windowStore.processLine(window, getText(), getJSON());
        chain.setContent('').focus('end').run();
        return true;
      }

      return false;
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
    >
      <AllStyledComponent>
        <ThemeProvider>
          <OverridesWrapper>
            <Remirror onChange={onChange} manager={manager} initialContent={state}>
              <EditorBindings />
              <MentionSuggestor users={window.participants} />
              <EditorComponent />
            </Remirror>
          </OverridesWrapper>
        </ThemeProvider>
      </AllStyledComponent>
    </Box>
  );
};

export default MessageEditor;
