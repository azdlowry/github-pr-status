var githubprs = require("./githubprs");

var restify = require('restify');

function respond(req, res, next) {
    res.send(githubprs.getPRsMatching(req.params.matching || '.*'));
    next();
}

function update(req, res, next) {
	if (req.header('X-GitHub-Event') == 'ping')
		res.send('pong');
	if (req.header('X-GitHub-Event') == 'pull_request') {
		githubprs.pushPRUpdate(req.body);
    	res.send('Thanks!');
	}
	if ( req.header('X-GitHub-Event') == 'pull_request_review_comment') {
		githubprs.pushCommentUpdate(req.body);
    	res.send('Thanks for commenting!');
	}

    next();
}

function refreshAll(req, res, next) {
	githubprs.refreshAllPRs();
	res.send('Refreshing all...');

    next();
}

var server = restify.createServer();
server.use(restify.CORS());
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.get('/pullRequests', respond);
server.head('/pullRequests', respond);
server.post('/webhooks/github', update);
server.post('/refreshAll', refreshAll);

server.listen(process.env.PORT || 4567, function() {
    console.log('%s listening at %s', server.name, server.url);
});
