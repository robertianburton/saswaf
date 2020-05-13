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
        console.log("Soundcheck JS Starting Up...");

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

        console.log("Soundcheck JS Startup Complete.");
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

    window.addEventListener('load', startup, false);
})();