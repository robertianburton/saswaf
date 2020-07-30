(function() {

    var buttonVideoSizeSource = null;
    var buttonVideoSizePage = null;
    var buttonVideoSizeResponsive = null;
    var buttonLogConnection = null;
    var userIdField = null;
    var videoLocalElem = null;
    var screenHostId = null;
    let makingOffer = false;
    let ignoreOffer = false;
    var nowStreaming = 0;
    var stream = null;
    var pc = null;
    let polite = true;
    var signaling;
    var friendList = new Set();
    var friendListItems = null;
    var pclist = [];
    var resWidth = 1600;
    var resHeight = 900;

    var qd = {};

    if (location.search) location.search.substr(1).split("&").forEach(function(item) {
        var s = item.split("="),
            k = s[0],
            v = s[1] && decodeURIComponent(s[1]); //  null-coalescing / short-circuit
        //(k in qd) ? qd[k].push(v) : qd[k] = [v]
        (qd[k] = qd[k] || []).push(v) // null-coalescing / short-circuit
    });

    function startup() {
        console.log("Host JS Starting Up...");

        videoLocalElem = document.getElementById('videoLocalElem');

        buttonVideoSizeSource = document.getElementById('buttonVideoSizeSource');
        buttonVideoSizeSource.addEventListener('click', function(ev) {
            videoLocalElem.style.width = "auto";
            videoLocalElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonVideoSizeResponsive = document.getElementById('buttonVideoSizeResponsive');
        buttonVideoSizeResponsive.addEventListener('click', function(ev) {
            videoLocalElem.style.width = "100%";

            ev.preventDefault();
        }, false);

        buttonVideoSizePage = document.getElementById('buttonVideoSizePage');
        buttonVideoSizePage.addEventListener('click', function(ev) {
            videoLocalElem.style.width = window.innerWidth;

            var docH = $(document).height();
            var vidH = $('#videoElem').height();
            var videoScale = ($('#videoElem').width() / $('#videoLocalElem').height());
            var topH = docH - vidH;
            var workableH = Math.floor((window.innerHeight - topH - 0) * videoScale);

            videoLocalElem.style.width = workableH + "px";
            videoLocalElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonStart = document.getElementById('buttonStart');
        buttonStart.addEventListener('click', function(ev) {
            console.log("Start Button");
            start();
            ev.preventDefault();
        }, false);

        buttonLogConnection = document.getElementById('buttonLogConnection');
        buttonLogConnection.addEventListener('click', function(ev) {
            console.log("Log Connection");
            console.log(pc);
            if (signaling) {
                console.log(signaling.id);
            };
            if (stream) {
                console.log(stream);
            };
            console.log("URL Parameters:");
            console.log(qd);
            if (constraints) {
                console.log(constraints);
            };
            ev.preventDefault();
        }, false);

        userIdField = document.getElementById('userIdField');

        friendListItems = document.getElementById('friendListItems');

        console.log("Host JS Startup Complete.");
    }

    if (qd.width) {
        resWidth = qd.width[0]
    };

    if (qd.height) {
        resHeight = qd.height[0]
    };

    const constraints = {
        video: {
            width: {
                max: resWidth
            },
            height: {
                max: resHeight
            },
            frameRate: {
                max: 30
            }
        },
        audio: {
            'channelCount': { 'ideal': 2 },
            'echoCancellation': false,
            'autoGainControl': false,
            'googAutoGainControl': false,
            'noiseSuppression': false,
            'sampleRate': 44100,
            'sampleSize': 16
        }
    };
    var audioConstraints = {
        video: false,
        audio: {
            'channelCount': { 'min': 2 },
            'echoCancellation': false,
            'autoGainControl': false,
            'googAutoGainControl': false,
            'noiseSuppression': false,
            'sampleRate': 44100,
            'sampleSize': 16

        }
    };
    const configurationB = {
        iceServers: [{
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun.l.google.com:19302?transport=udp',
            ]
        }]
    };
    var configuration = configurationB;

    function formatDate(date, format) {
        date = date.toJSON().split(/[:/.TZ-]/);
        return format.replace(/[ymdhisu]/g, function(letter) {
            return date['ymdhisu'.indexOf(letter)];
        });
    };

    function printToConsole(data) {
        console.log(formatDate(new Date(), 'ymd hisu') + " " + JSON.stringify(data));
    };

    function sendToUser(data) {
        console.log(data);
        signaling.emit("signalToUser", data);
    };

    function sendToServer(data) {
        signaling.emit("signalToServer", data);
    };

    function sendAddHostToServer() {
        sendToServer({ 'type': 'addHost', 'id': signaling.id });
    };

    function fillFriendList() {
        friendListItems.innerHTML = '';
        if (friendList.size > 0) {
            friendList.forEach(
                (friend) => {
                    friendListItems.innerHTML += '<button type="button" class="list-group-item list-group-item-action">' + friend + '</button>';
                }
            );
        }
    };

    function getHostUrl() {
        var result = location.protocol + "//" + location.hostname + ":" + location.port + "/watch?host=" + signaling.id;
        return result;
    };

    function copyHostUrl() {
        console.log("Copying URL");
        navigator.clipboard.writeText(getHostUrl()).then(function() {
            console.log("Url copied!");
        }, function() {
            console.log("Url copy failed!");
        });
    };

    function bindSignalingHandlers(signalingObject) {
        signalingObject.on("connect", async (data) => {
            console.log("Socket ID: " + signaling.id);
            userIdField = document.getElementById('userIdField');
            userIdField.innerHTML = ': <thing id="hostUrlText">' + getHostUrl() + '</p>';

            userIdField.addEventListener('click', function(ev) {
                copyHostUrl();
            }, false);

            sendAddHostToServer();
        });

        signaling.on("signalFromServer", async (data) => {
            console.log("Received from Server. Printing data...");
            console.log(data);
            if (data.type === "turnCredentials") {
                console.log("Handling Turn Credentials");
                setConfiguration(data.turnCredentials);
            };
        });

        signalingObject.on("signalToUser", async (data) => {
            printToConsole("SignalToUser From " + data.fromId + " to " + data.toId + ":");
            console.log(data);
            if (data.type === "newFriend") {
                friendList.add(data.fromId);
                console.log(friendList);
                fillFriendList();
                if (!pclist[data.fromId]) {
                    pclist[data.fromId] = new RTCPeerConnection(configuration);
                    /*pclist[data.fromId].onnegotiationneeded = handleNegotiationNeededEvent;*/

                    pclist[data.fromId].onnegotiationneeded = function() {
                        printToConsole("handleNegotiationNeededEvent");
                        console.log(data.fromId);
                        pclist[data.fromId].createOffer().then(function(offer) {
                                var processedOffer = processOfferForStereo(offer);
                                console.log("PROCESSED OFFER NN");
                                console.log(processedOffer);
                                return pclist[data.fromId].setLocalDescription(processedOffer);
                            })
                            .then(function() {
                                sendToUser({
                                    fromId: signaling.id,
                                    toId: data.fromId,
                                    type: "video-offer",
                                    sdp: pclist[data.fromId].localDescription
                                });
                            })
                            .catch(reportError);
                    };

                    pclist[data.fromId].onicecandidate = handleICECandidateEvent;
                    /*pclist[data.fromId].oniceconnectionstatechange = onConnectionStateChange;*/
                    handleNegotiationNeededEvent(data.fromId);
                }
            } else if (data.type === "video-answer") {
                var desc = new RTCSessionDescription(data.sdp);
                await pclist[data.fromId].setRemoteDescription(desc).catch(reportError);

                if (!pclist[data.fromId].nowStreaming) {
                    console.log("HAPPENING")
                    pclist[data.fromId].nowStreaming = 2;
                    stream.getTracks().forEach((track) => pclist[data.fromId].addTrack(track, stream));
                    pclist[data.fromId].nowStreaming = 3;
                };
            } else if (data.type === "new-ice-candidate") {
                handleNewICECandidate(data);
            };
        });

        signalingObject.on("leaver", async (data) => {
            console.log(data);

            if (pclist[data.fromId]) {
                const senders = pclist[data.fromId].getSenders();
                senders.forEach((sender) => pclist[data.fromId].removeTrack(sender));
                pclist[data.fromId].close();
            };
            friendList.delete(data.fromId);
            console.log("Removing " + data.fromId);
            fillFriendList();
        });
    };

    function handleGetUserMediaError(e) {
        switch (e.name) {
            case "NotFoundError":
                alert("Unable to open your call because no camera and/or microphone" +
                    "were found.");
                break;
            case "SecurityError":
            case "PermissionDeniedError":
                // Do nothing; this is the same as the user canceling the call.
                break;
            default:
                alert("Error opening your camera and/or microphone: " + e.message);
                break;
        };
    };

    function handleNegotiationNeededEvent(friendId) {
        printToConsole("handleNegotiationNeededEvent");
        console.log(friendId);
        pclist[friendId].createOffer().then(function(offer) {
                var processedOffer = processOfferForStereo(offer);
                console.log("PROCESSED OFFER NN");
                console.log(processedOffer);
                return pclist[friendId].setLocalDescription(processedOffer);
            })
            .then(function() {
                sendToUser({
                    fromId: signaling.id,
                    toId: friendId,
                    type: "video-offer",
                    sdp: pclist[friendId].localDescription
                });
            })
            .catch(reportError);
    };

    function handleICECandidateEvent(data) {
        printToConsole("handleICECandidateEvent");
        console.log(data);
        sendToUser({
            type: "new-ice-candidate",
            toId: data.fromId,
            fromId: signaling.id,
            candidate: data.candidate
        });
    };

    async function handleNewICECandidate(data) {
        printToConsole("handleNewICECandidate");
        console.log(data);
        var candidate = new RTCIceCandidate(data.candidate);

        await pclist[data.fromId].addIceCandidate(candidate)
            .catch(reportError);
    };

    function reportError(e) {
        console.log("Report Error");
        console.error(e);
    };

    function onConnectionStateChange(event) {
        switch (pc.connectionState) {
            case "connected":
                console.log("Connection Connected!");
                // The connection has become fully connected
                break;
            case "disconnected":
            case "failed":
                // One or more transports has terminated unexpectedly or in an error
                console.log("Failed! Closing!");
                shutdown();
                break;
            case "closed":
                // The connection has been closed
                console.log("Closed! Closing!");
                shutdown();
                break;
        };
        if (pc.iceConnectionState == 'disconnected') {
            console.log('Disconnected. Closing.');
            shutdown();
        }
    };

    async function start() {

        nowStreaming = 1;
        if (nowStreaming === 1) {
            nowStreaming = 2;

            var tracks = [];
            await navigator.mediaDevices.getDisplayMedia(constraints).then(function(getDisplayMediaResult) {
                tracks = tracks.concat(getDisplayMediaResult.getTracks());
            }).catch(handleGetUserMediaError);

            stream = new MediaStream(tracks);

            videoLocalElem.srcObject = stream;
            nowStreaming = 3;
        };

        signaling = io();
        userIdField.innerHTML = ": Waiting...";
        sendToServer({ 'type': 'getTurnCredentials' });
        bindSignalingHandlers(signaling);
    };



    function processOfferForStereo(offer) {
        offer.sdp = offer.sdp.replace('useinbandfec=1', 'stereo=1; sprop-stereo=1; maxaveragebitrate=131072; cbr=1');
        return offer;
    };


    function setConfiguration(turnCredentials) {
        const configurationD = {
            iceServers: [{
                    urls: ['stun:stun.robertianburton.com:3478']
                },
                {
                    username: turnCredentials.username,
                    credential: turnCredentials.password,
                    urls: [
                        "turn:turn.robertianburton.com:3478",
                        "turn:turn.robertianburton.com:3478?transport=udp",
                        "turn:turn.robertianburton.com:3478?transport=tcp"
                    ]
                }
            ]
        };
        configuration = configurationD;
    };






















    window.addEventListener('load', startup, false);
})();




/*Snippets*/
/*stream = await navigator.mediaDevices.getUserMedia(constraints);*/
/*await navigator.mediaDevices.getDisplayMedia(constraints).then(function(getDisplayMediaResult) {
    stream = getDisplayMediaResult;
}).catch(handleGetUserMediaError);*/
/*console.log("Capabilities:");*/
/*console.log(stream.getVideoTracks()[0].getCapabilities());*/
/*stream.getTracks().forEach((track) => pc.addTrack(track, stream));*/