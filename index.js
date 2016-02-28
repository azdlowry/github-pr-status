var githubprs = require("./githubprs");

var restify = require('restify');

function respond(req, res, next) {
  res.send(githubprs.getPRsMatching(req.params.matching || '.*'));
  next();
}

var server = restify.createServer();
server.use(restify.CORS());
server.use(restify.queryParser());
server.get('/pullRequests', respond);
server.head('/pullRequests', respond);

server.listen(process.env.NODE_PORT || 80, function() {
  console.log('%s listening at %s', server.name, server.url);
});