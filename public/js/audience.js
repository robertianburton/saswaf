(function() {

    var buttonVideoSizeSource = null;
    var buttonVideoSizePage = null;
    var buttonVideoSizeResponsive = null;
    var videoRemoteElem = null;
    var screenHostId = null;
    let makingOffer = false;

    function startup() {
        console.log("Screen JS Starting Up...");

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

        console.log("Socket ID: " + signaling.id);

        /*start();*/

        console.log("Screen JS Startup Complete.");
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
    pc.onicecandidate = (data) => {
        console.log("OnIceCandidate...");
        console.log(data);
        signaling.emit(
            "screenSignalFromAudience",
            {
                fromId: signaling.id,
                candidate: data.candidate
            }
        )
    };

    // let the "negotiationneeded" event trigger offer generation
    pc.onnegotiationneeded = async () => {
        console.log("onnegotiationneeded 1");
      try {
        console.log("onnegotiationneeded 2");
        makingOffer = true;
        await pc.setLocalDescription(await pc.createOffer());
        // send the offer to the other peer
        signaling.emit("screenSignalFromAudience",
        {
            fromId: signaling.id,
            desc: pc.localDescription
        });
        console.log("onnegotiationneeded 3");
      } catch (err) {
        console.error(err);
      } finally {
        makingOffer = false;
      }
    };

    async function start() {
      try {
        await pc.setLocalDescription(await pc.createOffer());
        // send the offer to the other peer
        signaling.emit("screenSignalFromAudience",
        {
            fromId: signaling.id,
            desc: pc.localDescription
        });
      } catch (err) {
        console.error(err);
      }
    };
        // once remote track media arrives, show it in remote video element
    pc.ontrack = (event) => {
      // don't set srcObject again if it is already set.
      if (videoRemoteElem.srcObject) return;
      videoRemoteElem.srcObject = event.streams[0];
    };

    signaling.on("screenSignalFromHost", async (data) => {
        console.log("DEBUG STEP 0");
        console.log(data.desc);
        console.log(data.candidate);
      try {
        if (data.desc) {
            console.log("DEBUG STEP 1");
          // if we get an offer, we need to reply with an answer
          if (data.desc.type === 'offer') {
            console.log("DEBUG STEP 2");
            await pc.setRemoteDescription(data.desc);
            console.log("DEBUG STEP 3");
            await pc.setLocalDescription(await pc.createAnswer());
            console.log("DEBUG STEP 4");
            signaling.emit("screenSignalFromAudience",{
                fromId: signaling.id,
                desc: pc.localDescription});
            console.log("DEBUG STEP 5");
          } else if (data.desc.type === 'answer') {
            console.log("DEBUG STEP 6");
            await pc.setRemoteDescription(data.desc);
            console.log("DEBUG STEP 7");
          } else {
            console.log('Unsupported SDP type.');
          }
        } else if (data.candidate) {
          console.log("DEBUG STEP 8");
          await pc.addIceCandidate(data.candidate);
          console.log("DEBUG STEP 9");
        }
      } catch (err) {
        console.error(err);
      }
    });




    window.addEventListener('load', startup, false);
})();