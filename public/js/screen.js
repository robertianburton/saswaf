(function() {

    var startbutton = null;
    var buttonVideoPrepare = null;
    var buttonVideoStartShare = null;
    var buttonVideoStartShareTwo = null;
    var counter = 0;
    var videoLocalElem = null;
    var stream = null;
    var connections= [];

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
    const configuration = {
        iceServers: [{urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.l.google.com:19302?transport=udp',
    ]}]};
    const pc = new RTCPeerConnection(configuration);

    // send any ice candidates to the other peer
    pc.onicecandidate = (data) => {
        console.log("onicecandidate trigger");
        signaling.emit("screenSignalFromHost",{candidate: data.candidate});
    };

    // let the "negotiationneeded" event trigger offer generation
    pc.onnegotiationneeded = async () => {
        console.log("onnegotiationneeded trigger");
      try {
        await pc.setLocalDescription(await pc.createOffer());
        // send the offer to the other peer
        signaling.emit("screenSignalFromHost",{desc: pc.localDescription});
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
      try {
        // get local stream, show it in self-view and add it to be sent
        Array.prototype.forEach.call(connections, (connection) => {
            stream.getTracks().forEach((track) => connection.addTrack(track, stream));
        });
        
      } catch (err) {
        console.error(err);
      }
    };


    signaling.on("screenSignalFromAudience", async (data) => {
        console.log("Receiving Audience Signal. Printing Data...");
        console.log(data);

        if(!connections[data.fromId]) {
            connections[data.fromId] = new RTCPeerConnection(configuration);

            connections[data.fromId].onicecandidate = (data) => {
                console.log("onicecandidate trigger");
                signaling.emit("screenSignalFromHost",{
                    toId: data.fromId,
                    candidate: data.candidate});
            };

            connections[data.fromId].onnegotiationneeded = async () => {
                console.log("onnegotiationneeded trigger");
                let makingOffer = false;
              try {
                makingOffer = true;
                await connections[data.fromId].setLocalDescription(await connections[data.fromId].createOffer());
                // send the offer to the other peer
                signaling.emit("screenSignalFromHost",{
                    toId: data.fromId,
                    desc: connections[data.fromId].localDescription});
              } catch (err) {
                console.error(err);
              } finally {
                makingOffer = false;
              }
            };

            console.log("Added connection to Socket ID: " + data.fromId);
            console.log(connections[data.fromId]);
        };

      try {
        if (data.desc) {
          // if we get an offer, we need to reply with an answer
          if (data.desc.type === 'offer') {
            console.log("Processing Offer");
            await connections[data.fromId].setRemoteDescription(data.desc);
            console.log("Processing Offer 2");
            await connections[data.fromId].setLocalDescription(await pc.createAnswer());
            console.log("Processing Offer 3");
            signaling.emit("screenSignalFromHost",{
                toId: data.fromId,
                desc: connections[data.fromId].localDescription});
            console.log("Processing Offer 4");
          } else if (data.desc.type === 'answer') {
            console.log("Processing Answer");
            await connections[data.fromId].setRemoteDescription(data.desc);
          } else {
            console.log('Unsupported SDP type.');
          }
        } else if (data.candidate) {
          await connections[data.fromId].addIceCandidate(data.candidate);
        }
      } catch (err) {
        console.error(err);
      };

    });




    window.addEventListener('load', startup, false);
})();