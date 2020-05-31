(function() {

    var startbutton = null;
    var buttonVideoPrepare = null;
    var buttonVideoStartShare = null;
    var buttonVideoStartShareTwo = null;
    var counter = 0;
    var videoLocalElem = null;
    var stream = null;
    var connections= [];
    let polite = false;
    var tracks = [];
    var sharing = false;
    let makingOffer = false;

    function startup() {
        console.log("Screen JS Starting Up...");

        videoLocalElem = document.getElementById('videoLocalElem');

        buttonVideoStartShare = document.getElementById('buttonVideoStartShare');
        buttonVideoStartShare.addEventListener('click', function(ev){
            start();
            ev.preventDefault();
        }, false);

        buttonVideoPrepare = document.getElementById('buttonVideoPrepare');
        buttonVideoPrepare.addEventListener('click', function(ev){
            prepareVideo();
            ev.preventDefault();
        }, false);

        console.log("Socket ID: " + signaling.id);
        console.log("Screen JS Startup Complete.");
    }

    // Mostly from https://www.html5rocks.com/en/tutorials/webrtc/basics/#simpleRTCPeerConnectionExample
    // handles JSON.stringify/parse
    const signaling = io();
    const constraints = {video: true,
                 audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    googAutoGainControl: false,
                    noiseSuppression: false,
                    sampleRate: 44100,
                    sampleSize: 16
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
    const pc = new RTCPeerConnection(configuration);

    // send any ice candidates to the other peer
    pc.onicecandidate = (data) => {
        console.log("onicecandidate trigger");
        signaling.emit("screenSignalFromScreen",{candidate: data.candidate});
    };

    // let the "negotiationneeded" event trigger offer generation
    pc.onnegotiationneeded = async () => {
        console.log("onnegotiationneeded trigger");
      try {
        await pc.setLocalDescription(await pc.createOffer());
        // send the offer to the other peer
        signaling.emit("screenSignalFromScreen",{desc: pc.localDescription});
      } catch (err) {
        console.error(err);
      }
    };

    async function prepareVideo() {
        try {
        // get local stream, show it in self-view and add it to be sent
        stream = await navigator.mediaDevices.getDisplayMedia(constraints);
        videoLocalElem.srcObject = stream;
        
        } catch (err) {
            console.error(err);
          }
    };

    // call start() to initiate
    async function start() {

        console.log("Starting Video Share... ");
      try {
        // get local stream, show it in self-view and add it to be sent
        console.log(connections);

        /*for (var key in connections) {

            console.log("Working on this connection: ");
            console.log(connections[key]);
            var senders = connections[key].getSenders();
            try {
                senders.forEach((sender) => {connections[key].removeTrack(sender)});
            } catch (err) {
                console.error(err)
            }
            connections[key].close();
        };*/

        for (var key in connections) {
            console.log("Working on this connection: ");
            console.log(connections[key]);
            try {
                stream.getTracks().forEach((track) => connections[key].addTrack(track, stream));
        } catch (err) {
            console.error(err)
        }
        };
        console.log("Printing Tracks");
        console.log(tracks);
      } catch (err) {
        console.error(err);
      }
      sharing = true;
    };

    async function handleOnicecandidate(data) {
        console.log("onicecandidate trigger");
        signaling.emit("screenSignalFromScreen",{
        toId: data.fromId,
        candidate: data.candidate});
    }

    async function handleOnnegotiationneeded() {
        console.log("onnegotiationneeded trigger");
        makingOffer = false;
        try {
            makingOffer = true;
            await connections[data.fromId].setLocalDescription(await connections[data.fromId].createOffer());
            // send the offer to the other peer
            signaling.emit("screenSignalFromScreen",{
                toId: data.fromId,
                desc: connections[data.fromId].localDescription});
        } catch (err) {
            console.error(err);
        } finally {
            makingOffer = false;
        }
    }

    signaling.on("screenSignalFromAudience", async (data) => {
        console.log("Receiving Audience Signal. Printing Data...");
        console.log(data);

        if(!connections[data.fromId]) {
            connections[data.fromId] = new RTCPeerConnection(configuration);

            connections[data.fromId].onicecandidate = handleOnicecandidate;

            connections[data.fromId].onnegotiationneeded = handleOnnegotiationneeded;

              try {
                makingOffer = true;
                await connections[data.fromId].setLocalDescription(await pc.createOffer());
                // send the offer to the other peer
                signaling.emit("screenSignalFromScreen",
                {
                    fromId: signaling.id,
                    toId: data.fromId,
                    desc: connections[data.fromId].localDescription
                });
              } catch (err) {
                console.error(err);
              } finally {
                makingOffer = false;
              };

            console.log("Added connection to Socket ID: " + data.fromId);
            console.log(connections[data.fromId]);
        };

        try {
            if (data.desc) {
                  const offerCollision = (data.desc.type == "offer") &&
                                         (makingOffer || connections[data.fromId].signalingState != "stable");
                  ignoreOffer = !polite && offerCollision;
                  if (ignoreOffer) {
                    return;
                  }
                  await connections[data.fromId].setRemoteDescription(data.desc);
                  if (data.desc.type =="offer") {
                    await pc.setLocalDescription();
                    signaling.emit("screenSignalFromScreen",{
                        fromId: signaling.id,
                        toId: data.fromId,
                        desc: connections[data.fromId].localDescription});
                  }
                  if(!connections[data.fromId].saswafIsSendingToThis) {
                    stream.getTracks().forEach((track) => connections[data.fromId].addTrack(track, stream));
                    connections[data.fromId].saswafIsSendingToThis = true
                    }
                  console.log("Doing Offer Stuff");
            } else if (data.candidate) {
                  try {
                    await connections[data.fromId].addIceCandidate(data.candidate);
                  } catch(err) {
                    if (!ignoreOffer) {
                      console.error(err);
                    }
                  }
            }
            console.log("Peer Connection...");
            console.log(connections[data.fromId]);
        } catch(err) {
            console.error(err);
        }

    });




    window.addEventListener('load', startup, false);
})();