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

qx.Theme.define("client.theme.Font",
{
    extend : qx.theme.simple.Font,

    fonts :
    {
	"defaultlarge" :
	{
	    size : ((qx.core.Environment.get("os.name") === "win" && qx.core.Environment.get("os.version") === "vista") || (qx.core.Environment.get("os.name") === "win" && qx.core.Environment.get("os.version") === "7")) ? 13 : 13,
	    lineHeight : 1.4,
	    family : (qx.core.Environment.get("os.name") === "osx") ? [ "Lucida Grande" ] :
		((qx.core.Environment.get("os.name") === "win" && qx.core.Environment.get("os.version") === "vista") || (qx.core.Environment.get("os.name") === "win" && qx.core.Environment.get("os.version") === "7")) ?
		[ "Segoe UI", "Candara" ] :
		[ "Arial", "Liberation Sans", "Tahoma",  "sans-serif" ]
	}
    }
});
