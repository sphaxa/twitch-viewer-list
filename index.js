const axios = require('axios')

//require('dotenv').config()
var port = process.env.PORT || 5000;

const express = require('express')
const app = express()

const broadcaster_ids = require('./broadcaster_ids.json')

var userlist = {};

const refreshtoken = process.env.REFRESH_TOKEN;
const clientid = process.env.CLIENT_ID;
const clientsecret = process.env.CLIENT_SECRET;

const moderatorid = process.env.MODERATOR_ID;

var globaltoken;
var indextorefresh = 0;

Initalize();

function Initalize() {
    broadcaster_ids.forEach(id => {
        userlist[id] = ["nobody"];
    });

    reAuth();
}

setInterval(function() {
    userlist[broadcaster_ids[indextorefresh]] = [];
    console.log("[" + broadcaster_ids[indextorefresh] + "] " + "Cleared user list.");
    getUsers(globaltoken);
}, 60000);

function getUsers(token, cursor) {
    globaltoken = token;
    axios.get('https://api.twitch.tv/helix/chat/chatters', {
        params: {
            broadcaster_id: broadcaster_ids[indextorefresh],
            moderator_id: moderatorid,
            first: '1000',
            after: cursor
        },
        headers: {
            Authorization: 'Bearer ' + encodeURIComponent(token),
            'Client-Id': clientid
        }
    })
    .then(function (response) {
        if (response.status == 200) {
            updateUserList(response.data.data);
            if (!isEmpty(response.data.pagination)) {
                getUsers(token, response.data.pagination.cursor);
                console.log("[" + broadcaster_ids[indextorefresh] + "] " + "Paging needed... Requesting next page.");
            } else {
                console.log("[" + broadcaster_ids[indextorefresh] + "] " + "Adding users complete.");
                if (indextorefresh === broadcaster_ids.length - 1) {
                    indextorefresh = 0;
                } else {
                    indextorefresh++;
                }
            }
        }
    })
    .catch(function (error) {
        console.log("[" + broadcaster_ids[indextorefresh] + "] " + "Failed to get user list. Attempting to re-authorize...");
        reAuth();
    });
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function updateUserList(rawusers) {
    rawusers.forEach(u => userlist[broadcaster_ids[indextorefresh]].push(u.user_name));
    console.log("[" + broadcaster_ids[indextorefresh] + "] " + "Added " + rawusers.length + " users to list.")
}

function chooseUser(id) {
    return userlist[id][Math.floor(Math.random()*userlist[id].length)];
}

function reAuth() {
    axios.post('https://id.twitch.tv/oauth2/token', {
        client_id: clientid,
        client_secret: clientsecret,
        grant_type: 'refresh_token',
        refresh_token: refreshtoken
    })
    .then(function (response) {
        if (response.status == 200) {
            getUsers(response.data.access_token);
        } else {
            console.error("Failed to refresh access token.");
        }
    })
    .catch(function (error) {
        console.error("Failed to refresh access token." + error);
    });
}

app.get('/:id', (req, res) => {
    res.send(chooseUser(req.params.id))
})

app.listen(port, () => {
    console.log("Webserver started...");
})