import express from 'express';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {Server} from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const path = dirname(fileURLToPath(import.meta.url));

console.log(`starting server!`);

app.get('/', (req, res) => {
	res.sendFile(join(path, 'beacons.html'));
});

var beacons = [];
var beacon_idLen = 15;

var allowedText = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzαβψδεφγηξκλμπ;ρστθωςχυζ`;


var counter = 0;


io.on('connection', (socket) => {
	counter += 1;
	var userID = counter;
	console.log(`++user ${userID}++`);
	socket.emit(`ping`, userID);


	socket.on(`beacon`, (a) => {
		console.log(`public: `, a);
		addBeacon(a);
	});




	socket.on('disconnect', () => {
		console.log(`--user ${userID}--`);
	});
});

server.listen(3000, () => {
	console.log('server running at http://localhost:3000');
});







function generateID() {
	var str = "";
	for (var g=0; g<beacon_idLen; g++) {
		str += allowedText[Math.floor(Math.random() * allowedText.length)];
	}
	return str;
}

function addBeacon(serverBeaconObj) {
	var clientObj = {};
	if (!serverBeaconObj.id) {
		//it's a new object!
		clientObj = serverBeaconObj;

		clientObj.id = generateID();
		clientObj.password = hash(clientObj.password);

		beacons.push(clientObj);
	} else {
		//it'
	}

	io.emit(`beacon`, clientObj);
}

function removeBeacon(beaconID) {

}
