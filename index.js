const express = require('express');
const path = require('path');
const socket = require("socket.io");
const PORT = process.env.PORT || 5000;

const app = express()
	.use(express.static(path.join(__dirname, 'public')))
	.set('views', path.join(__dirname, 'views'))
	.set('view engine', 'ejs')
	.get('/', (req, res) => res.render('pages/index'))
	.get('/soundcheck', (req, res) => res.render('pages/soundcheck'))
	.get('/chat', (req, res) => res.render('pages/chat'))
	.get('/equal', (req, res) => res.render('pages/equal'))
	.get('/screen', (req, res) => res.render('pages/screen'))
	.get('/audience', (req, res) => res.render('pages/audience'))
	.get('/host', (req, res) => res.render('pages/host'))
	.get('/watch', (req, res) => res.render('pages/watch'));

const server = app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socket(server);

const activeChatUsers = new Set();

io.on("connection", function (socket) {
  console.log("Made socket connection: " + socket.id);

  socket.on("new user", function (data) {
  	socket.userId = data;
  	activeChatUsers.add(data);
  	io.emit("new user", [...activeChatUsers]);
  	console.log("New user. Added: " + data);
  });

  socket.on("chat message", function (data) {
  	io.emit("chat message", data);
  	console.log("New message from "+ data.sender);
  });

  socket.on("screenSignalFromScreen", (data) => {
  	io.to(data.toId).emit('screenSignalFromScreen', data)
  	console.log("New Screen Signal From Host: " + socket.id);
  });

  socket.on("screenSignalFromAudience", function (data) {
  	socket.broadcast.emit("screenSignalFromAudience", data);
  	console.log("New Screen Signal From Audience: " + socket.id);
  });

  socket.on("screenSignalFromEqual", (data) => {
  	socket.broadcast.emit("screenSignalFromEqual", data);
  	console.log("New Screen Signal From Equal: " + socket.id);
  });

  socket.on("disconnecting", (reason) => {
  	activeChatUsers.delete(socket.userId);
  	io.emit("user disconnecting", socket.userId);
  	console.log("User disconnecting: " + socket.id + " because " + reason);
  });
});