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

    function startup() {
        console.log("Host JS Starting Up...");

        videoLocalElem = document.getElementById('videoLocalElem');

        buttonVideoSizeSource = document.getElementById('buttonVideoSizeSource');
        buttonVideoSizeSource.addEventListener('click', function(ev){
            videoLocalElem.style.width = "auto";
            videoLocalElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonVideoSizeResponsive = document.getElementById('buttonVideoSizeResponsive');
        buttonVideoSizeResponsive.addEventListener('click', function(ev){
            videoLocalElem.style.width = "100%";

            ev.preventDefault();
        }, false);

        buttonVideoSizePage = document.getElementById('buttonVideoSizePage');
        buttonVideoSizePage.addEventListener('click', function(ev){
            videoLocalElem.style.width = window.innerWidth;

            var docH = $( document ).height();
            var vidH = $('#videoElem').height();
            var videoScale = ($('#videoElem').width() / $('#videoLocalElem').height());
            var topH = docH-vidH;
            var workableH = Math.floor((window.innerHeight-topH-0)*videoScale);

            videoLocalElem.style.width = workableH + "px";
            videoLocalElem.scrollIntoView();
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
            console.log(signaling.id);
            
            ev.preventDefault();
        }, false);

        userIdField = document.getElementById('userIdField');
        
        friendListItems = document.getElementById('friendListItems');

        
        

        console.log("Host JS Startup Complete.");
    }

    
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
    
    function formatDate(date, format) {
        date = date.toJSON().split(/[:/.TZ-]/);
        return format.replace(/[ymdhisu]/g, function (letter) {
            return date['ymdhisu'.indexOf(letter)];
        });
    };

    function printToConsole(data) {
        console.log(formatDate(new Date(), 'ymd hisu')+" "+JSON.stringify(data));
    };

    function sendToUser(data) {
        console.log(data);
        signaling.emit("signalToUser",data);
    };

    function sendToServer(data) {
        signaling.emit("signalToServer",data);
    };

    function sendAddHostToServer() {
        /*userName = user || `User${Math.floor(Math.random() * 1000000)}`;*/
        sendToServer({'type':'addHost', 'id':signaling.id});
    };

    function fillFriendList() {
        friendListItems.innerHTML = '';
        if(friendList.size>0) {
            friendList.forEach(
                (friend) => {
                     friendListItems.innerHTML +='<button type="button" class="list-group-item list-group-item-action">'+friend+'</button>';
                }
            );
        }
    };

    function bindSignalingHandlers(signalingObject) {
        signalingObject.on("connect", async (data) =>  {
            console.log("Socket ID: " + signaling.id);
            userIdField = document.getElementById('userIdField');
            userIdField.innerHTML=": "+signaling.id;
            sendAddHostToServer();
        });

        signalingObject.on("signalToUser", async (data) =>  {
            printToConsole("SignalToUser From " + data.fromId + " to " + data.toId + ":");
            console.log(data);
            console.log("Type");
            console.log(data.type);
            if(data.type==="newFriend") {
                friendList.add(data.fromId);
                console.log(friendList);
                fillFriendList();
                if(!pclist[data.fromId]) {
                    pclist[data.fromId] = new RTCPeerConnection(configuration);
                    pclist[data.fromId].onnegotiationneeded = handleNegotiationNeededEvent(data.fromId);
                    pclist[data.fromId].onicecandidate = handleICECandidateEvent;
                    /*pclist[data.fromId].oniceconnectionstatechange = onConnectionStateChange;*/
                }
            }
            else if(data.type==="video-answer") {
                var desc = new RTCSessionDescription(data.sdp);
                await pclist[data.fromId].setRemoteDescription(desc).catch(reportError);
                console.log("In video-answer, printing pclist entry");
                console.log(pclist[data.fromId]);
                stream.getTracks().forEach((track) => pclist[data.fromId].addTrack(track, stream));
            }
            else if(data.type==="new-ice-candidate") {
                handleNewICECandidate(data);
            };
        });

        signalingObject.on("leaver", async (data) =>  {
            console.log(data);
            friendList.delete(data.fromId);
            console.log("Removing " + data.fromId);
            fillFriendList();
        });
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

        /*closeVideoCall();*/
    };

    function handleNegotiationNeededEvent(friendId) {
        pclist[friendId].createOffer().then(function(offer) {
            return pclist[friendId].setLocalDescription(offer);
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
        if (data.candidate) {
            sendToUser({
                type: "new-ice-candidate",
                toId: data.fromId,
                fromId: signaling.id,
                candidate: data.candidate
            });
        };
    };

    async function handleNewICECandidate(data) {
        var candidate = new RTCIceCandidate(data.candidate);

        await pclist[data.fromId].addIceCandidate(candidate)
        .catch(reportError);
    };

    async function handleOnicecandidate(data) {
        console.log("onicecandidate trigger");
        signaling.emit("screenSignalFromScreen",{
        toId: data.fromId,
        candidate: data.candidate});
    };

    function reportError(e) {
        console.log("Report Error");
        console.error(e);
    };

    async function handleOnnegotiationneeded(friendId) {
        console.log("onnegotiationneeded trigger");
        pclist[friendId].createOffer().then(function(offer) {
            return pclist[friendId].setLocalDescription(offer);
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

        /*makingOffer = false;
        try {
            makingOffer = true;
            await pclist[data.fromId].setLocalDescription(await pclist[data.fromId].createOffer());
            // send the offer to the other peer
            signaling.emit("screenSignalFromScreen",{
                toId: data.fromId,
                desc: pclist[data.fromId].localDescription});
        } catch (err) {
            console.error(err);
        } finally {
            makingOffer = false;
        }*/
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

    async function oldStart() {
        if(nowStreaming>0) {
            return;
        };
        console.log("Start");
        nowStreaming = 1;
        checkPeerConnection();
        return pc.createOffer().then(function (offer) {
            return pc.setLocalDescription(offer);
        })
        .then(function () {    
            signaling.emit(
                "screenSignalFromEqual",
                {
                    fromId: signaling.id,
                    desc: pclist.localDescription /* uhhhh */
                }
            );
        })
        .catch(function (err){console.error(err)});
    };

    async function start() {
        
        nowStreaming = 1;
        if(nowStreaming===1) {
            nowStreaming = 2;
            /*stream = await navigator.mediaDevices.getUserMedia(constraints);*/
            await navigator.mediaDevices.getDisplayMedia(constraints).then(function(getDisplayMediaResult) {
                stream = getDisplayMediaResult;
            }).catch(handleGetUserMediaError);
            /*console.log("Capabilities:");*/
            /*console.log(stream.getVideoTracks()[0].getCapabilities());*/
            /*stream.getTracks().forEach((track) => pc.addTrack(track, stream));*/
            videoLocalElem.srcObject = stream;
            nowStreaming = 3;
        };

        signaling = io();
        userIdField.innerHTML=": Waiting...";
        bindSignalingHandlers(signaling);
    };





























    window.addEventListener('load', startup, false);
})();