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
    var userIdField = null;
    var sectionHostList = null;
    var nowStreaming = 0;
    var audioOutputSelect = null;
    var audioPerm = 0;

    function startup() {
        console.log("Watch JS Starting Up...");

        videoRemoteElem = document.getElementById('videoRemoteElem');
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
            var vidH = $('#videoRemoteElem').height();
            var videoScale = ($('#videoRemoteElem').width() / $('#videoRemoteElem').height());
            var topH = docH-vidH;
            var workableH = Math.floor((window.innerHeight-topH-0)*videoScale);

            videoRemoteElem.style.width = workableH + "px";
            videoRemoteElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonLogConnection = document.getElementById('buttonLogConnection');
        buttonLogConnection.addEventListener('click', function(ev){
            console.log("Log Connection");
            gotDevices();
            console.log(pc);
            ev.preventDefault();
        }, false);

        buttonAudioOutputs = document.getElementById('buttonAudioOutputs');
        buttonAudioOutputs.addEventListener('click', function(ev){
            console.log("Audio Outputs");
            gotDevices();
            ev.preventDefault();
        }, false);

        sectionHostList = document.getElementById('sectionHostList');
        hostIdField = document.getElementById('hostIdField');
        userIdField = document.getElementById('userIdField');
        hostListButtons = document.getElementById('hostListButtons');
        audioOutputSelect = document.getElementById('audioOutput');

        audioOutputSelect.onchange = changeAudioDestination;

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
    
    function formatDate(date, format) {
        date = date.toJSON().split(/[:/.TZ-]/);
        return format.replace(/[ymdhisu]/g, function (letter) {
            return date['ymdhisu'.indexOf(letter)];
        });
    };

    function printToConsole(data) {
        console.log(formatDate(new Date(), 'ymd hisu')+" "+JSON.stringify(data));
    };

    function sendToServer(data) {
        console.log(data);
        signaling.emit("signalToServer",data);
    };

    function sendToUser(data) {
        console.log("Sending: ");
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
        };
        userIdField.innerHTML = ': ' + signaling.id;
    };

    function checkPeerConnection() {
        if(!pc) {
            pc = new RTCPeerConnection(configuration);
            pc.onconnectionstatechange = onConnectionStateChange;
            pc.ontrack = onTrack;
            pc.onnegotiationneeded = handleNegotiationNeededEvent;
            pc.onicecandidate = handleICECandidateEvent;
        }
    };


    function onConnectionStateChange(event) {
        console.log("Connection State Change...");
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

    // once remote track media arrives, show it in remote video element
    function onTrack(event) {
        console.log("Getting tracks!");
        // don't set srcObject again if it is already set.
        if (videoRemoteElem.srcObject) return;

        console.log("SET THE TRACKS!!!!");
        console.log(event);

        stream = event.streams[0];
        videoRemoteElem.srcObject = stream;

        nowStreaming = 1;
    };

    function reportError(e) {
        console.log("Report Error");
        console.error(e);
    };

    signaling.on("signalFromServer", async (data) =>  {
        console.log("Received from Server. Printing data...");
        console.log(data);
        if(data.type="hostList" && currentHost == null) {
            hostList = data.hostList;
            hostIdField.innerHTML = '';
            console.log("Cleared hostIdField");
            fillHostList();
        };
    });

    signaling.on("leaver", async (data) =>  {
        console.log("Received from Server. Printing data...");
        console.log(data);
        if(data.fromId=currentHost) {
            currentHost = null;
            shutdown();
            sectionHostList.style.display = "block";
            console.log("254 Showing Host List");
            hostList = data.hostList;
            fillHostList();
        };
    });

    signaling.on("signalToUser", async (data) =>  {
        printToConsole("SignalToUser From " + data.fromId + " to " + data.toId + ":");
        console.log(data);
        if(data.type==="video-offer" && data.fromId===currentHost) {
            checkPeerConnection();
            var desc = new RTCSessionDescription(data.sdp);
            pc.setRemoteDescription(desc)
            .then(function() {
                return pc.createAnswer();
            })
            .then(function(answer) {
                var processedAnswer = processOfferForStereo(answer);
                            console.log("PROCESSED ANSWER SIGNAL");
                            console.log(processedAnswer);
                return pc.setLocalDescription(processedAnswer);
            })
            .then(function() {
                var msg = {
                    fromId: signaling.id,
                    toId: currentHost,
                    type: "video-answer",
                    sdp: pc.localDescription
                };
                sendToUser(msg);
            })
            .catch(handleGetUserMediaError);
        } else if(data.type==="new-ice-candidate" && data.fromId===currentHost) {
            handleNewICECandidate(data);
        };
    });

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
        if(data.candidate) {
            var candidate = new RTCIceCandidate(data.candidate);
            await pc.addIceCandidate(candidate)
            .catch(reportError);
        }
    };

    // let the "negotiationneeded" event trigger offer generation
    async function handleNegotiationNeededEvent() {
        console.log("handleNegotiationNeededEvent");
        pc.createOffer().then(function(offer) {
            var processedOffer = processOfferForStereo(offer);
            console.log("PROCESSED OFFER NN");
            console.log(processedOffer);
            return pc.setLocalDescription(offer);
        })
        .then(function() {
            sendToUser({
                fromId: signaling.id,
                toId: currentHost,
                type: "video-offer",
                sdp: pc.localDescription
            })
        })
        .catch(reportError);
    };

    function shutdown() {
        videoRemoteElem.srcObject = null;
        if(nowStreaming && nowStreaming > 0 && stream) {
            stream.getTracks().forEach(function(track) {
                track.stop();
            });
        };
        stream = null;
        if(pc) {
            pc.close();
        };
        pc = null;
        nowStreaming = 0;
    };






    //Auto output devices list grab
    async function gotDevices() {
      // Handles being called several times to update labels. Preserve values.
      if(audioPerm===0) {
          alert("In order to display your audio output devices, the site may ask for microphone permissions. The microphone is not accessed, used, recorded, or saved in any way.");
          await navigator.mediaDevices.getUserMedia({audio: true});
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

    function changeAudioDestination() {
      const audioDestination = audioOutputSelect.value;
      attachSinkId(videoRemoteElem, audioDestination);
    };




    function processOfferForStereo(offer) {
        offer.sdp = offer.sdp.replace('useinbandfec=1', 'stereo=1; sprop-stereo=1; maxaveragebitrate=131072; cbr=1');
        return offer;
    };











    window.addEventListener('load', startup, false);
})();