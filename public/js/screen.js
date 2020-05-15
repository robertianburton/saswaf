(function() {

    var videoElem = null;
    var startbutton = null;
    var buttonVideoStart = null;
    var buttonVideoEnd = null;
    var buttonVideoSizeSource = null;
    var buttonVideoSizePage = null;
    var buttonVideoSizeResponsive = null;
    var counter = 0;
    var videoElem = null;

    function startup() {
        console.log("Screen JS Starting Up...");

        videoElem = document.getElementById('videoElem');

        buttonVideoStart = document.getElementById('buttonVideoStart');
        buttonVideoStart.addEventListener('click', function(ev){
            startCapture();
            ev.preventDefault();
        }, false);

        buttonVideoEnd = document.getElementById('buttonVideoEnd');
        buttonVideoEnd.addEventListener('click', function(ev){
            stopCapture();
            ev.preventDefault();
        }, false);

        buttonVideoSizeSource = document.getElementById('buttonVideoSizeSource');
        buttonVideoSizeSource.addEventListener('click', function(ev){
            videoElem.style.width = "auto";
            videoElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        buttonVideoSizeResponsive = document.getElementById('buttonVideoSizeResponsive');
        buttonVideoSizeResponsive.addEventListener('click', function(ev){
            videoElem.style.width = "100%";

            ev.preventDefault();
        }, false);

        buttonVideoSizePage = document.getElementById('buttonVideoSizePage');
        buttonVideoSizePage.addEventListener('click', function(ev){
            videoElem.style.width = window.innerWidth;

            var docH = $( document ).height();
            var vidH = $('#videoElem').height();
            var videoScale = ($('#videoElem').width() / $('#videoElem').height());
            var topH = docH-vidH;
            var workableH = Math.floor((window.innerHeight-topH-0)*videoScale);

            videoElem.style.width = workableH + "px";
            videoElem.scrollIntoView();
            ev.preventDefault();
        }, false);

        console.log("Screen JS Startup Complete.");
    }


    async function startCapture() {
        let captureStream = null;

        try {
            captureStream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: true});
            videoElem.srcObject = captureStream;
        } catch(err) {
            console.error("Error: " + err);
        }
    }

    async function stopCapture(ev) {
        let tracks = videoElem.srcObject.getTracks();

        tracks.forEach(track => track.stop());
        captureStream = null;
        videoElem.srcObject = null;
    }




    // Mostly from https://www.html5rocks.com/en/tutorials/webrtc/basics/#simpleRTCPeerConnectionExample
    // handles JSON.stringify/parse
    const signaling = io();
    const constraints = {audio: true, video: true};
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

    signaling.on("message", async ({desc, candidate}) => {
      try {
        if (desc) {
          // if we get an offer, we need to reply with an answer
          if (desc.type === 'offer') {
            await pc.setRemoteDescription(desc);
            const stream =
              await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach((track) =>
              pc.addTrack(track, stream));
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