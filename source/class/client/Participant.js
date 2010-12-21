qx.Class.define("client.Participant",
{
    extend : qx.core.Object,
    
    properties : {
	name : {
	    check : "String",
	    event : "changeName",
	    init : "",
	    nullable : true
	},
	
	op : {
	    check : "String",
	    event : "changeOp",
	    init : false
	},
	
	voice : {
	    check : "Boolean",
	    event : "changeVoice",
	    init : false
	},

	//online: 0 = unknown, 1 = online, 2 = offline
	online : {
	    check : "Number",
	    event : "changeOnline",
	    init : 0
	}
    },

    members : {
	toString: function() {
	    return "foobar";
	}
    }
    
});
