
/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.RadioManager",
{
    extend : qx.ui.form.RadioGroup,

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

    construct : function(content)
    {
      this.base(arguments);
    },

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

    members :
    {
	_onItemChangeChecked : function(e)
	{
	    var item = e.getTarget();

	    //alert(item.getValue());
	    
	    if (item.getValue())
	    {
		this.setSelection([item]);	    
	    } 
	    else if (this.getSelection()[0] == item) 
	    {
		item.setValue(true);
		this.setSelection([item]);
	    }
	}	
    }
});


