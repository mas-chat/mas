import React, { PropTypes } from 'react';
import moment from 'moment';
import emojione from 'emojione';
import URI from 'urijs';
import './index.css';

const IMAGE_FILE_EXTENSIONS = [ 'png', 'jpg', 'jpeg', 'gif' ];

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

function processText(text) {
  // Find @ character 1) after space, 2) in the beginning of string, 3) after HTML tag (>)
  // text = text.replace(/(^| |>)(@\S+)(?=( |$))/g,
  //     (match, p1, p2) => this._renderMention(p1, p2));

  // Convert first Unicode emojis to :emojis:
  const parts = emojione.toShort(text).split(/(:\S+?:)/);

  return parts.map(part => {
    const emoji = emojione.emojioneList[part];

    if (emoji) {
      return { type: 'emoji', text: part, emoji };
    } else {
      return { type: 'txt', text: part };
    }
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
      case 'txt':
        return part.text;
      case 'url':
        return <a href={part.href} target="_blank" rel="noopener noreferrer">{part.label}</a>;
      case 'emoji':
        const emoji = part.emoji;
        const unicode = emoji.unicode[emoji.unicode.length - 1];
        const src = require('emojione/assets/svg/' + unicode + '.svg');
        return <img styleName="emoji" alt={part.text} title={part.text} src={src} />;
      default:
        return null;
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
