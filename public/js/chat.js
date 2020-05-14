
(function() {

    var counter = 0;
    var userNameElem = null;
    var socket = null;
    var chatLogElem = null;
    var chatTextBoxElem = null;
    var chatSubmitElem = null;
    let userName = "";

    function startup() {
        console.log("Chat JS Starting Up...");
        socket = io();
        
        userNameElem = document.getElementById('userNameElem');
        chatLogElem = document.getElementById('chatLogElem');
        chatTextBoxElem = document.getElementById('chatTextBoxElem');
        chatSubmitElem = document.getElementById('chatSubmitElem');

        newUserConnection();

        socket.on("new user", function(data) {
            userListChange(data);
            scroll();
        });

        socket.on("chat message", function(data) {
            addNewMessage(data);
            scroll();
        });

        chatSubmitElem.addEventListener('click', function(ev){
            ev.preventDefault();
            socket.emit("chat message", {
                message: chatTextBoxElem.value,
                sender: userName,
            });
            chatTextBoxElem.value="";
            chatTextBoxElem.focus();
        }, false);

        console.log("Chat JS Startup Complete.");
    };

    const newUserConnection = (user) => {
        userName = user || `User${Math.floor(Math.random() * 1000000)}`;
        socket.emit("new user", userName);
        console.log("Assigned Username: " + userName);
        userNameElem.innerHTML = userName;
    };

    const userListChange = (userNameList) => {
        chatLogElem.innerHTML += `<p class="m-0">`
        + new Date().toLocaleTimeString('en-GB')
        + ` <span class="font-weight-bold">Server:</span> User List Change! Users: ` 
        + userNameList.join(', ')
        + `</p>`;
    };

    const addNewMessage = (data) => {
        chatLogElem.innerHTML += `<p class="m-0">`
        + new Date().toLocaleTimeString('en-GB')
        + ` <span class="font-weight-bold">${data.sender}:</span> ${data.message}</p>`
    };

    function scroll() {
        $('#chatLogElem').scrollTop($('#chatLogElem')[0].scrollHeight)
    };
    
    window.addEventListener('load', startup, false);
})();