import type { PrimitiveSelection } from '@remirror/core';
import { emojiIndex, BaseEmoji } from 'emoji-mart';
import EMOJI_REGEX from 'emojibase-regex/property';
import EMOTICON_REGEX from 'emojibase-regex/emoticon';
import SHORTCODE_REGEX from 'emojibase-regex/shortcode';
import {
  ApplySchemaAttributes,
  CommandFunction,
  ExtensionTag,
  GetAttributes,
  InputRule,
  isElementDomNode,
  NodeExtension,
  NodeExtensionSpec,
  nodeInputRule,
  NodeSpecOverride,
  ShouldSkipFunction
} from '@remirror/core';

const EMOJI_DATA_ATTRIBUTE = 'data-remirror-message-emoji';

export interface AddEmojiCommandOptions {
  selection?: PrimitiveSelection;
}

export class MessageEmojiExtension extends NodeExtension {
  get name() {
    return 'messageEmoji' as const;
  }

  createTags() {
    return [ExtensionTag.InlineNode];
  }

  createNodeSpec(extra: ApplySchemaAttributes, override: NodeSpecOverride): NodeExtensionSpec {
    return {
      selectable: true,
      draggable: false,
      ...override,
      inline: true,

      atom: true,
      attrs: { ...extra.defaults(), unicode: {} },
      parseDOM: [
        {
          tag: `span[${EMOJI_DATA_ATTRIBUTE}`,
          getAttrs: node => {
            if (!isElementDomNode(node)) {
              return;
            }

            return { ...extra.parse(node), unicode: node.getAttribute(EMOJI_DATA_ATTRIBUTE) };
          }
        },
        ...(override.parseDOM ?? [])
      ],
      toDOM: node => {
        return [
          'input',
          {
            [EMOJI_DATA_ATTRIBUTE]: node.attrs.unicode,
            style: 'border:none;background-color:unset',
            value: node.attrs.unicode,
            disabled: 'true',
            size: '1'
          }
        ];
      }
    };
  }

  createInputRules(): InputRule[] {
    const getUniCodeEmoji = (text: string) => {
      const emojis = emojiIndex.search(text.replace(/^:(.+):$/, (_match, name) => name));

      if (!emojis || emojis.length === 0) {
        return;
      }

      return (emojis[0] as BaseEmoji).native;
    };

    const shouldSkip: ShouldSkipFunction = ({ captureGroup }) => {
      return !captureGroup || !getUniCodeEmoji(captureGroup);
    };

    const getAttributes: GetAttributes = ([, match]) => ({ unicode: getUniCodeEmoji(match) });
    const getAttributesEmoji: GetAttributes = ([, match]) => ({ unicode: match });

    return [
      nodeInputRule({
        type: this.type,
        shouldSkip,
        getAttributes,
        regexp: new RegExp(`(${EMOTICON_REGEX.source})[\\s]$`),
        beforeDispatch: ({ tr }) => {
          tr.insertText(' ');
        }
      }),

      nodeInputRule({
        type: this.type,
        shouldSkip,
        getAttributes,
        regexp: new RegExp(`(${SHORTCODE_REGEX.source})$`)
      }),

      nodeInputRule({
        type: this.type,
        getAttributes: getAttributesEmoji,
        regexp: new RegExp(`(${EMOJI_REGEX.source})`)
      })
    ];
  }

  createCommands() {
    const { store, type } = this;

    return {
      addEmoji(emoji: string, options: AddEmojiCommandOptions = {}): CommandFunction {
        return props => {
          return store.commands.replaceText.original({
            type: type,
            attrs: { unicode: emoji },
            selection: options.selection
          })(props);
        };
      }
    };
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Remirror {
    interface AllExtensions {
      messageEmoji: MessageEmojiExtension;
    }
  }
}
