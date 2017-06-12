import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Textarea from 'react-textarea-autosize';
import { CellMeasurer, CellMeasurerCache, AutoSizer, List } from 'react-virtualized';
import Message from '../Message';
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
          <div style={style}>
            <Message
              key={msg.gid}
              ts={msg.ts}
              body={msg.body}
              nick={nick}
            />
          </div>
        )}
      </CellMeasurer>
    );
  }

  render() {
    const { messages, visible } = this.props;

    if (!visible) {
      return null;
    }

    return (
      <div styleName="window">
        <div styleName="main">
          <div styleName="messages">
            <AutoSizer onResize={() => this.cache.clearAll()}>
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
          <div styleName="members">
            <div styleName="memberList">
              X X X X X X X X X X X X X X
            </div>
            <div styleName="toggleMembers">
             v
            </div>
          </div>
        </div>
        <div styleName="controls">
          <Textarea
            ref={(input) => { this.textAreaInput = input; }}
            styleName="textarea"
            onKeyPress={this.onKeyPress}
          />
          <div>[U]</div>
          <div>[S]</div>
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
