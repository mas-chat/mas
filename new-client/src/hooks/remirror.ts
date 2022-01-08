import { useMemo } from 'react';
import { RemirrorManager } from '@remirror/core';
import { useRemirror, UseRemirrorReturn, ReactExtensions } from '@remirror/react';
import {
  BoldExtension,
  ItalicExtension,
  UnderlineExtension,
  HardBreakExtension,
  LinkExtension,
  CodeBlockExtension,
  PlaceholderExtension,
  MentionAtomExtension
} from 'remirror/extensions';
import { MessageEmojiExtension } from '../lib/remirrorMessageEmojiExtension';
import css from 'refractor/lang/css';
import javascript from 'refractor/lang/javascript';
import json from 'refractor/lang/json';
import typescript from 'refractor/lang/typescript';
import markdown from 'refractor/lang/markdown';

type MessageExtensions = ReactExtensions<
  | BoldExtension
  | ItalicExtension
  | UnderlineExtension
  | HardBreakExtension
  | LinkExtension
  | CodeBlockExtension
  | MentionAtomExtension
  | PlaceholderExtension
  | MessageEmojiExtension
>;
export type MessageRemirror = UseRemirrorReturn<MessageExtensions>;
export type MessageRemirrorManager = RemirrorManager<MessageExtensions>;

export function useMessageRemirror(): MessageRemirror {
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
        new MentionAtomExtension({
          matchers: [{ name: 'user', char: '@', appendText: ' ', matchOffset: 0 }]
        }),
        new PlaceholderExtension({ placeholder: 'Write here' }),
        new MessageEmojiExtension()
      ],
    []
  );

  return useRemirror({
    extensions,
    builtin: {
      excludeBaseKeymap: true // TODO: custom base keymap needed that doesn't set "Enter"
    },
    content: '',
    stringHandler: 'text',
    selection: 'end'
  });
}
