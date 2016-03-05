var https = require('https'),
    url = require('url'),
    jsdom = require("jsdom"),
    config = require(__dirname + "/config.json");


function getLinks (site, callback) {
    jsdom.env(
        site.url,
        ["https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js"],
        function(err, window){
            if(err) {
                callback(err, null);
                return;
            }
            var links = [];
            window.$(site.cssSelectorPrefix + " a").each(function(){
                links.push({
                    "text": window.$(this).text(),
                    "url": window.$(this).attr("href")
                });
            });
            callback(null, links);
        }
    );
}

function notify (msg) {

    var req_options = url.parse(config.slack.webhookUrl);
    req_options.method = 'POST';
    req_options.headers = {'Content-Type': 'application/json'};

    var req_data = config.slack.options;
    req_data.text = "*" + msg.site.name + "*\n_New document:_ <" + msg.link.url + "|" + msg.link.text + ">";

    var req = https.request(req_options, function (res) {
        if (res.statusCode === 200) {
            // All ok
        } else {
            console.log("Slack webhook failure!");
        }
    });

    req.on('error', function(e) {
        console.log("Slack webhook failure!");
        console.log(e);
    });

    req.write(JSON.stringify(req_data));

    req.end();

}


config.sites.forEach(function(site){
    var lastLinks = [];
    getLinks(site, function(err, links){
        if (err) {
            console.error("Failed to initialise site: " + site.name);
            return;
        }
        links.forEach(function(link){
            lastLinks.push(link.url);
        });
        setInterval(function(){
            getLinks(site, function(err, links){
                if (!err) {
                    links.forEach(function (link) {
                        if (lastLinks.indexOf(link.url) == -1) {
                            notify({
                                "site": site,
                                "link": link
                            });
                            lastLinks.push(link.url);
                        }
                    });
                }
            });
        }, config.interval);
    });
});
