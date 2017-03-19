import React, { PureComponent, PropTypes } from 'react';
import Textarea from 'react-textarea-autosize';
import { CellMeasurer, CellMeasurerCache, AutoSizer, List } from 'react-virtualized';
import ConversationMessage from '../ConversationMessage';
import './index.css';

class ConversationWindow extends PureComponent {
  constructor(props) {
    super(props);

    this.cache = new CellMeasurerCache({
      defaultHeight: 20,
      fixedWidth: true
    });

    this.onKeyPress = this.onKeyPress.bind(this);
    this.rowRenderer = this.rowRenderer.bind(this);
  }

  onKeyPress(e) {
    if (e.charCode === 13) {
      e.preventDefault();
      onSend(textAreaInput.value, windowId);
      textAreaInput.value = '';
    }
  }

  rowRenderer({ index, isScrolling, key, parent, style }) {
    const { messages, users } = this.props;

    const msg = messages[index];
    const nick = msg.userId ? users.get(msg.userId).nick.mas : null;

    return (
      <CellMeasurer
        cache={this.cache}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        {({ measure }) => (
          <ConversationMessage
            style={style}
            key={msg.gid}
            ts={msg.ts}
            body={msg.body}
            nick={nick}
          />
        )}
      </CellMeasurer>
    );
  }

  render() {
    const { messages, visible, windowId, onSend } = this.props;

    let textAreaInput = null;

    return (
      <div styleName={`window ${visible ? '' : 'hidden'}`}>
        <div styleName="messages">
          <AutoSizer>
            {({ height, width }) => (
              <List
                width={width}
                height={height}
                rowCount={messages.length}
                rowRenderer={this.rowRenderer}
                scrollToIndex={messages.length - 1}
                deferredMeasurementCache={this.cache}
                rowHeight={this.cache.rowHeight}
              />
            )}
          </AutoSizer>
        </div>
        <div styleName="controls">
          <Textarea
            ref={(input) => { textAreaInput = input; }}
            styleName="textarea"
            onKeyPress={this.onKeyPress}
          />
        </div>
      </div>
    );
  }
}

ConversationWindow.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  users: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSend: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
  windowId: PropTypes.number.isRequired
};

export default ConversationWindow;
