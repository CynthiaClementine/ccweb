
var socket = io();
var clientID;

var beacons = [];
var updateLoop = window.setInterval(update, 1000);

//message from the server
socket.on("h", (a) => {
	alert(a);
});

socket.on(`ping`, (id) => {
	clientID = id;
});

socket.on(`beacon`, (beaconObj) => {
	//recieve a new beacon
	recieveBeacon(beaconObj);
});


//message to the server
function sendTest() {
	socket.emit(`private`, "hi");
}

function UTS() {
	return Date.now();
}

//just do local time. thanks javascript
function time(unixTimeStamp) {
	var obj = new Date(unixTimeStamp);
	return (""+obj.getHours()).padStart(2, "0") + ":" + (""+obj.getMinutes()).padStart(2, "0");
}



function createBeacon(x, y, color, text, timeStart, timeEnd, username, password) {
	var beacObj = {
		x: x,
		y: y,
		color: color,
		text: text,
		timeRange: [timeStart ?? UTS(), timeEnd ?? (UTS() + (1000 * 60 * 60))],
	};

	if (username) {
		beacObj.addedBy = username;
	}
	if (password) {
		beacObj.password = hash(password);
	}

	//send the beacon to the server
	socket.emit(`beacon`, beacObj);

}

function recieveBeacon(beaconObj) {
	//check if the object is already in the beacons list
	var bObj = getBeacon(beaconObj.id);

	if (bObj) {
		//if so, update info
		Object.keys(beaconObj).forEach(k => {
			bObj[k] = beaconObj[k];
		});

		//refresh the document
		doc_removeBeacon(bObj.id);
		doc_addBeacon(bObj.id);
		return;
	}

	//if it's not, add it
	beacons.push(beaconObj);
	doc_addBeacon(beaconObj);
	
}



function getBeacon(id) {
	for ()
}

//
function doc_addBeacon(id) {
	
}

function doc_removeBeacon(id) {
	
}

function update() {
	//delete any expired beacons
	for (var b=0; b<beacons.length; b++) {

	}
}