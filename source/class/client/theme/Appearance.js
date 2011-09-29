/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

qx.Theme.define("client.theme.Appearance",
		{
		    extend : qx.theme.simple.Appearance,

		    appearances :
		    {

			"window/captionbar" :
			{
			    style : function(states)
			    {
				return {
				    backgroundColor : states.active ? "#E0ECFF" : "#eeeeee",
				    padding : 3,
				    font: "bold",
				    decorator : "window-caption"
				};
			    }
			},
			
			"toolbar" :
			{
			    style : function(states)
			    {
				return {
				    backgroundColor : "#2C7CC3",
				    padding : 0
				};
			    }
			}


		    }
		});
