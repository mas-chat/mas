exports.edit = function(req, res) {

    var id = req.param('id');
    console.log('Hello! ' + id);

    res.json({ user: id });

};
