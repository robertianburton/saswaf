import adapter from 'webrtc-adapter';
const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;

express()
	.use(express.static(path.join(__dirname, 'public')))
	.set('views', path.join(__dirname, 'views'))
	.set('view engine', 'ejs')
	.get('/', (req, res) => res.render('pages/index'))
	.get('/soundcheck', (req, res) => res.render('pages/soundcheck'))
	.get('/chat', (req, res) => res.render('pages/chat'))
	.listen(PORT, () => console.log(`Listening on ${ PORT }`))