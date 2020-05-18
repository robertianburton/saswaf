(function() {

    var buttonVideoSizeSource = null;
    var buttonVideoSizePage = null;
    var buttonVideoSizeResponsive = null;
    var videoRemoteElem = null;
    var screenHostId = null;
    let makingOffer = false;
    let ignoreOffer = false;
    let polite = true;

    function startup() {
        console.log("Audience JS Starting Up...");

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

        start();

        console.log("Audience JS Startup Complete.");
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
        console.log("start 1");
      try {
        console.log("start 2");
        makingOffer = true;
        await pc.setLocalDescription(await pc.createOffer());
        // send the offer to the other peer
        console.log("Debug Alan 05 " + getTime());
        signaling.emit("screenSignalFromAudience",
        {
            fromId: signaling.id,
            desc: pc.localDescription
        });
        console.log("start 3");
        console.log("Debug Alan 01 " + getTime());
      } catch (err) {
        console.error(err);
      } finally {
        makingOffer = false;
      }
    };
        // once remote track media arrives, show it in remote video element
    pc.ontrack = (event) => {
      // don't set srcObject again if it is already set.
      if (videoRemoteElem.srcObject) return;
      videoRemoteElem.srcObject = event.streams[0];
    };


    signaling.on("screenSignalFromHost", async (data) =>  {
        console.log("Received from Host. Printing data...");
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
            signaling.emit("screenSignalFromAudience",{
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
        console.log("Peer Connection...");
        console.log(pc);
      } catch(err) {
        console.error(err);
      }
    });



    window.addEventListener('load', startup, false);
})();