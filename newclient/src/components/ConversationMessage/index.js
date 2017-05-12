import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import emojione from 'emojione';
import URI from 'urijs';
import './index.css';

const IMAGE_FILE_EXTENSIONS = [ 'png', 'jpg', 'jpeg', 'gif' ];
const EMOJI_LOOKUP_TABLE = buildEmojiLookupTable();

function buildEmojiLookupTable() {
  const res = {};

  for (const [ emojiName, emoji ] of Object.entries(emojione.emojioneList)) {
    res[emojiName] = emoji;
    emoji.shortnames.forEach(shortname => { res[shortname] = emoji; });
  }

  return res;
}

function processLink(url) {
  let label = null;
  let media = null;
  const urlObj = new URI(url);
  const domain = urlObj.domain();

  if (IMAGE_FILE_EXTENSIONS.includes(urlObj.suffix().toLowerCase())) {
    label = urlObj.filename();
    media = { type: 'image', href: urlObj.toString() };
  } else if ((domain === 'youtube.com' && urlObj.search(true).v) ||
    domain === 'youtu.be') {
    label = urlObj.toString();

    const startTime = urlObj.search(true).t;
    let inSeconds = 0;

    if (startTime) {
      const re = startTime.match(/^(?:(\d{1,2})h)?(?:(\d{1,2})m)?(?:(\d{1,2})s)?$/);

      if (re) {
        inSeconds = (parseInt(re[1] || 0) * 3600) + (parseInt(re[2] || 0) * 60) +
        parseInt(re[3] || 0);
      }
    }

    media = { type: 'youtubelink', href: urlObj.toString(), start: inSeconds };
  } else {
    label = urlObj.readable();
  }

  if (urlObj.protocol() === '') {
    urlObj.protocol('http');
  }

  let normalized;

  try {
    normalized = urlObj.normalize();
  } catch (e) {
    normalized = urlObj;
  }

  return { href: normalized.toString(), label, media };
}

function processText(line) {
  const parts = emojione.toShort(line) // Convert unicode emojis to :emojis:
    .split(/(:\S+?:)|(^| )(@\S+)(?= |$)/)
    .filter(text => text !== undefined && text !== '');

  return parts.map(text => {
    if (EMOJI_LOOKUP_TABLE[text]) {
      return { type: 'emoji', text, emoji: EMOJI_LOOKUP_TABLE[text] };
    } else if (text.match(/^@\S+$/)) {
      return { type: 'mention', text };
    }

    return { type: 'txt', text };
  });
}

function splitByLinks(text) {
  let previousEnd = 0;
  const parts = [];
  const mediaParts = [];

  URI.withinString(text, (url, start, end) => {
    if (previousEnd !== start) {
      parts.push(...processText(text.substring(previousEnd, start)));
    }

    const linkDetails = processLink(url);

    if (linkDetails.media) {
      mediaParts.push(linkDetails.media);
    }

    parts.push({ type: 'url', href: linkDetails.href, label: linkDetails.label });
    previousEnd = end;
  });

  if (previousEnd !== text.length) {
    parts.push(...processText(text.substring(previousEnd)));
  }

  return { parts, mediaParts };
}

const ConversationMessage = ({ style, ts, body, nick }) => {
  const formattedTs = moment.unix(ts).format('HH:mm');

  const formattedBody = splitByLinks(body).parts.map(part => {
    switch (part.type) {
      case 'txt': {
        return part.text;
      }
      case 'url': {
        return (
          <a
            key={part.href + part.label}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part.label}
          </a>
        );
      }
      case 'emoji': {
        const id = part.emoji.uc_base;
        const url = `${emojione.imagePathPNG}${id}.png`;

        return <img key={url} styleName="emoji" alt={part.text} title={part.text} src={url} />;
      }
      case 'mention': {
        return <span key={part.text} styleName="mention">{part.text}</span>;
      }
      default: {
        return null;
      }
    }
  });

  return (
    <div style={style} styleName="message">
      <div styleName="timestamp">
        {formattedTs}
      </div>
      <div styleName="content">
        <span styleName="nick">
          {nick}
        </span>
        {formattedBody}
      </div>
    </div>
  );
};

ConversationMessage.propTypes = {
  ts: PropTypes.number.isRequired,
  body: PropTypes.string,
  nick: PropTypes.string,
  style: PropTypes.shape({}).isRequired
};

ConversationMessage.defaultProps = {
  body: null,
  nick: null
};

export default ConversationMessage;
