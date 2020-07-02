const express = require('express');
const path = require('path');
const socket = require("socket.io");
const PORT = process.env.PORT || 5000;
const crypto = require('crypto');

const app = express()
    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .get('/', (req, res) => res.render('pages/index'))
    .get('/soundcheck', (req, res) => res.render('pages/soundcheck'))
    .get('/chat', (req, res) => res.render('pages/chat'))
    .get('/equal', (req, res) => res.render('pages/equal'))
    .get('/host', (req, res) => res.render('pages/host'))
    .get('/watch', (req, res) => res.render('pages/watch'))
    .get('/stereo', (req, res) => res.render('pages/stereo'));
    /*.get('/cred', (req, res) => getTurnCredentials(req,res));*/

const server = app.listen(PORT, () => printToConsole(`Listening on ${ PORT }`));

const io = socket(server);

const activeChatUsers = new Set();

var hostList = new Set();

function formatDate(date, format) {
    date = date.toJSON().split(/[:/.TZ-]/);
    return format.replace(/[ymdhisu]/g, function (letter) {
        return date['ymdhisu'.indexOf(letter)];
    });
};

function printToConsole(data) {
    console.log(formatDate(new Date(), 'ymd hisu')+" "+JSON.stringify(data));
};

function sendHostList(socket) {
    printToConsole("Sending Host List");
    var transmitData = {type: 'hostList', hostList: Array.from(hostList)};
    printToConsole(transmitData);
    io.emit("signalFromServer", transmitData);

};

function sendTurnCredentials(socket) {
	var userId = socket.id;
	var secret = process.env.TURN_KEY;
	var unixTimeStamp = parseInt(Date.now()/1000) + 8*3600,   // this credential would be valid for the next 8 hours
        username = [unixTimeStamp, userId].join(':'),
        password,
        hmac = crypto.createHmac('sha1', secret);
    hmac.setEncoding('base64');
    hmac.write(username);
    hmac.end();
    password = hmac.read();
    var result = {
        username: username,
        password: password
    };
    var resultAsString = JSON.stringify(result)
	/*res.send(resultAsString);*/
	var transmitData = {type: 'turnCredentials', turnCredentials: result};
	io.emit("signalFromServer", transmitData);
};


io.on("connection", function (socket) {
    printToConsole("Made socket connection: " + socket.id);

    socket.on("new user", function (data) {
        socket.userId = data;
        activeChatUsers.add(data);
        io.emit("new user", [...activeChatUsers]);
        printToConsole("New user. Added: " + data);
    });

    socket.on("chat message", function (data) {
        io.emit("chat message", data);
        printToConsole("New message from "+ data.sender);
    });

    socket.on("screenSignalFromScreen", (data) => {
        io.to(data.toId).emit('screenSignalFromScreen', data)
        printToConsole("New Screen Signal From Host: " + socket.id);
    });

    socket.on("screenSignalFromAudience", function (data) {
        socket.broadcast.emit("screenSignalFromAudience", data);
        printToConsole("New Screen Signal From Audience: " + socket.id);
    });

    socket.on("screenSignalFromEqual", (data) => {
        socket.broadcast.emit("screenSignalFromEqual", data);
        printToConsole("New Screen Signal From Equal: " + socket.id);
    });

    socket.on("screenSignalFromStereo", (data) => {
        socket.broadcast.emit("screenSignalFromStereo", data);
        printToConsole("New Signal From Stereo: " + socket.id);
    });

    socket.on("signalToUser", (data) => {
    	if(data.toId) {
        	io.to(data.toId).emit('signalToUser', data);
    	} else {
    		socket.broadcast.emit('signalToUser', data);
    	};
        printToConsole("SignalToUser From " + data.fromId + " to " + data.toId + ":");
        printToConsole(data);
    });

    socket.on("signalToServer", (data) => {
    	printToConsole("SignalToServer From " + socket.id + ":");
        printToConsole(data);
        if(data.type==='addHost') {
            printToConsole("addHost: " + socket.id);
            hostList.add(data.id);
            printToConsole("hostList:");
            printToConsole(hostList);
            sendHostList(socket);
        } else if(data.type==='requestHostList') {
            sendHostList(socket);
        } else if(data.type==='getTurnCredentials') {
        	sendTurnCredentials(socket);
        };
    });

    socket.on("disconnecting", (reason) => {
        hostList.delete(socket.id);
        activeChatUsers.delete(socket.userId);
        /*io.emit("user disconnecting", socket.id);*/
        var socketToRemove = socket.id;
        socket.broadcast.emit("leaver", {fromId: socketToRemove});
        printToConsole("User disconnecting: " + socketToRemove + " because " + reason);
        sendHostList(socket);
    });
});


// Sources:
// https://stackoverflow.com/questions/43978975/not-receiving-video-onicecandidate-is-not-executing
// https://www.html5rocks.com/en/tutorials/webrtc/basics/#simpleRTCPeerConnectionExample
// Audio selector: https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
// Audio gain: https://stackoverflow.com/questions/38873061/how-to-increase-mic-gain-in-webrtc
// Turn server credential get setup: https://www.robinwieruch.de/node-express-server-rest-api
// Turn credential generation: https://stackoverflow.com/questions/35766382/coturn-how-to-use-turn-rest-api

// 2020-06-13 Host & Watch was tested with friends and worked great!
// 2020-06-20 Another good test. Some choppiness in non-critical screen elements can occur.