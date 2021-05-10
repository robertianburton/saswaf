const express = require('express');
const path = require('path');
const socket = require("socket.io");
const PORT = process.env.PORT || 5000;
const crypto = require('crypto');

const app = express()
    .enable('trust proxy')
    .use(function (req, res, next) {
        if (req.secure || process.env.ENV === 'DEV') {
            // request was via https, so do no special handling
            next();
        } else {
            // request was via http, so redirect to https
            res.redirect('https://' + req.headers.host + req.url);
        }
    })
    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .get('/', (req, res) => res.render('pages/index'))
    .get('/soundcheck', (req, res) => res.render('pages/soundcheck'))
    .get('/equal', (req, res) => res.render('pages/equal'))
    .get('/host', (req, res) => res.render('pages/host'))
    .get('/watch', (req, res) => res.render('pages/watch'))
    .get('/stereo', (req, res) => res.render('pages/stereo'));

const server = app.listen(PORT, () => printToConsole(`Listening on ${PORT}`));

const io = socket(server, {
    cors: {
        origin: "http://localhost",
        methods: ["GET", "POST"],
        credentials: true,
        transports: ['websocket', 'polling'],
    },
    allowEIO3: true
});

// Given a Date, format it as a console-friendly YMDHISU format
function formatDate(date, format) {
    date = date.toJSON().split(/[:/.TZ-]/);
    return format.replace(/[ymdhisu]/g, function (letter) {
        return date['ymdhisu'.indexOf(letter)];
    });
};

// Given some data, print it to the console with a timestamp
function printToConsole() {
    var str = "";
    for (var i = 0; i < arguments.length; i++) {
        str = str + JSON.stringify(arguments[i]);
    }
    console.log(formatDate(new Date(), 'ymd hisu') + " " + str);
};

//Given a user's socket, generate and send TURN credentials back to it
function sendTurnCredentials(socket) {
    var userId = socket.id;
    var secret = process.env.TURN_KEY;
    var unixTimeStamp = parseInt(Date.now() / 1000) + 8 * 3600, // this credential is valid for the next 8 hours
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
    var transmitData = { type: 'turnCredentials', turnCredentials: result };
    io.to(userId).emit("signalFromServer", transmitData);
};

// Upon connection of a socket (user), bind the other signal handlers to it
io.on("connection", function (socket) {
    printToConsole("Made socket connection: ", socket.id);

    socket.on("screenSignalFromEqual", (data) => {
        socket.broadcast.emit("screenSignalFromEqual", data);
        printToConsole("New Screen Signal From Equal: " + socket.id);
    });

    socket.on("screenSignalFromStereo", (data) => {
        socket.broadcast.emit("screenSignalFromStereo", data);
        printToConsole("New Signal From Stereo: " + socket.id);
    });

    socket.on("signalToUser", (data) => {
        if (data.toId) {
            io.to(data.toId).emit('signalToUser', data);
        } else {
            printToConsole("Message to user without an address! Received as:");
        };
        printToConsole("SignalToUser From " + data.fromId + " to " + data.toId + ":");
        if (data.type && data.type === "video-answer") {
            printToConsole("(Video answer hidden)");
        } else if (data.type && data.type === "video-offer") {
            printToConsole("(Video offer hidden)");
        } else {
            printToConsole(data);
        }
    });

    socket.on("signalToServer", (data) => {
        printToConsole("SignalToServer From " + socket.id + ":");
        printToConsole(data);
        if (data.type === 'getTurnCredentials') {
            sendTurnCredentials(socket);
        };
    });

    socket.on("disconnecting", (reason) => {
        var socketToRemove = socket.id;
        socket.broadcast.emit("signalFromServer", { type: "leaver", fromId: socketToRemove, reason: reason });
        printToConsole("User disconnecting: " + socketToRemove + " because " + reason);
    });
});


// Sources:
// https://stackoverflow.com/questions/43978975/not-receiving-video-onicecandidate-is-not-executing
// https://www.html5rocks.com/en/tutorials/webrtc/basics/#simpleRTCPeerConnectionExample
// Audio selector: https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
// Audio gain: https://stackoverflow.com/questions/38873061/how-to-increase-mic-gain-in-webrtc
// Turn server credential get setup: https://www.robinwieruch.de/node-express-server-rest-api
// Turn credential generation: https://stackoverflow.com/questions/35766382/coturn-how-to-use-turn-rest-api
// URL parameters: Qwerty's reply on: https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript

// 2020-06-13 Host & Watch was tested with friends and worked great!
// 2020-06-20 Another good test. Some choppiness in non-critical screen elements can occur.
// 2020-07-09 Finished a third weekly session of watching something together, still great (especially with the stereo audio!)
