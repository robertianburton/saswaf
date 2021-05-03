(function () {

    // Declare scope-wide variables
    var audioPerm, buttonCopyLink, debugButtonBar, isDebug, audioDeviceList, audioOutputSelect, buttonVideoSizeSource, buttonVideoSizePage, buttonVideoSizeResponsive, buttonLogConnection, userIdField, videoLocalElem, nowStreaming, stream, signaling, friendList, friendListItems, pclist, resWidth, resHeight, qd, iceConfigRib, iceConfigXirsys, iceConfigSelected, constraints;

    // Set up hooks, query descriptors, and configuration on load
    function startup() {
        console.log("Host JS Starting Up...");

        buttonVideoSizeSource = null;
        buttonVideoSizePage = null;
        buttonVideoSizeResponsive = null;
        buttonLogConnection = null;
        userIdField = null;
        videoLocalElem = null;
        nowStreaming = 0;
        isDebug = 0;
        audioPerm = 0;
        stream = null;
        signaling;
        audioOutputSelect = document.getElementById('audioOutput');
        audioDeviceList = document.getElementById('buttonAudioMenu');
        debugButtonBar = document.getElementById('debugButtonBar');
        friendList = new Set();
        friendListItems = null;
        pclist = [];
        resWidth = 1600;
        resHeight = 900;

        qd = {};

        //Split query parameters
        if (location.search) location.search.substr(1).split("&").forEach(function (item) {
            var s = item.split("="),
                k = s[0],
                v = s[1] && decodeURIComponent(s[1]); //  null-coalescing / short-circuit
            //(k in qd) ? qd[k].push(v) : qd[k] = [v]
            (qd[k] = qd[k] || []).push(v) // null-coalescing / short-circuit
        });

        if (qd.width) {
            resWidth = qd.width[0]
        };

        if (qd.height) {
            resHeight = qd.height[0]
        };

        constraints = {
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
        iceConfigRib = {
            iceServers: [{
                urls: [
                    'stun:stun.robertianburton.com:3478',
                    'stun:stun.l.google.com:19302',
                    'stun:stun1.l.google.com:19302',
                    'stun:stun2.l.google.com:19302',
                    'stun:stun.l.google.com:19302?transport=udp',
                ]
            }]
        };
        iceConfigXirsys = {
            iceServers: [{ urls: ["stun:us-turn2.xirsys.com"] }, { username: "k3IAtn2K1yMCrpypkP_CJCyEV7m3FHThFwcUnIxp_4i8-ZuFR4JQN0zqjllYFBXYAAAAAF7DZDF5YWtldHlTYXhlcw==", credential: "6f541688-998b-11ea-8e17-0242ac140004", urls: ["turn:us-turn2.xirsys.com:80?transport=udp", "turn:us-turn2.xirsys.com:3478?transport=udp", "turn:us-turn2.xirsys.com:80?transport=tcp", "turn:us-turn2.xirsys.com:3478?transport=tcp", "turns:us-turn2.xirsys.com:443?transport=tcp", "turns:us-turn2.xirsys.com:5349?transport=tcp"] }]
        };
        iceConfigSelected = iceConfigXirsys;






        videoLocalElem = document.getElementById('videoLocalElem');

        buttonVideoSizeSource = document.getElementById('buttonVideoSizeSource');
        buttonVideoSizeSource.addEventListener('click', function (ev) {
            videoLocalElem.style.width = "auto";
            videoLocalElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonVideoSizeResponsive = document.getElementById('buttonVideoSizeResponsive');
        buttonVideoSizeResponsive.addEventListener('click', function (ev) {
            videoLocalElem.style.width = "100%";
            ev.preventDefault();
        }, false);

        buttonVideoSizePage = document.getElementById('buttonVideoSizePage');
        buttonVideoSizePage.addEventListener('click', function (ev) {
            videoLocalElem.style.width = document.body.clientWidth + "px";
            videoLocalElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonStart = document.getElementById('buttonStart');
        buttonStart.addEventListener('click', function (ev) {
            console.log("Start Button");
            start();
            ev.preventDefault();
        }, false);

        buttonCopyLink = document.getElementById('buttonCopyLink');
        buttonCopyLink.addEventListener('click', function (ev) {
            copyHostUrl();
            ev.preventDefault();
        }, false);

        buttonLogConnection = document.getElementById('buttonLogConnection');
        buttonLogConnection.addEventListener('click', function (ev) {
            console.log("vvv Log Connection vvv");
            console.log("Peer Connection:");
            if (pclist) {
                console.log(pclist);
            };
            console.log("Senders:");
            if (pclist) {
                for (var key in pclist) {
                    console.log(pclist[key].getSenders());
                };
            };
            console.log("Signaling ID:");
            if (signaling) {
                console.log(signaling.id);
            };
            console.log("Stream:");
            if (stream) {
                console.log(stream);
            };
            console.log("URL Parameters:");
            if (qd) {
                console.log(qd);
            };
            console.log("Constraints:")
            if (constraints) {
                console.log(constraints);
            };
            console.log("Video Tracks:");
            if (stream) {
                console.log(stream.getVideoTracks());
            }
            console.log("^^^ Log Connection ^^^");
            ev.preventDefault();
        }, false);

        buttonAudioOutputs = document.getElementById('buttonAudioOutputs');
        buttonAudioOutputs.addEventListener('click', function (ev) {
            console.log("Audio Outputs");
            getAudioDeviceList();
            ev.preventDefault();
        }, false);

        userIdField = document.getElementById('userIdField');

        friendListItems = document.getElementById('friendListItems');

        fillFriendList();

        if (qd.isDebug && qd.isDebug[0] === '1') {
            isDebug = 1;
            console.log("Debug Mode On");
            debugButtonBar.classList.remove('d-none');
        };

        console.log("Host JS Startup Complete.");
    };

    // Given a Date, format it as a console-friendly YMDHISU format
    function formatDate(date, format) {
        date = date.toJSON().split(/[:/.TZ-]/);
        return format.replace(/[ymdhisu]/g, function (letter) {
            return date['ymdhisu'.indexOf(letter)];
        });
    };

    // Given some data, print it to the console with a timestamp
    function printToConsole(data) {
        console.log(formatDate(new Date(), 'ymd hisu') + " " + JSON.stringify(data));
    };

    // Transmit a message to the signaling server to relay on to a specific user
    function sendToUser(data) {
        console.log("Sending To User: ");
        console.log(data);
        signaling.emit("signalToUser", data);
    };

    // Transmit a message to the signaling server for the server to process
    function sendToServer(data) {
        console.log("Sending To Server: ");
        console.log(data);
        signaling.emit("signalToServer", data);
    };

    // Take the list of people watching and fill in the UI list of friends
    function fillFriendList() {
        friendListItems.innerHTML = 'Friends: ';
        if (friendList.size > 0) {
            friendListItems.innerHTML += Array.from(friendList).join(', ');
        } else {
            friendListItems.innerHTML += "None - Go find one!"
        }
    };

    // Generate the URL to connect to watch this host
    function getHostUrl() {
        var port = "";
        if (location.port) {
            port = ":" + location.port
        };
        var result = location.protocol + "//" + location.hostname + port + "/watch?host=" + signaling.id;
        return result;
    };

    // Copy the Host URL to the clipboard
    function copyHostUrl() {
        console.log("Copying URL");
        navigator.clipboard.writeText(getHostUrl()).then(function () {
            console.log("Url copied!");
        }, function () {
            console.log("Url copy failed!");
        });
    };

    // Take a connection and bind the signal handlers to it
    function bindSignalingHandlers(signalingObject) {
        signaling.on("connect", async (data) => {
            console.log("Socket ID: " + signaling.id);
            userIdField = document.getElementById('userIdField');
            userIdField.innerHTML = 'Your URL: <thing id="hostUrlText">' + getHostUrl() + ' <a href="#">(Copy)</a>';
            userIdField.addEventListener('click', function (ev) {
                copyHostUrl();
            }, false);
        });

        signaling.on("signalFromServer", async (data) => {
            printToConsole("Received Signal from Server:");
            console.log(data);
            if (data.type === "turnCredentials") {
                console.log("Handling Turn Credentials");
                setIceConfiguration(data.turnCredentials);
            } else if (data.type === "leaver") {
                console.log("Notified of Leaver");
                if (pclist[data.fromId]) {
                    const senders = pclist[data.fromId].getSenders();
                    senders.forEach((sender) => pclist[data.fromId].removeTrack(sender));
                    pclist[data.fromId].close();
                };
                friendList.delete(data.fromId);
                console.log("Removing " + data.fromId);
                fillFriendList();
            };
        });

        signaling.on("signalToUser", async (data) => {
            printToConsole("Received from User... " + data.fromId + " to " + data.toId + ":");
            console.log(data);
            if (data.type === "newFriend") {
                friendList.add(data.fromId);
                console.log(friendList);
                fillFriendList();
                if (!pclist[data.fromId]) {
                    pclist[data.fromId] = new RTCPeerConnection(iceConfigSelected);
                    pclist[data.fromId].onnegotiationneeded = handleNegotiationNeededEvent.bind(data.fromId);
                    pclist[data.fromId].onicecandidate = handleICECandidateEvent;
                    handleNegotiationNeededEvent(data.fromId);
                }
            } else if (data.type === "video-answer") {
                var desc = new RTCSessionDescription(data.sdp);
                await pclist[data.fromId].setRemoteDescription(desc).catch(reportError);

                if (!pclist[data.fromId].nowStreaming) {
                    pclist[data.fromId].nowStreaming = 2;
                    stream.getTracks().forEach((track) => pclist[data.fromId].addTrack(track, stream));
                    pclist[data.fromId].nowStreaming = 3;
                };
            } else if (data.type === "new-ice-candidate") {
                handleNewICECandidate(data);
            };
        });
    };

    // Handle and report various media errors that arise from the audio/video selection tool(s)
    function handleGetUserMediaError(e) {
        nowStreaming = 2;
            var tracks = [];
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
                alert("Error opening your camera and/or microphone: " + e.message + ". This error also occurs if selecting a video source is canceled.");
                break;
        };
    };

    // Handle the negotiation of how to exchange media with a new friend
    function handleNegotiationNeededEvent(friendId) {
        printToConsole("handleNegotiationNeededEvent");
        if (friendId && friendId.target) {
            friendId = friendId.target.signalingId
        };
        console.log(friendId);
        pclist[friendId].createOffer().then(function (offer) {
            var processedOffer = processOfferForStereo(offer);
            console.log("Processed Offer:");
            console.log(processedOffer);
            pclist[friendId].signalingId = friendId;
            return pclist[friendId].setLocalDescription(processedOffer);
        })
            .then(function () {
                sendToUser({
                    fromId: signaling.id,
                    toId: friendId,
                    type: "video-offer",
                    sdp: pclist[friendId].localDescription
                });
            })
            .catch(reportError);
    };

    // When receiving a (not new) ICE candidate, log it; if there is a candidate, send it to the user
    function handleICECandidateEvent(data) {
        printToConsole("handleICECandidateEvent");
        sendToUser({
            type: "new-ice-candidate",
            toId: this.signalingId,
            fromId: signaling.id,
            candidate: data.candidate
        });
    };

    // Handle a new ice candidate message from the host by adding it to the respective Peer Connection
    async function handleNewICECandidate(data) {
        printToConsole("handleNewICECandidate");
        console.log(data);
        var candidate = new RTCIceCandidate(data.candidate);

        await pclist[data.fromId].addIceCandidate(candidate)
            .catch(reportError);
    };

    // Log an error to the console
    function reportError(e) {
        console.log("Report Error");
        console.error(e);
    };

    // Handle the host pressing the Start button
    async function start() {
        nowStreaming = 1;

        if (nowStreaming === 1) {
            nowStreaming = 2;
            var tracks = [];
            await navigator.mediaDevices.getDisplayMedia(constraints).then(function (getDisplayMediaResult) {
                tracks = tracks.concat(getDisplayMediaResult.getTracks());
            }).then(function () {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                };
                stream = new MediaStream(tracks);
                videoLocalElem.srcObject = stream;

                if (pclist) {
                    var videoTrack = stream.getVideoTracks()[0];
                    var audioTrack = stream.getAudioTracks()[0];

                    for (var key in pclist) {

                        var senderVideo = pclist[key].getSenders().find(function (s) {
                            console.log(s);
                            if (s && s.track && s.track.kind && videoTrack && videoTrack.kind) {
                                return s.track.kind == videoTrack.kind;
                            }
                        });

                        var senderAudio = pclist[key].getSenders().find(function (s) {
                            console.log(s);
                            if (s && s.track && s.track.kind && audioTrack && audioTrack.kind) {
                                return s.track.kind == audioTrack.kind;
                            }
                        });

                        if (senderVideo && videoTrack) {
                            senderVideo.replaceTrack(videoTrack);
                        };

                        if (senderAudio && audioTrack) {
                            senderAudio.replaceTrack(audioTrack);
                        };
                    };
                };
                nowStreaming = 3;
            }).catch(handleGetUserMediaError);

            if(nowStreaming == 3) {
                // getAudioDeviceList();
                document.getElementById('buttonCopyLinkBar').classList.remove('d-none');
                document.getElementById('buttonStartBar').classList.add('d-none');

                if (!signaling) {
                    signaling = io();
                    userIdField.innerHTML = ": Waiting...";
                    sendToServer({ 'type': 'getTurnCredentials' });
                    bindSignalingHandlers(signaling);
                }

            }
        };

        
    };

    // Grab the list of audio devices to populate the selector
    async function getAudioDeviceList() {
        var deviceInfos = await navigator.mediaDevices.enumerateDevices();

        // Get the user media device permissions if they aren't taken yet.
        if (audioPerm === 0) {
            alert("In order to display your audio output devices, the site may ask for microphone permissions. The site does not use it, but it is required by the web browser in order to get the list of audio outputs.");
            await navigator.mediaDevices.getUserMedia({ audio: true });
            audioPerm = 1;
        };

        // Clear out the existing list
        $('.audio-output-device-list-option').remove();

        for (let i = 0; i !== deviceInfos.length; ++i) {
            const deviceInfo = deviceInfos[i];
            if (deviceInfo.kind === 'audiooutput') {

                var dropdownOption = document.createElement('a');
                dropdownOption.classList.add('dropdown-item');
                dropdownOption.classList.add('audio-output-device-list-option');
                dropdownOption.href = "#";
                dropdownOption.id = "audioMenuDevice" + i;
                dropdownOption.value = deviceInfo.deviceId;
                dropdownOption.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
                dropdownOption.addEventListener('click', function (ev) {
                    var elementz = document.getElementsByClassName('audio-output-device-list-option font-weight-bold');
                    for (var j = 0; j < elementz.length; j++) {
                        elementz[j].classList.remove('font-weight-bold');
                    };
                    ev.target.classList.add('font-weight-bold');

                    changeAudioDestination(deviceInfo.deviceId);
                }, false);

                audioDeviceList.appendChild(dropdownOption);

            } else {
                // console.log('Some other kind of source/device: ', deviceInfo);
            }
        }

        //Bold the default audio device
        var elementz = document.getElementsByClassName('audio-output-device-list-option');
        for (var j = 0; j < elementz.length; j++) {
            if (elementz[j].value === "default") {
                elementz[j].classList.add('font-weight-bold');
            }
        };


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
    function changeAudioDestination(value) {
        const audioDestination = value;
        attachSinkId(videoLocalElem, audioDestination);
    };

    // Replace an offer's SDP in-band forward error correction flag with SDP that enables 132kb stereo audio
    function processOfferForStereo(offer) {
        offer.sdp = offer.sdp.replace('useinbandfec=1', 'stereo=1; sprop-stereo=1; maxaveragebitrate=131072; cbr=1');
        return offer;
    };

    // Take the received turn credentials and set the ice configuration
    function setIceConfiguration(turnCredentials) {
        const iceConfigRibTurn = {
            iceServers: [{
                urls: ['stun:stun.robertianburton.com:3478',
                    'stun:stun.l.google.com:19302',
                    'stun:stun1.l.google.com:19302',
                    'stun:stun2.l.google.com:19302',
                    'stun:stun.l.google.com:19302?transport=udp']
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
        iceConfigSelected = iceConfigXirsys;
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