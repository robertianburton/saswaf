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
	.get('/screen', (req, res) => res.render('pages/screen'));

const server = app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socket(server);

const activeUsers = new Set();

io.on("connection", function (socket) {
  console.log("Made socket connection");

  socket.on("new user", function (data) {
  	socket.userId = data;
  	activeUsers.add(data);
  	io.emit("new user", [...activeUsers]);
  	console.log("New user. Added: " + data);
  });

  socket.on("chat message", function (data) {
  	io.emit("chat message", data);
  	console.log("New message from "+ data.sender);
  });

  socket.on("message", function (data) {
  	io.emit("message", data);
  	console.log("New generic message");
  });

  socket.on("disconnect", () => {
  	activeUsers.delete(socket.userId);
  	io.emit("user disconnected", socket.userId);
  })
});