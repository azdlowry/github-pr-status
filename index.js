var githubprs = require("./githubprs");

setInterval(function () {
	var prs = githubprs.getPRsMatching('.*');
	console.dir(prs);
}, 2000)
