const axios = require('axios')

//require('dotenv').config()
var port = process.env.PORT || 5000;

const express = require('express')
const app = express()

var userlist = [];

const refreshtoken = process.env.REFRESH_TOKEN;
const clientid = process.env.CLIENT_ID;
const clientsecret = process.env.CLIENT_SECRET;

const broadcasterid = process.env.BROADCASTER_ID;
const moderatorid = process.env.MODERATOR_ID;

var globaltoken;

getUsers("");

setInterval(function() {
    userlist = [];
    console.log("Cleared user list.");
    getUsers(globaltoken);
}, 500000);

function getUsers(token, cursor) {
    globaltoken = token;
    axios.get('https://api.twitch.tv/helix/chat/chatters', {
        params: {
            broadcaster_id: broadcasterid,
            moderator_id: moderatorid,
            first: '50',
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
            }
        }
    })
    .catch(function (error) {
        console.log("Failed to get user list. Attempting to re-authorize...");
        reAuth();
    });
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function updateUserList(rawusers) {
    rawusers.forEach(u => userlist.push(u.user_name));
    console.log("Added " + rawusers.length + " users to list.")
}

function chooseUser() {
    return userlist[Math.floor(Math.random()*userlist.length)];
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

app.get('/', (req, res) => {
    res.send(chooseUser())
})

app.listen(port, () => {
    console.log("Webserver started...");
})