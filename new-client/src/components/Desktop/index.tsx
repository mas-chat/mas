import React from 'react';
import { observer } from 'mobx-react-lite';

const Desktop: React.FunctionComponent<Record<string, any>> = observer(({ rootStore }) => <div>{42}</div>);

export default Desktop;
