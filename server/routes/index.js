
/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', { title: 'MeetAndSpeak' });
};


//exports.index_new = function(req, res){
//    res.render('index_new', { title: 'MeetAndSpeak' });
//};

exports.html = function(req, res){
    console.log(req);

    var page = req.url.replace(/\/(.*)\.html/, '$1');
    res.render(page, { title: 'MeetAndSpeak' });
};
