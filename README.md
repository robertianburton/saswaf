# saswaf
Share a Screen With a Friend

Need to quickly share your screen with someone, complete with high-quality desktop audio support? You've come to the right place!

Too many screensharing apps treat video as second class content in favor of bandwidth savings. Some platforms are great for broadcasting your screen out to the world, but require you to download, install, and configure software to set it all up. Even if you know how, do you really want to have to start that up every time you want to quickly share your screen?

Saswaf is your solution. Let the video calling or chat apps handle the conversation, and saswaf can serve your guests the smooth, high quality video they deserve. Saswaf screen sharing is encrpyted using Datagram Transport Layer Security (DTLS) and there is no server in the middle opening your content. 

Get Started
1. Go to the host tab
2. Press Start
3. Select a screen (and enable desktop audio sharing, if desired)
4. Press okay.
5. Share the link with whoever you'd like to!

Saswaf's front end has just 3 dependencies: jQuery, popper.js, and Bootstrap!
The screen and audio sharing is built on the WebRTC library.
To promote more people learning about and understanding WebRTC, the javascript for both the Host page and Watch page is self contained - no confusing shared files or abstractions. See how a viewer arrives at a page, obtains a STUN/TURN credential, messages a host, and receives media all on one page in a functional layout.