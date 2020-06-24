(function() {

    var buttonVideoSizeSource = null;
    var buttonVideoSizePage = null;
    var buttonVideoSizeResponsive = null;
    var buttonLogConnection = null;
    var videoRemoteElem = null;
    var videoLocalElem = null;
    var screenHostId = null;
    let makingOffer = false;
    let ignoreOffer = false;
    var nowStreaming = 0;
    var stream = null;
    var pc = null;
    let polite = true;
    var audioInputSelect = null;
    var audioOutputSelect = null;
    var selectors = null;
    var audioSource = null;

    function startup() {
        console.log("Stereo JS Starting Up...");

        videoRemoteElem = document.getElementById('videoRemoteElem');
        videoLocalElem = document.getElementById('videoLocalElem');

        videoRemoteElem.srcObject = null;

        audioInputSelect = document.getElementById('audioInputSelect');
        audioOutputSelect = document.getElementById('audioOutputSelect');
        console.log(audioInputSelect);
        selectors = [audioInputSelect, audioOutputSelect];

        buttonVideoSizeSource = document.getElementById('buttonVideoSizeSource');
        buttonVideoSizeSource.addEventListener('click', function(ev) {
            videoRemoteElem.style.width = "auto";
            videoRemoteElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonVideoSizeResponsive = document.getElementById('buttonVideoSizeResponsive');
        buttonVideoSizeResponsive.addEventListener('click', function(ev) {
            videoRemoteElem.style.width = "100%";

            ev.preventDefault();
        }, false);

        buttonVideoSizePage = document.getElementById('buttonVideoSizePage');
        buttonVideoSizePage.addEventListener('click', function(ev) {
            videoRemoteElem.style.width = window.innerWidth;

            var docH = $(document).height();
            var vidH = $('#videoElem').height();
            var videoScale = ($('#videoElem').width() / $('#videoRemoteElem').height());
            var topH = docH - vidH;
            var workableH = Math.floor((window.innerHeight - topH - 0) * videoScale);

            videoRemoteElem.style.width = workableH + "px";
            videoRemoteElem.scrollIntoView();
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
            console.log(stream.getAudioTracks().map(item => item.getCapabilities()));
            ev.preventDefault();
        }, false);

        buttonAudioDevices = document.getElementById('buttonAudioDevices');
        buttonAudioDevices.addEventListener('click', function(ev) {
            console.log("Audio Outputs");
            fillList();
            ev.preventDefault();
        }, false);

        audioInputSelect.onchange = startb;
        audioOutputSelect.onchange = changeAudioDestination;

        console.log("Socket ID: " + signaling.id);

        console.log("Stereo JS Startup Complete.");
    };

    const signaling = io();
    var constraints = {
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
    const configurationA = {
        iceServers: [{
                urls: ['stun:stun.robertianburton.com:3478']
            },
            {
                username: "testuser",
                credential: "testpassword",
                urls: [
                    "turn:turn.robertianburton.com:3478",
                    "turn:turn.robertianburton.com:3478?transport=udp",
                    "turn:turn.robertianburton.com:3478?transport=tcp"
                ]
            }
        ]
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
    const configuration = configurationA;


    // send any ice candidates to the other peer
    function onIceCandidate(data) {
        console.log("onicecandidate...");
        console.log(data);
        signaling.emit(
            "screenSignalFromStereo", {
                fromId: signaling.id,
                candidate: data.candidate
            }
        )
    };

    // let the "negotiationneeded" event trigger offer generation
    async function onNegotiationNeeded() {
        console.log("onnegotiationneeded...");
        try {
            makingOffer = true;
            var offer = await pc.createOffer();
            var processedOffer = processOfferForStereo(offer);
            console.log("PROCESSED OFFER NN");
            console.log(processedOffer);
            await pc.setLocalDescription(processedOffer);
            // send the offer to the other peer
            signaling.emit("screenSignalFromStereo", {
                fromId: signaling.id,
                desc: pc.localDescription
            });
        } catch (err) {
            console.error(err);
        } finally {
            makingOffer = false;
        };
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

    async function start() {
        if (nowStreaming > 0) {
            return;
        };
        console.log("Start");
        nowStreaming = 1;
        checkPeerConnection();
        return pc.createOffer().then(function(offer) {
                console.log("MAKING OFFER");
                console.log(offer);

                var processedOffer = processOfferForStereo(offer);
                console.log("PROCESSED OFFER START");
                console.log(processedOffer);
                return pc.setLocalDescription(processedOffer);
            })
            .then(function() {
                signaling.emit(
                    "screenSignalFromStereo", {
                        fromId: signaling.id,
                        desc: pc.localDescription
                    }
                );
            })
            .catch(function(err) { console.error(err) });
    };

    // once remote track media arrives, show it in remote video element
    function onTrack(event) {
        // don't set srcObject again if it is already set.
        /*if (videoRemoteElem.srcObject) return;*/
        console.log("Adding Streams:");
        console.log(event);
        stream = event.streams[0];
        videoRemoteElem.srcObject = stream;
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
        };
    };

    function checkPeerConnection() {
        if (!pc) {
            pc = new RTCPeerConnection(configuration);
            pc.onconnectionstatechange = onConnectionStateChange;
            pc.ontrack = onTrack;
            pc.onnegotiationneeded = onNegotiationNeeded;
            pc.onicecandidate = onIceCandidate;
        }
    };

    function shutdown() {
        videoLocalElem.srcObject = null;
        videoRemoteElem.srcObject = null;
        if (nowStreaming > 0) {
            stream.getTracks().forEach(function(track) {
                track.stop();
            });
        };
        stream = null;
        pc.close();
        pc = new RTCPeerConnection(configuration);
        nowStreaming = 0;
    };

    function listDevices() {
        navigator.mediaDevices.enumerateDevices()
            .then(data => console.log(
                data.forEach(
                    async function(device) {
                        var txt = await device.getCapabilities();
                        console.log(device);
                        console.log(txt);
                    })));
    };

    signaling.on("screenSignalFromStereo", async (data) => {
        checkPeerConnection();
        console.log("Received from Stereo. Printing data...");
        console.log(data);
        try {
            if (data.desc) {

                const offerCollision = (data.desc.type == "offer") &&
                    (makingOffer || pc.signalingState != "stable");

                ignoreOffer = !polite && offerCollision;
                if (ignoreOffer) {
                    return;
                };
                await pc.setRemoteDescription(data.desc);
                if (data.desc.type == "offer") {
                    var answer = await pc.createAnswer();
                    answer = processOfferForStereo(answer);
                    await pc.setLocalDescription(answer);
                    signaling.emit("screenSignalFromStereo", {
                        fromId: signaling.id,
                        desc: pc.localDescription
                    });
                }
            } else if (data.candidate) {
                await pc.addIceCandidate(data.candidate);
            };
            /*console.log("Peer Connection...");
            console.log(pc);*/
            if (nowStreaming === 1) {
                nowStreaming = 2;
                /*stream = await navigator.mediaDevices.getUserMedia(constraints);*/
                await navigator.mediaDevices.getUserMedia(constraints).then(function(getUserMediaResult) {
                    stream = getUserMediaResult;
                }).catch(handleGetUserMediaError);
                fillList();
                console.log("Capabilities:");
                console.log(stream.getAudioTracks()[0].getCapabilities());
                stream.getTracks().forEach((track) => pc.addTrack(track, stream));
                videoLocalElem.srcObject = stream;
                nowStreaming = 3;
            };
        } catch (err) {
            console.error(err);
        }
    });

    function refreshConstraints() {
        constraints = {
            video: false,
            audio: {
                'channelCount': { 'min': 2 },
                'echoCancellation': false,
                'autoGainControl': false,
                'googAutoGainControl': false,
                'noiseSuppression': false,
                'sampleRate': 44100,
                'sampleSize': 16,
                'deviceId': { 'exact': audioSource }
            }
        };
    };

















    function gotDevices(deviceInfos) {
        // Handles being called several times to update labels. Preserve values.
        console.log(deviceInfos);
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
            if (deviceInfo.kind === 'audioinput') {
                option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
                audioInputSelect.appendChild(option);
            } else if (deviceInfo.kind === 'audiooutput') {
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

    function changeAudioDestination() {
        const audioDestination = audioOutputSelect.value;
        attachSinkId(videoRemoteElem, audioDestination);
    };

    function gotStream(stream) {
        window.stream = stream; // make stream available to console
        // Refresh button list in case labels have become available
        return navigator.mediaDevices.enumerateDevices();

    };

    function handleError(error) {
        console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
    };

    async function fillList() {
        await gotStream().then(gotDevices);
    };

    async function startb() {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
        };
        audioSource = audioInputSelect.value;
        refreshConstraints();
        var senders = pc.getSenders();
        senders.forEach((sender) => pc.removeTrack(sender));

        await navigator.mediaDevices.getUserMedia(constraints).then(function(getUserMediaResult) {
            console.log(stream);
            stream = null;
            stream = getUserMediaResult;
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
            console.log("435 LOGGING");
            console.log(stream);
        }).catch(handleGetUserMediaError);
        fillList();
        videoLocalElem.srcObject = stream;
    };

    function processOfferForStereo(offer) {
        offer.sdp = offer.sdp.replace('useinbandfec=1', 'stereo=1; sprop-stereo=1; maxaveragebitrate=510000; cbr=1');
        return offer;
    };




    window.addEventListener('load', startup, false);
})();