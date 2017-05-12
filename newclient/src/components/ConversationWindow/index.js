import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
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
    const { onSend, windowId } = this.props;

    if (e.charCode === 13) {
      e.preventDefault();
      onSend(this.textAreaInput.value, windowId);
      this.textAreaInput.value = '';
    }
  }

  rowRenderer({ index, key, parent, style }) {
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
        {() => ( // TODO: ({ measure }) use when images are loaded
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
    const { messages, visible } = this.props;

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
            ref={(input) => { this.textAreaInput = input; }}
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
  users: PropTypes.shape({}).isRequired,
  onSend: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
  windowId: PropTypes.number.isRequired
};

export default ConversationWindow;
