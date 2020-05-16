(function() {

    var startbutton = null;
    var buttonVideoStartShare = null;
    var buttonVideoStartShareTwo = null;
    var counter = 0;
    var videoLocalElem = null;

    function startup() {
        console.log("Screen JS Starting Up...");

        videoLocalElem = document.getElementById('videoLocalElem');

        buttonVideoStartShare = document.getElementById('buttonVideoStartShare');
        buttonVideoStartShare.addEventListener('click', function(ev){
            start();
            ev.preventDefault();
        }, false);

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
    pc.onicecandidate = ({candidate}) => signaling.emit("message",{candidate});

    // let the "negotiationneeded" event trigger offer generation
    pc.onnegotiationneeded = async () => {
      try {
        await pc.setLocalDescription(await pc.createOffer());
        // send the offer to the other peer
        signaling.emit("message",{desc: pc.localDescription});
      } catch (err) {
        console.error(err);
      }
    };

    // call start() to initiate
    async function start() {
      try {
        // get local stream, show it in self-view and add it to be sent
        const stream =
          await navigator.mediaDevices.getDisplayMedia(constraints);
        stream.getTracks().forEach((track) =>
          pc.addTrack(track, stream));
        videoLocalElem.srcObject = stream;
      } catch (err) {
        console.error(err);
      }
    };


    signaling.on("message", async ({desc, candidate}) => {
        console.log(desc);
        console.log(candidate);
      try {
        if (desc) {
          // if we get an offer, we need to reply with an answer
          if (desc.type === 'offer') {
            await pc.setRemoteDescription(desc);
            await pc.setLocalDescription(await pc.createAnswer());
            signaling.emit("message",{desc: pc.localDescription});
          } else if (desc.type === 'answer') {
            await pc.setRemoteDescription(desc);
          } else {
            console.log('Unsupported SDP type.');
          }
        } else if (candidate) {
          await pc.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error(err);
      }
    });




    window.addEventListener('load', startup, false);
})();