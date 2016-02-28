var GitHubApi = require("github");

var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    debug: false,
    protocol: "https",
    host: "api.github.com", // should be api.github.com for GitHub
    timeout: 5000,
    headers: {
        "user-agent": "Github-PR-StatusVisualiser" // GitHub is happy with a unique user agent
    }
});

var store = {};

var getPullRequestForRepo = function getPullRequestForRepo(user, reponame, callback) {
    github.pullRequests.getAll({
        user: user,
        repo: reponame
    }, callback);
};

var getRest = function getRest(accumulator, lastres, callback) {
    if (!github.hasNextPage(lastres)) return callback(undefined, accumulator);

    github.getNextPage(lastres, function(err, newres) {
        if (err) return callback(err, newres);

        accumulator = accumulator.concat(newres);

        getRest(accumulator, newres, callback);
    });
};

var updatePullRequestsForRepo = function updatePullRequestsForRepo(user, reponame) {
    getPullRequestForRepo(user, reponame, function(err, prres) {
        store[user + '/' + reponame] = prres;
    });
}

var updateStoredPRs = function updateStoredPRs() {
    github.repos.getFromOrg({
        org: process.env.GITHUB_ORG,
        per_page: 100
    }, function(err, res) {
        if (err) return console.log(JSON.stringify(err, null, 4));

        getRest(res, res, function(err, res) {

            // console.log(JSON.stringify(res, null, 4));
            for (var i = 0; i < res.length; i++) {
                var repo = res[i];
                updatePullRequestsForRepo(repo.owner.login, repo.name);
            }
        });
    });
};

var getPRsMatching = function getPRsMatching(regex) {
    var output = {};
    Object.keys(store).forEach(function(key) {
        if (key.match(regex)) {
            output[key] = store[key];
        }
    });

    return output;
}

var closePR = function closePR(update) {
    var repo = store[update.pull_request.repository.full_name];
    for (var i = 0; i < repo.length; i++) {
        if (repo[i].id == update.pull_request.id) {
            repo.splice(i, 1);
            return true;
        }
    }
    return false;
}

var updatePR = function updatePR(update) {
    var repo = store[update.pull_request.repository.full_name];
    for (var i = 0; i < repo.length; i++) {
        if (repo[i].id == update.pull_request.id) {
            repo[i] = update.pull_request;
            return true;
        }
    }
    return false;
}

var createPR = function createPR(update) {
    var repo = store[update.pull_request.repository.full_name];
    repo.push(update.pull_request);
}

var pushPRUpdate = function pushPRUpdate(update) {
    if (update.pull_request.repository.owner.login !== process.env.GITHUB_ORG) {
        throw "Unknown org";
    }

    var repo = store[update.pull_request.repository.full_name];
    if (!repo) {
        repo = store[update.pull_request.repository.full_name] = [];
    }

    if (update.action == "closed") {
        closePR(update);
    } else {
        if (!updatePR(update)) {
            createPR(update);
        }
    }
}

module.exports = {
    getPRsMatching: getPRsMatching,
    pushPRUpdate: pushPRUpdate
};

github.authenticate({
    type: "oauth",
    username: process.env.GITHUB_USER,
    token: process.env.GITHUB_TOKEN
});

updateStoredPRs();

setInterval(updateStoredPRs, 60*60*1000);