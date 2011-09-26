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
				    backgroundColor : states.active ? "#FFCCC0" : "#E0ECFF",
				    padding : 4,
				    font: "bold",
				    decorator : "window-caption"
				};
			    }
			},

			"menubar" :
			{
			    style : function(states)
			    {
				return {
				    backgroundColor : "#5C5C4D",
				    padding: [4, 2]
				};
			    }
			},
			
			"toolbar" :
			{
			    style : function(states)
			    {
				return {
				    backgroundColor : "#2A7AC1",
				    padding : 0
				};
			    }
			}


		    }
		});
