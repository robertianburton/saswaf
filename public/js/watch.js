(function() {

    var buttonVideoSizeSource = null;
    var buttonVideoSizePage = null;
    var buttonVideoSizeResponsive = null;
    var buttonLogConnection = null;
    var videoRemoteElem = null;
    var pc = null;
    var hostListButtons = null;
    var hostList = [];
    var currentHost = null;
    var hostIdField = null;
    var sectionHostList = null;

    function startup() {
        console.log("Watch JS Starting Up...");

        videoRemoteElem = document.getElementById('videoRemoteElem');

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

        buttonLogConnection = document.getElementById('buttonLogConnection');
        buttonLogConnection.addEventListener('click', function(ev){
            console.log("Log Connection");
            console.log(pc);
            sendToServer({'type':'requestHostList'});
            ev.preventDefault();
        }, false);

        sectionHostList = document.getElementById('sectionHostList');
        hostIdField = document.getElementById('hostIdField');
        hostListButtons = document.getElementById('hostListButtons');

        sendToServer({'type':'requestHostList'});

        console.log("Socket ID: " + signaling.id);

        console.log("Watch JS Startup Complete.");
    }

    const signaling = io();
    const constraints = {
        video: true,
        audio: {
            'channelCount': {'ideal': 2},
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
    
    function sendToServer(data) {
        console.log(data);
        signaling.emit("signalToServer",data);
    };

    function sendToUser(data) {
        console.log(data);
        signaling.emit("signalToUser",data);
    };

    function fillHostList() {
        hostListButtons.innerHTML = "";
        if(hostList && hostList.length>0) {
            hostList.forEach(
                (host) => {
                    hostListButtons.innerHTML +='<button type="button" class="list-group-item list-group-item-action" id="host_'+host+'">'+host+'</button>';
                    var thisitem = document.getElementById('host_'+host);
                    thisitem.addEventListener('click', function(ev){
                        sectionHostList.style.display = "none";
                        console.log("Clicked " + host);
                        sendToUser({fromId: signaling.id, toId: host, type: "newFriend"});
                        currentHost = host;
                        hostIdField.innerHTML = ': ' + currentHost;
                        ev.preventDefault();
                    }, false);
                    
                }
            );
        }
    };

    function onTrack(event) {
      // don't set srcObject again if it is already set.
      if (videoRemoteElem.srcObject) return;
      videoRemoteElem.srcObject = event.streams[0];
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

        // send any ice candidates to the other peer
    function onIceCandidate(data) {
        console.log("onicecandidate...");
        console.log(data);
        signaling.emit(
            "screenSignalFromEqual",
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
        await pc.setLocalDescription(await pc.createOffer());
        // send the offer to the other peer
        signaling.emit("screenSignalFromEqual",
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

        closeVideoCall();
    }

    // once remote track media arrives, show it in remote video element
    function onTrack(event) {
      // don't set srcObject again if it is already set.
      if (videoRemoteElem.srcObject) return;
      videoRemoteElem.srcObject = event.streams[0];
    };

    signaling.on("signalFromServer", async (data) =>  {
        console.log("Received from Server. Printing data...");
        console.log(data);
        if(data.type="hostList") {
            hostList = data.hostList;
            hostIdField.innerHTML = '';
            fillHostList();
        };
    });

    signaling.on("leaver", async (data) =>  {
        console.log("Received from Server. Printing data...");
        console.log(data);
        if(data.fromId=currentHost) {
            sectionHostList.style.display = "block";
            hostList = data.hostList;
            fillHostList();
        };
    });

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

    window.addEventListener('load', startup, false);
})();