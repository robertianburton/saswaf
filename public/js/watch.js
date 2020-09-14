(function () {

    // Declare scope-wide variables
    var buttonVideoSizeSource, buttonVideoSizePage, buttonVideoSizeResponsive, buttonLogConnection, videoRemoteElem, pc, currentHost, hostIdField, userIdField, nowStreaming, audioOutputSelect, audioPerm, qd, configurationB, configurationC, configuration, signaling;



    function startup() {

        buttonVideoSizeSource = null;
        buttonVideoSizePage = null;
        buttonVideoSizeResponsive = null;
        buttonLogConnection = null;
        videoRemoteElem = null;
        pc = null;
        currentHost = null;
        hostIdField = document.getElementById('hostIdField');
        userIdField = document.getElementById('userIdField');
        nowStreaming = 0;
        audioOutputSelect = document.getElementById('audioOutput');
        audioPerm = 0;
        qd = {};
        signaling = io();

        
        //Split query parameters
        if (location.search) location.search.substr(1).split("&").forEach(function (item) {
            var s = item.split("="),
                k = s[0],
                v = s[1] && decodeURIComponent(s[1]); //  null-coalescing / short-circuit
            //(k in qd) ? qd[k].push(v) : qd[k] = [v]
            (qd[k] = qd[k] || []).push(v) // null-coalescing / short-circuit
        });



        configurationB = {
            iceServers: [{
                urls: [
                    'stun:stun.robertianburton.com:3478'
                ]
            }]
        };
        configurationC = {
            iceServers: [{ urls: ["stun:us-turn2.xirsys.com"] }, { username: "k3IAtn2K1yMCrpypkP_CJCyEV7m3FHThFwcUnIxp_4i8-ZuFR4JQN0zqjllYFBXYAAAAAF7DZDF5YWtldHlTYXhlcw==", credential: "6f541688-998b-11ea-8e17-0242ac140004", urls: ["turn:us-turn2.xirsys.com:80?transport=udp", "turn:us-turn2.xirsys.com:3478?transport=udp", "turn:us-turn2.xirsys.com:80?transport=tcp", "turn:us-turn2.xirsys.com:3478?transport=tcp", "turns:us-turn2.xirsys.com:443?transport=tcp", "turns:us-turn2.xirsys.com:5349?transport=tcp"] }]
        };
        configuration = configurationC;



        console.log("Watch JS Starting Up...");

        videoRemoteElem = document.getElementById('videoRemoteElem');
        videoRemoteElem.srcObject = null;

        buttonVideoSizeSource = document.getElementById('buttonVideoSizeSource');
        buttonVideoSizeSource.addEventListener('click', function (ev) {
            videoRemoteElem.style.width = "auto";
            videoRemoteElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonVideoSizeResponsive = document.getElementById('buttonVideoSizeResponsive');
        buttonVideoSizeResponsive.addEventListener('click', function (ev) {
            videoRemoteElem.style.width = "100%";
            ev.preventDefault();
        }, false);

        buttonVideoSizePage = document.getElementById('buttonVideoSizePage');
        buttonVideoSizePage.addEventListener('click', function (ev) {
            videoRemoteElem.style.width = document.body.clientWidth + "px";
            videoRemoteElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonLogConnection = document.getElementById('buttonLogConnection');
        buttonLogConnection.addEventListener('click', function (ev) {
            printToConsole("vvv Log Connection vvv");
            if (signaling) {
                printToConsole("Signaling ID:");
                console.log(signaling.id);
            };
            if (pc) {
                printToConsole("Peer Connection:");
                console.log(pc);
            };
            if (pc) {
                printToConsole("Get Receivers:");
                console.log(pc.getReceivers());
            };
            printToConsole("^^^ Log Connection ^^^");
            ev.preventDefault();
        }, false);

        buttonAudioOutputs = document.getElementById('buttonAudioOutputs');
        buttonAudioOutputs.addEventListener('click', function (ev) {
            console.log("Audio Outputs");
            gotDevices();
            ev.preventDefault();
        }, false);

        audioOutputSelect.onchange = changeAudioDestination;

        bindSignalingHandlers(signaling);

        sendToServer({ 'type': 'getTurnCredentials' });

        console.log("Socket ID: " + signaling.id);

        console.log("Watch JS Startup Complete.");

    };

    function formatDate(date, format) {
        date = date.toJSON().split(/[:/.TZ-]/);
        return format.replace(/[ymdhisu]/g, function (letter) {
            return date['ymdhisu'.indexOf(letter)];
        });
    };

    function printToConsole(data) {
        console.log(formatDate(new Date(), 'ymd hisu') + " " + JSON.stringify(data));
    };

    function sendToServer(data) {
        console.log("Sending To Server: ");
        console.log(data);
        signaling.emit("signalToServer", data);
    };

    function sendToUser(data) {
        console.log("Sending To User: ");
        console.log(data);
        signaling.emit("signalToUser", data);
    };

    function sendHostConnection() {
        console.log("Requesting connection to " + qd.host[0]);
        sendToUser({ fromId: signaling.id, toId: qd.host[0], type: "newFriend" });
        currentHost = qd.host[0];
        hostIdField.innerHTML = ': ' + currentHost;
    };

    function checkPeerConnection() {
        if (!pc) {
            pc = new RTCPeerConnection(configuration);
            pc.onconnectionstatechange = onConnectionStateChange;
            pc.ontrack = onTrack;
            pc.onnegotiationneeded = handleNegotiationNeededEvent;
            pc.onicecandidate = handleICECandidateEvent;
        }
    };

    function onConnectionStateChange(event) {
        console.log("Connection State Change...");
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
        if (pc && pc.iceConnectionState == 'disconnected') {
            console.log('Disconnected. Closing.');
            shutdown();
        }
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
        }
    };

    // Once remote track media arrives, show it in remote video element
    function onTrack(event) {
        console.log("Getting tracks!");
        // don't set srcObject again if it is already set.
        if (videoRemoteElem.srcObject) return;

        console.log("SET THE TRACKS!!!!");
        console.log(event);

        stream = event.streams[0];
        videoRemoteElem.srcObject = stream;
        /*videoRemoteElem.play();*/

        // pc.getReceivers().forEach(function (receiver) {
        //     receiver.playoutDelayHint = 2
        // });

        nowStreaming = 1;
    };

    function reportError(e) {
        console.log("Report Error");
        console.error(e);
    };

    // Take the connection and bind the signal handlers to it
    function bindSignalingHandlers(signalingObject) {
        signaling.on("signalFromServer", async (data) => {
            console.log("Received from Server... Printing data:");
            console.log(data);
            if (data.type === "turnCredentials") {
                console.log("Server Message Type: Turn Credentials");
                setConfiguration(data.turnCredentials);
            } else if (data.type === "leaver") {
                if (data.fromId === currentHost) {
                    currentHost = null;
                    shutdown();
                };
            };
        });

        signaling.on("connect", async (data) => {
            printToConsole("Connected. Signaling ID: " + signaling.id);
            if (qd.host) {
                userIdField.innerHTML = ': ' + signaling.id;
                sendHostConnection();
                document.title = "saswaf > watch > " + qd.host[0];
            };
        });

        signaling.on("signalToUser", async (data) => {
            printToConsole("Received from User... " + data.fromId + " to " + data.toId + ":");
            console.log(data);
            if (data.type === "video-offer" && data.fromId === currentHost) {
                checkPeerConnection();
                var desc = new RTCSessionDescription(data.sdp);
                pc.setRemoteDescription(desc)
                    .then(function () {
                        return pc.createAnswer();
                    })
                    .then(function (answer) {
                        var processedAnswer = processOfferForStereo(answer);
                        console.log("PROCESSED ANSWER SIGNAL");
                        console.log(processedAnswer);
                        return pc.setLocalDescription(processedAnswer);
                    })
                    .then(function () {
                        var msg = {
                            fromId: signaling.id,
                            toId: currentHost,
                            type: "video-answer",
                            sdp: pc.localDescription
                        };
                        sendToUser(msg);
                    })
                    .catch(handleGetUserMediaError);
            } else if (data.type === "new-ice-candidate" && data.fromId === currentHost) {
                handleNewICECandidate(data);
            };
        });
    };

    function handleICECandidateEvent(data) {
        console.log("handleICECandidateEvent");
        if (data.candidate) {
            sendToUser({
                type: "new-ice-candidate",
                toId: currentHost,
                fromId: signaling.id,
                candidate: data.candidate
            });
        };
    };

    async function handleNewICECandidate(data) {
        console.log("handleNewICECandidateEvent");
        if (data.candidate) {
            var candidate = new RTCIceCandidate(data.candidate);
            if (pc) {
                await pc.addIceCandidate(candidate)
                    .catch(reportError);
            }
        }
    };

    // Let the "negotiationneeded" event trigger offer generation
    async function handleNegotiationNeededEvent() {
        console.log("handleNegotiationNeededEvent");
        pc.createOffer().then(function (offer) {
            var processedOffer = processOfferForStereo(offer);
            console.log("PROCESSED OFFER NN");
            console.log(processedOffer);
            return pc.setLocalDescription(offer);
        })
            .then(function () {
                sendToUser({
                    fromId: signaling.id,
                    toId: currentHost,
                    type: "video-offer",
                    sdp: pc.localDescription
                })
            })
            .catch(reportError);
    };

    // Shutdown the stream and peer connection
    function shutdown() {
        videoRemoteElem.srcObject = null;
        if (nowStreaming && nowStreaming > 0 && stream) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
        };
        stream = null;
        if (pc) {
            pc.close();
        };
        pc = null;
        nowStreaming = 0;
    };

    // Grab the list of audio devices to populate the selector
    async function gotDevices() {
        // Handles being called several times to update labels. Preserve values.
        if (audioPerm === 0) {
            alert("In order to display your audio output devices, the site may ask for microphone permissions. The site does not use it, but it is required by the web browser in order to get the list of audio outputs.");
            await navigator.mediaDevices.getUserMedia({ audio: true });
            audioPerm = 1;
        };
        var deviceInfos = await navigator.mediaDevices.enumerateDevices();
        console.log(deviceInfos);
        var selectors = [audioOutputSelect];
        const values = selectors.map(select => select.value);
        selectors.forEach(select => {
            while (select.firstChild) {
                select.removeChild(select.firstChild);
            }
        });
        for (let i = 0; i !== deviceInfos.length; ++i) {
            const deviceInfo = deviceInfos[i];
            const option = document.createElement('option');
            option.value = deviceInfo.deviceId;
            if (deviceInfo.kind === 'audiooutput') {
                option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
                audioOutputSelect.appendChild(option);
            } else {
                console.log('Some other kind of source/device: ', deviceInfo);
            }
        }
        selectors.forEach((select, selectorIndex) => {
            if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
                select.value = values[selectorIndex];
            }
        });
    };

    // Attach audio output device to video element using device/sink ID.
    function attachSinkId(element, sinkId) {
        if (typeof element.sinkId !== 'undefined') {
            element.setSinkId(sinkId)
                .then(() => {
                    console.log(`Success, audio output device attached: ${sinkId}`);
                })
                .catch(error => {
                    let errorMessage = error;
                    if (error.name === 'SecurityError') {
                        errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
                    }
                    console.error(errorMessage);
                    // Jump back to first output device in the list as it's the default.
                    audioOutputSelect.selectedIndex = 0;
                });
        } else {
            console.warn('Browser does not support output device selection.');
        }
    };

    // Store the audio output selection and call the sink linker
    function changeAudioDestination() {
        const audioDestination = audioOutputSelect.value;
        attachSinkId(videoRemoteElem, audioDestination);
    };

    // Process the SDP for the connection offer and add the necessary flags for stereo audio and max bitrate
    function processOfferForStereo(offer) {
        offer.sdp = offer.sdp.replace('useinbandfec=1', 'stereo=1; sprop-stereo=1; maxaveragebitrate=131072; cbr=1');
        return offer;
    };

    // Take the turn credentials that have been sent and apply them to the configuration
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