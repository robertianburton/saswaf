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
        console.log("Audience JS Starting Up...");

        videoRemoteElem = document.getElementById('videoRemoteElem');
        videoLocalElem = document.getElementById('videoLocalElem');

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
            ev.preventDefault();
        }, false);

        console.log("Socket ID: " + signaling.id);

        start();

        console.log("Audience JS Startup Complete.");
    }



    // Mostly from https://www.html5rocks.com/en/tutorials/webrtc/basics/#simpleRTCPeerConnectionExample
    // handles JSON.stringify/parse
    const signaling = io();
    const constraints = {audio: true, video: true};
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
    const configurationC = {
        iceServers: [
            {
                urls: [ "stun:us-turn2.xirsys.com" ]
            },
            {   
                username: "k3IAtn2K1yMCrpypkP_CJCyEV7m3FHThFwcUnIxp_4i8-ZuFR4JQN0zqjllYFBXYAAAAAF7DZDF5YWtldHlTYXhlcw==",  
                credential: "6f541688-998b-11ea-8e17-0242ac140004",
                urls: [   
                    "turn:us-turn2.xirsys.com:80?transport=udp",    
                    "turn:us-turn2.xirsys.com:3478?transport=udp", 
                    "turn:us-turn2.xirsys.com:80?transport=tcp",     
                    "turn:us-turn2.xirsys.com:3478?transport=tcp", 
                    "turns:us-turn2.xirsys.com:443?transport=tcp",      
                    "turns:us-turn2.xirsys.com:5349?transport=tcp"
                ]
            }
        ]
    };
    const configuration = configurationA;
    

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

    // Mostly https://stackoverflow.com/questions/43978975/not-receiving-video-onicecandidate-is-not-executing
    async function start() {
        console.log("Start");
        checkPeerConnection();
        return pc.createOffer().then(function (offer) {
            return pc.setLocalDescription(offer);
        })
        .then(function () {
            signaling.emit("screenSignalFromEqual",{fromId: signaling.id,desc: pc.localDescription});
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
    }   

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
        stream.getTracks().forEach(function(track) {
          track.stop();
        });
        stream = null;
        pc.close();
        pc = new RTCPeerConnection(configuration);
        nowStreaming = 0;
    };
    /*signaling.on("screenSignalFromEqual", async (data) =>  {
        console.log("Debug Alan 07 " + (new Date().getTime()));
        console.log("Got something from another equal member.");
        console.log(data);
    });*/
    
    signaling.on("screenSignalFromEqual", async (data) =>  {
        if(!pc) {
            pc = new RTCPeerConnection(configuration);
            pc.onconnectionstatechange = onConnectionStateChange;
            pc.ontrack = onTrack;
            pc.onnegotiationneeded = onNegotiationNeeded;
            pc.onicecandidate = onIceCandidate;
        }
        console.log("Received from Equal. Printing data...");
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
            signaling.emit("screenSignalFromEqual",{
                fromId: signaling.id,
                desc: pc.localDescription});
          }
        } else if (data.candidate) {
            await pc.addIceCandidate(data.candidate);
        };
        console.log("Peer Connection...");
        console.log(pc);
        if(nowStreaming===0) {
            nowStreaming = 1;
            stream = await navigator.mediaDevices.getDisplayMedia(constraints);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
            videoLocalElem.srcObject = stream;
            nowStreaming = 2;
        };
      } catch(err) {
        console.error(err);
      }
    });

    signaling.on("screenSignalFromTwo", async (data) =>  {
        console.log("Received from Equal. Printing data...");
        console.log(data);
      try {
        if (data.desc) {

          const offerCollision = (data.desc.type == "offer") &&
                                 (makingOffer || pc.signalingState != "stable");

          ignoreOffer = !polite && offerCollision;
          if (ignoreOffer) {
            return;
          }

          await pc.setRemoteDescription(data.desc);
          if (data.desc.type =="offer") {
            await pc.setLocalDescription();
            signaling.emit("screenSignalFromEqual",{
                fromId: signaling.id,
                desc: pc.localDescription});
          }
          console.log("Doing Offer Stuff");
        } else if (data.candidate) {
          try {
            await pc.addIceCandidate(data.candidate);
          } catch(err) {
            if (!ignoreOffer) {
              throw err;
            }
          }
        }
        console.log("239 Peer Connection...");
        console.log(pc);
        if(nowStreaming===0) {
            nowStreaming = 1;
            stream = await navigator.mediaDevices.getDisplayMedia(constraints);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
            videoLocalElem.srcObject = stream;
            nowStreaming = 2;
        };
      } catch(err) {
        console.error(err);
      }
    });

    window.addEventListener('load', startup, false);
})();