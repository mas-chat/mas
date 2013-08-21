//
//   Copyright 2009-2013 Ilkka Oksanen <iao@iki.fi>
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing,
//   software distributed under the License is distributed on an "AS
//   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//   express or implied.  See the License for the specific language
//   governing permissions and limitations under the License.
//

/**
 * @asset(mas/*)
*/

// Can't use strict because of Qooxdoo
// 'use strict';

qx.Class.define('mas.Application',
{
    extend : qx.application.Standalone,

    members :
    {
        main : function()
        {
            this.base(arguments);

            qx.log.appender.Native; // Disable someday

            var root = this.getRoot();

            root.removeAll();
            root.set({ backgroundColor: '#FFFFFF' });

            var startLabel = new qx.ui.basic.Label(
                '<center><img src="/i/ajax-loader.gif"><br><br><br>' +
                    'Loading content...</center>').set({
                        font : new qx.bom.Font(14, [ 'Arial', 'sans-serif' ]),
                        width: 300,
                        height: 150,
                        rich: true
                    });

            var marginX = Math.round(qx.bom.Viewport.getWidth() / 2) - 300 / 2;
            var marginY = Math.round(qx.bom.Viewport.getHeight() / 2);

            startLabel.setMargin(marginY, 10, 10, marginX);
            root.add(startLabel, { width: '100%', height: '100%' });

            new mas.Controller(startLabel, root);
        }
    }
});
