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

    function startup() {
        console.log("Stereo JS Starting Up...");

        videoRemoteElem = document.getElementById('videoRemoteElem');
        videoLocalElem = document.getElementById('videoLocalElem');

        videoRemoteElem.srcObject = null;

        buttonVideoSizeSource = document.getElementById('buttonVideoSizeSource');
        buttonVideoSizeSource.addEventListener('click', function(ev){
            videoRemoteElem.style.width = "auto";
            videoRemoteElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonVideoSizeResponsive = document.getElementById('buttonVideoSizeResponsive');
        buttonVideoSizeResponsive.addEventListener('click', function(ev){
            videoRemoteElem.style.width = "100%";

            ev.preventDefault();
        }, false);

        buttonVideoSizePage = document.getElementById('buttonVideoSizePage');
        buttonVideoSizePage.addEventListener('click', function(ev){
            videoRemoteElem.style.width = window.innerWidth;

            var docH = $( document ).height();
            var vidH = $('#videoElem').height();
            var videoScale = ($('#videoElem').width() / $('#videoRemoteElem').height());
            var topH = docH-vidH;
            var workableH = Math.floor((window.innerHeight-topH-0)*videoScale);

            videoRemoteElem.style.width = workableH + "px";
            videoRemoteElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonStart = document.getElementById('buttonStart');
        buttonStart.addEventListener('click', function(ev){
            console.log("Start Button");
            start();
            ev.preventDefault();
        }, false);

        buttonLogConnection = document.getElementById('buttonLogConnection');
        buttonLogConnection.addEventListener('click', function(ev){
            console.log("Log Connection");
            console.log(pc);
            ev.preventDefault();
        }, false);

        buttonAudioOutputs = document.getElementById('buttonAudioOutputs');
        buttonAudioOutputs.addEventListener('click', function(ev){
            console.log("Audio Outputs");
            gotDevices();
            ev.preventDefault();
        }, false);

        console.log("Socket ID: " + signaling.id);

        console.log("Stereo JS Startup Complete.");
    }

    const signaling = io();
    const constraints = {
        video: false,
        audio: {
            'channelCount': {'exact': 2},
            'echoCancellation': false,
            'autoGainControl': false,
            'googAutoGainControl': false,
            'noiseSuppression': false,
            'sampleRate': 44100,
            'sampleSize': 16
            
        }
    };
    const configurationA = {
        iceServers: [
            {
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
    ]};
    const configurationB = {
        iceServers: [{urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.l.google.com:19302?transport=udp',
    ]}]};
    const configuration = configurationA;
    

    // send any ice candidates to the other peer
    function onIceCandidate(data) {
        console.log("onicecandidate...");
        console.log(data);
        signaling.emit(
            "screenSignalFromStereo",
            {
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
        await pc.setLocalDescription(offer);
        // send the offer to the other peer
        signaling.emit("screenSignalFromStereo",
        {
            fromId: signaling.id,
            desc: pc.localDescription
        });
      } catch (err) {
        console.error(err);
      } finally {
        makingOffer = false;
      }
    };

    function handleGetUserMediaError(e) {
        switch(e.name) {
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
        if(nowStreaming>0) {
            return;
        };
        console.log("Start");
        nowStreaming = 1;
        checkPeerConnection();
        return pc.createOffer().then(function (offer) {
            console.log("MAKING OFFER");
            console.log(offer);
            console.log(offer);
            return pc.setLocalDescription(offer);
        })
        .then(function () {
            signaling.emit(
                "screenSignalFromStereo",
                {
                    fromId: signaling.id,
                    desc: pc.localDescription
                }
            );
        })
        .catch(function (err){console.error(err)});
    };

        // once remote track media arrives, show it in remote video element
    function onTrack(event) {
      // don't set srcObject again if it is already set.
      if (videoRemoteElem.srcObject) return;
      videoRemoteElem.srcObject = event.streams[0];
    };

    function onConnectionStateChange(event) {
        switch(pc.connectionState) {
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
        if(pc.iceConnectionState == 'disconnected') {
            console.log('Disconnected. Closing.');
            shutdown();
        }
    };

    function checkPeerConnection() {
        if(!pc) {
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
        if(nowStreaming > 0) {
            stream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
        stream = null;
        pc.close();
        pc = new RTCPeerConnection(configuration);
        nowStreaming = 0;
    };
    
    function listDevices() {
        navigator.mediaDevices.enumerateDevices()
        .then(data => console.log(
            data.forEach(
                async function (device) {
            var txt = await device.getCapabilities();
            console.log(device);
            console.log(txt);
        })))
    };

    signaling.on("screenSignalFromStereo", async (data) =>  {
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
              if (data.desc.type =="offer") {
                await pc.setLocalDescription();
                signaling.emit("screenSignalFromStereo",{
                    fromId: signaling.id,
                    desc: pc.localDescription});
              }
            } else if (data.candidate) {
                await pc.addIceCandidate(data.candidate);
            };
            console.log("Peer Connection...");
            console.log(pc);
            if(nowStreaming===1) {
                nowStreaming = 2;
                /*stream = await navigator.mediaDevices.getUserMedia(constraints);*/
                await navigator.mediaDevices.getUserMedia(constraints).then(function(getUserMediaResult) {
                    stream = getUserMediaResult;
                }).catch(handleGetUserMediaError);
                console.log("Capabilities:");
                console.log(stream.getAudioTracks()[0].getCapabilities());
                stream.getTracks().forEach((track) => pc.addTrack(track, stream));
                videoLocalElem.srcObject = stream;
                nowStreaming = 3;
            };
        } catch(err) {
            console.error(err);
        }
    });


    window.addEventListener('load', startup, false);
})();