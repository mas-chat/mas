import URI from 'urijs';
import UserModelFactory from '../factories/user';
import WindowModelFactory from '../factories/window';
import MessageModelFactory from '../factories/message';
import { UrlPartSubType, UrlPartType } from '../../src/models/Message';

jest.mock('../../src/lib/cookie.ts', () => ({ getUserId: () => 'm42' }));

describe('Message model', () => {
  const user = UserModelFactory.build({ nick: { mas: 'user' } });
  const window = WindowModelFactory.build({ users: [user] });

  describe('URLs', () => {
    it('Decodes URL in the beginning', async () => {
      const message = MessageModelFactory.build({
        body: 'https://example.com two',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Url, class: UrlPartSubType.Generic, url: expect.any(URI) },
        { type: UrlPartType.Text, text: ' two' }
      ]);
    });

    it('Decodes URL in the middle', async () => {
      const message = MessageModelFactory.build({
        body: 'one https://example.com two',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'one ' },
        { type: UrlPartType.Url, class: UrlPartSubType.Generic, url: expect.any(URI) },
        { type: UrlPartType.Text, text: ' two' }
      ]);
    });

    it('Decodes URL in the end', async () => {
      const message = MessageModelFactory.build({
        body: 'one https://example.com',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'one ' },
        { type: UrlPartType.Url, class: UrlPartSubType.Generic, url: expect.any(URI) }
      ]);
    });

    it('Decodes multiple URLs', async () => {
      const message = MessageModelFactory.build({
        body: 'https://example.com one https://example.com two https://example.com',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Url, class: UrlPartSubType.Generic, url: expect.any(URI) },
        { type: UrlPartType.Text, text: ' one ' },
        { type: UrlPartType.Url, class: UrlPartSubType.Generic, url: expect.any(URI) },
        { type: UrlPartType.Text, text: ' two ' },
        { type: UrlPartType.Url, class: UrlPartSubType.Generic, url: expect.any(URI) }
      ]);
    });
  });

  describe('Mentions', () => {
    it('Decodes IRC style mention', async () => {
      const message = MessageModelFactory.build({
        body: 'user: hello there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Mention, user },
        { type: UrlPartType.Text, text: ' hello there' }
      ]);
    });

    it('Decodes chat style mention in the beginning', async () => {
      const message = MessageModelFactory.build({
        body: '@user hello there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Mention, user },
        { type: UrlPartType.Text, text: ' hello there' }
      ]);
    });

    it('Decodes chat style mention in the middle', async () => {
      const message = MessageModelFactory.build({
        body: 'hi @user hello there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hi ' },
        { type: UrlPartType.Mention, user },
        { type: UrlPartType.Text, text: ' hello there' }
      ]);
    });

    it('Decodes chat style mention in the end', async () => {
      const message = MessageModelFactory.build({
        body: 'hi @user',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hi ' },
        { type: UrlPartType.Mention, user }
      ]);
    });

    it('Decodes multiple mentions', async () => {
      const message = MessageModelFactory.build({
        body: '@user hi @user bye @user',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Mention, user },
        { type: UrlPartType.Text, text: ' hi ' },
        { type: UrlPartType.Mention, user },
        { type: UrlPartType.Text, text: ' bye ' },
        { type: UrlPartType.Mention, user }
      ]);
    });

    it('Decodes mixed mentions', async () => {
      const message = MessageModelFactory.build({
        body: 'user: hi @user',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Mention, user },
        { type: UrlPartType.Text, text: ' hi ' },
        { type: UrlPartType.Mention, user }
      ]);
    });

    it('Does not decode email address', async () => {
      const message = MessageModelFactory.build({
        body: 'hi foo@example.com there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([{ type: UrlPartType.Text, text: 'hi foo@example.com there' }]);
    });

    it('Does not decode @ signs', async () => {
      const message = MessageModelFactory.build({
        body: '@ something @ something @',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([{ type: UrlPartType.Text, text: '@ something @ something @' }]);
    });

    it('Does not decode two mentions without a space', async () => {
      const message = MessageModelFactory.build({
        body: 'hi @foo@bar there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([{ type: UrlPartType.Text, text: 'hi @foo@bar there' }]);
    });

    it('Does not decode unknown nicks', async () => {
      const message = MessageModelFactory.build({
        body: 'unknown: hi @stranger there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([{ type: UrlPartType.Text, text: 'unknown: hi @stranger there' }]);
    });
  });

  describe('Emoticons', () => {
    it('Decodes emoticon in the beginning', async () => {
      const message = MessageModelFactory.build({
        body: ':smiley: hello there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Emoji, codePoint: '1f603', emoji: '😃', shortCode: ':smiley:' },
        { type: UrlPartType.Text, text: ' hello there' }
      ]);
    });

    it('Decodes emoticon in the middle', async () => {
      const message = MessageModelFactory.build({
        body: 'hello :smiley: there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello ' },
        { type: UrlPartType.Emoji, codePoint: '1f603', emoji: '😃', shortCode: ':smiley:' },
        { type: UrlPartType.Text, text: ' there' }
      ]);
    });

    it('Decodes emoticon in the end', async () => {
      const message = MessageModelFactory.build({
        body: 'hello there :smiley:',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello there ' },
        { type: UrlPartType.Emoji, codePoint: '1f603', emoji: '😃', shortCode: ':smiley:' }
      ]);
    });

    it('Decodes multiple emoticon', async () => {
      const message = MessageModelFactory.build({
        body: ':smiley::smiley::smiley:',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Emoji, codePoint: '1f603', emoji: '😃', shortCode: ':smiley:' },
        { type: UrlPartType.Emoji, codePoint: '1f603', emoji: '😃', shortCode: ':smiley:' },
        { type: UrlPartType.Emoji, codePoint: '1f603', emoji: '😃', shortCode: ':smiley:' }
      ]);
    });

    it('Does not decode unknown emoticon', async () => {
      const message = MessageModelFactory.build({
        body: 'hello there :brokensmiley:',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello there ' },
        { type: UrlPartType.Text, text: ':brokensmiley:' }
      ]);
    });
  });

  describe('Emojis', () => {
    it('Decodes emoji in the beginning', async () => {
      const message = MessageModelFactory.build({
        body: '👩🏿 hello there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Emoji, codePoint: '1f469-1f3ff', emoji: '👩🏿', shortCode: ':woman_tone5:' },
        { type: UrlPartType.Text, text: ' hello there' }
      ]);
    });

    it('Decodes emoji in the middle', async () => {
      const message = MessageModelFactory.build({
        body: 'hello 👩🏿 there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello ' },
        { type: UrlPartType.Emoji, codePoint: '1f469-1f3ff', emoji: '👩🏿', shortCode: ':woman_tone5:' },
        { type: UrlPartType.Text, text: ' there' }
      ]);
    });

    it('Decodes emoji in the end', async () => {
      const message = MessageModelFactory.build({
        body: 'hello there 👩🏿',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello there ' },
        { type: UrlPartType.Emoji, codePoint: '1f469-1f3ff', emoji: '👩🏿', shortCode: ':woman_tone5:' }
      ]);
    });
  });

  describe('Image URLs', () => {
    it('Decodes image URL', async () => {
      const message = MessageModelFactory.build({
        body: 'hello http://example.com/picture.jpeg there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello ' },
        { type: UrlPartType.Url, class: UrlPartSubType.Image, url: expect.any(URI) },
        { type: UrlPartType.Text, text: ' there' }
      ]);
    });
  });

  describe('YouTube URLs', () => {
    it('Decodes full YouTube URL', async () => {
      const message = MessageModelFactory.build({
        body: 'hello https://www.youtube.com/watch?v=SHNOyMsKCBE&t=77 there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello ' },
        {
          type: UrlPartType.Url,
          class: UrlPartSubType.Video,
          url: expect.any(URI),
          startTime: 77,
          videoId: 'SHNOyMsKCBE'
        },
        { type: UrlPartType.Text, text: ' there' }
      ]);
    });

    it('Decodes short YouTube URL', async () => {
      const message = MessageModelFactory.build({
        body: 'hello http://youtu.be/dDCfXJ50P3k there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello ' },
        {
          type: UrlPartType.Url,
          class: UrlPartSubType.Video,
          url: expect.any(URI),
          startTime: 0,
          videoId: 'dDCfXJ50P3k'
        },
        { type: UrlPartType.Text, text: ' there' }
      ]);
    });

    it('Decodes short YouTube URL with start time in seconds', async () => {
      const message = MessageModelFactory.build({
        body: 'hello https://youtu.be/dDCfXJ50P3k?t=77 there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello ' },
        {
          type: UrlPartType.Url,
          class: UrlPartSubType.Video,
          url: expect.any(URI),
          startTime: 77,
          videoId: 'dDCfXJ50P3k'
        },
        { type: UrlPartType.Text, text: ' there' }
      ]);
    });

    it('Decodes short YouTube URL with start time in seconds, minutes, and hours', async () => {
      const message = MessageModelFactory.build({
        body: 'hello https://youtu.be/dDCfXJ50P3k?t=2h12m6s there',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Text, text: 'hello ' },
        {
          type: UrlPartType.Url,
          class: UrlPartSubType.Video,
          url: expect.any(URI),
          startTime: 2 * 3600 + 12 * 60 + 6,
          videoId: 'dDCfXJ50P3k'
        },
        { type: UrlPartType.Text, text: ' there' }
      ]);
    });
  });

  describe('Everything', () => {
    it('Decodes all types', async () => {
      const message = MessageModelFactory.build({
        body: 'user: @user 👩🏿 hello :100:',
        window,
        user
      });

      expect(message.bodyTokens).toEqual([
        { type: UrlPartType.Mention, user },
        { text: ' ', type: UrlPartType.Text },
        { type: UrlPartType.Mention, user },
        { text: ' ', type: UrlPartType.Text },
        { type: UrlPartType.Emoji, codePoint: '1f469-1f3ff', emoji: '👩🏿', shortCode: ':woman_tone5:' },
        { type: UrlPartType.Text, text: ' hello ' },
        { type: UrlPartType.Emoji, codePoint: '1f4af', emoji: '💯', shortCode: ':100:' }
      ]);
    });
  });
});
