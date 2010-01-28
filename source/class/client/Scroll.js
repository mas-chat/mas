
/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.Scroll",
{
  extend : qx.ui.core.scroll.AbstractScrollArea,
  include : [qx.ui.core.MContentPadding],

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param content {qx.ui.core.LayoutItem?null} The content widget of the scroll
   *    container.
   */
  construct : function(content)
  {
    this.base(arguments);

    if (content) {
      this.add(content);
    }
  },

  events :
  {
      "scrollLock" : "qx.event.type.Data"
  },

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {

    __oldvalue : "notset",    

    _onScrollBarY : function(e) {
	var pane = this.getChildControl("pane");
	this.getChildControl("pane").scrollToY(e.getData());

	if (pane.getScrollMaxY() - pane.getScrollY() < 2)
	{
	    if (this.__oldvalue !== false)
	    { 
		this.fireDataEvent("scrollLock", false);
		this.__oldvalue = false;
	    }
	}
	else
	{
	    if (this.__oldvalue !== true)
	    {
		this.fireDataEvent("scrollLock", true);
		this.__oldvalue = true;
	    }
	}
    },

    /**
     * Sets the content of the scroll container. Scroll containers
     * may only have one child, so it always replaces the current
     * child with the given one.
     *
     * @param widget {qx.ui.core.Widget} Widget to insert
     * @return {void}
     */
    add : function(widget) {
      this.getChildControl("pane").add(widget);
    },


    /**
     * Returns the content of the scroll area.
     *
     * @param widget {qx.ui.core.Widget} Widget to remove
     * @return {qx.ui.core.Widget}
     */
    remove : function(widget) {
      this.getChildControl("pane").remove(widget);
    },


    /**
     * Returns the content of the scroll container.
     *
     * Scroll containers may only have one child. This
     * method returns an array containing the child or an empty array.
     *
     * @return {Object[]} The child array
     */
    getChildren : function() {
      return this.getChildControl("pane").getChildren();
    },


    /**
     * Returns the element, to which the content padding should be applied.
     *
     * @return {qx.ui.core.Widget} The content padding target.
     */
    _getContentPaddingTarget : function() {
      return this.getChildControl("pane");
    }
  }
});


