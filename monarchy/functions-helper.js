


/*
INDEX




*/

function endGame() {
	//switch to ending state
	setMusic("end");
	audio_bgChannel.current = undefined;
	game_mainLoop = runEnding;
}

function localStorage_read() {
	//turn the things in the messages section of local storage into a string that can be read into gameFlags
	var toRead;
	try {
		toRead = window.localStorage["monarch_data"];
	} catch(error) {
		console.log(`ERROR: could not access local storage. Something has gone very seriously wrong.`);
		if (error.name == "NS_ERROR_FILE_CORRUPTED") {
			alert(`Hi! Something has gone terribly wrong. But don't panic. 
Most likely the local browser storage has been corrupted. 
You can fix it by clearing your browser history, including cookies, cache, and local website data.`);
		}
	}

	try {
		toRead = JSON.parse(toRead);
	} catch (error) {
		console.log(`ERROR: could not parse ${toRead}, using default`);
		return;
	}

	//make sure it's somewhat safe, and then make it into the game flags
	if (typeof(toRead) == "object") {
		data_persistent = toRead;
	} else {
		console.log("ERROR: invalid type specified in save data, using default");
		return;
	}

	//change the world based on save data
	prepareWorld();

	//update settings
	console.log("loaded save");
}

function prepareWorld() {
	var depe = data_persistent;
	//x, y, and m are easy, just move the player and set music
	player.x = depe.x;
	player.y = depe.y;
	player.respawnPoint = [player.x, player.y];
	player.magicLearned = depe.magic;
	player.changeWeaponTo(depe.weapon);
	var chocoCount = depe.chocos[0] + depe.chocos[1] + depe.chocos[2]
	player.chocolate = chocoCount;
	setMusic(depe.m);

	//volumes
	audio_bgChannel.volume = depe.vols[0];
	audio_sfxChannel.volume = depe.vols[1];

	//chocolates
	chocolateConvos[Math.min(depe.chocos[0] + depe.chocos[1], 1)][0] = true;
	if (depe.chocos[0]) {
		getEntityFromID('choco1').DELETE = true;
	}
	if (depe.chocos[1]) {
		getEntityFromID('choco2').DELETE = true;
	}
	if (depe.chocos[2] > 0) {
		getEntityFromID('chocolateBin').conversations[depe.chocos[2]][0] = true;
	}

	//lord and witch shenanigans
	//lord
	if (depe.weapon > 0) {
		lockWitchDoor(1);
		getEntityFromID('lordStickTop').textureActive.frame = 1;
		getEntityFromID('lordStickMiddle').textureActive.frame = 1;
		getEntityFromID('lord').conversations[1][0] = true;
		if (depe.pastLord) {
			getEntityFromID('lord').conversations[3][0] = true;
		}
	}

	//remove the sword
	if (depe.weapon > 1) {
		getEntityFromID("sword").DELETE = true;
	}

	//witch starting
	if (depe.magic) {
		getEntityFromID('spellGiver').conversations[1][0] = true;
		lockWitchDoor(1);
		lockLordDoor(1);
	}

	//boss progression
	//delete the guards and lower the gate
	if (depe.boss > 0) {
		if (depe.magic == 1) {
			getEntityFromID('guard1').onKill();
		}
		getEntityFromID('guard1').DELETE = true;
		getEntityFromID('guard2').DELETE = true;
		unlockCastleGate('bridgeLever', 'bridgeGate');
	}
	//setup queen for knights fight
	if (depe.boss == 1.5) {
		getEntityFromID('knight2').conversations[1][0] = true;
		getEntityFromID('queen').conversations[1][0] = true;
		getEntityFromID('queen').x = 1e101;
	}
	//delete boss room entities
	if (depe.boss >= 2) {
		getEntityFromID('knight1').DELETE = true;
		getEntityFromID('knight2').DELETE = true;
		getEntityFromID('knight3').DELETE = true;
		getEntityFromID('queen').DELETE = true;
		lockCastleBoss(0);
	}
}


function localStorage_write() {
	console.log('writing');
	var depe = data_persistent;
	//some variables need to be updated before pushing
	depe.x = player.x;
	depe.y = player.y;
	depe.weapon = player.weapon;
	depe.magic = +player.magicLearned;

	Object.keys(data_audio).forEach(s => {
		if (data_audio[s] == audio_bgChannel.current) {
			depe.m = s;
		}
	});


	window.localStorage["monarch_data"] = JSON.stringify(depe);
}

function localStorage_writeEnding(endValue) {
	data_persistent.ends = data_persistent.ends | endValue;
	window.localStorage["monarch_data"] = JSON.stringify(data_persistent);
}

function setMusic(musicStr) {
	audio_bgChannel.target = data_audio[musicStr];
}

function lockWitchDoor(lock) {
	setWorldData(44, 102, lock); 
	setWorldData(44.5, 102, lock);
}

function lockLordDoor(lock) {
	setWorldData(30, 18.5, lock);
	setWorldData(30.5, 18.5, lock);
	setWorldData(31, 18.5, lock);
	setWorldData(31.5, 18.5, lock);
}

function unlockCastleGate(leverID, gateID) {
	getEntityFromID(leverID).textureActive.frame = 1;
	getEntityFromID(gateID).changeStateTo(0);
}

function lockCastleGate(leverID, gateID) {
	getEntityFromID(leverID).textureActive.frame = 0;
	getEntityFromID(gateID).changeStateTo(1);
}

function putWitchOutside() {
	getEntityFromID("spellGiver").x = 43.5;
	getEntityFromID("spellGiver").y = 101.5;
	getEntityFromID("spellGiver").a = -1.57;
}

function lockCastleBoss(lock) {
	var arr = [[130.5, 8], [130.5, 8.5], [130.5, 9], [130.5, 9.5],
				[130.5, 22], [130.5, 22.5], [130.5, 23], [130.5, 23.5]];

	arr.forEach(g => {
		setWorldData(g[0], g[1], lock);
	});
}


function drawCircle(x, y, r, color) {
	ctx.beginPath();
	ctx.fillStyle = color;
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}


function enableSpaceOrbs() {
	for (var h=0; h<world_entities.length; h++) {
		if (world_entities[h].id == 'spaceOrb') {
			world_entities[h].opacityTarget = 0.5;
		}
	}
}

function disableSpaceOrbs() {
	for (var h=0; h<world_entities.length; h++) {
		if (world_entities[h].id == 'spaceOrb') {
			world_entities[h].opacityTarget = 0;
		}
	}
}



function getImage(url) {
	var image = new Image();
	image.src = url;
	return image;
}

/**
 * Given some conversation text and a time, returns the portion of the text that will be displayed at that time.
 * For example, ("apples\tare great!", 9) would return "apples"
 * @param {String} text The text to parse
 * @param {Integer} time The time at which to parse the text at
 */
function getTextAtTime(text, time) {
	//if it's a control character ignore it
	if (text[0] == ">") {
		text = text.slice(1);
	}
	//walk through text
	var finalStr = "";
	var tInc = 1 / text_charsPerTick;
	var tracker = 0;
	while (time > 0 && tracker < text.length) {
		switch(text[tracker]) {
			case "\n":
				//newlines cost 0 characters
				finalStr += "\n";
				break;
			case "\t":
				//tabs cost many characters and don't appear in the final text (they're just for temporal spacing)
				time -= tInc * text_tabsCountFor;
				break;
			default:
				finalStr += text[tracker];
				time -= tInc;
				break;
		}
		tracker += 1;
	}
	return finalStr;
}

//given an ID, returns the entity that the ID belongs to
function getEntityFromID(id) {
	if (id == "player") {
		return player;
	}

	for (var h=0; h<entities.length; h++) {
		if (entities[h].id == id) {
			return entities[h];
		}
	}
}

//moves the player out of a circle
function circleRepelPlayer(circleX, circleY, circleR) {
	circleRepel(player, circleX, circleY, circleR);
}

function circleRepel(entity, circleX, circleY, circleR) {
	//helper relative variables
	var relPX = entity.x - circleX;
	var relPY = entity.y - circleY;
	var pDist;

	if (Math.abs(relPX) < circleR && Math.abs(relPY) < circleR) {
		//try to keep player circleR units away
		pDist = Math.hypot(relPX, relPY);
		if (pDist < circleR) {
			relPX = relPX / pDist * circleR;
			relPY = relPY / pDist * circleR;

			entity.x = circleX + relPX;
			entity.y = circleY + relPY;
		}
	}
}

/**
 * gives the ID of the surface at the specified coordinates.
 * For example, getWorldData(3.4, 9.2) could return 1.
 * Returns 0 as a default.
 * @param {Number} x x-coordinate
 * @param {Number} y y-coordinate
 */
function getWorldData(x, y) {
	var searchArr;
	if (x >= 0) {
		searchArr = (y >= 0) ? world_collision_pp : world_collision_pm;
	} else {
		searchArr = (y >= 0) ? world_collision_mp : world_collision_mm;
	}

	//actually find the data
	y = Math.floor(2 * Math.abs(y));
	x = Math.floor(2 * Math.abs(x));

	//avoid errors via undefined squares
	if (searchArr[y] == undefined) {
		return 0;
	}
	return searchArr[y][x] ?? 0;

}

function setWorldData(x, y, value) {
	var searchArr;
	if (x >= 0) {
		searchArr = (y >= 0) ? world_collision_pp : world_collision_pm;
	} else {
		searchArr = (y >= 0) ? world_collision_mp : world_collision_mm;
	}

	y = Math.floor(2 * Math.abs(y));
	x = Math.floor(2 * Math.abs(x));

	if (searchArr[y] == undefined) {
		searchArr[y] = [];
	}
	searchArr[y][x] = value;
}


function importWorld(data) {
	//split the data by the vertical bars
	var initialSplit = data.split("|");

	//parse each tag
	initialSplit.forEach(v => {
		//first two items declare quadrant, second two declare size, fifth one declares data
		var tag = v.split("~");
		if (tag[4] == "") {
			return;
		}
		var results = importQuadrant(+tag[2], +tag[3], tag[4]);

		//this is terrible but I don't know how else I could do it and get around weird reference behavior
		if (tag[0] == "+") {
			if (tag[1] == "+") {
				world_collision_pp = results;
			} else {
				world_collision_pm = results;
			}
		} else {
			if (tag[1] == "+") {
				world_collision_mp = results;
			} else {
				world_collision_mm = results;
			}
		}
	});
}

function importQuadrant(xSize, ySize, data) {
	//make sure it's unstarrified
	data = unstarrify(data);

	//construct the array
	var quad = [];
	for (var y=ySize; y>=0; y--) {
		quad[y] = [];
	}

	//convert the data to nombers
	var val;
	for (var c=0; c<data.length; c++) {
		val = base64_inv[data[c]];
		quad[Math.floor((2*c) / xSize)][(2*c) % xSize] = Math.floor(val / 8);
		quad[Math.floor((2*c+1) / xSize)][(2*c+1) % xSize] = val % 8;
	}

	return quad;
}


//takes an array (number -> value) and converts it into an object (value -> number)
function invertList(list) {
	var obj = {};
	
	for (var s=0; s<list.length; s++) {
		obj[list[s]] = s;
	}
	
	return obj;
}

/**
 * Says whether a bounding box is on the screen
 * @param {*} x left world coordinate of the bounding box
 * @param {*} y top world coordinate of the bounding box
 * @param {*} w width of the box, in world units
 * @param {*} h height of the box, in world units
 */
function isOnScreen(x, y, w, h) {
	return !(x + w < camera.cornerUL[0] || x > camera.cornerDR[0] || y + h < camera.cornerUL[1] || y > camera.cornerDR[1]);
}

function exportWorld() {
	var finalStr = "";
	finalStr += "+~+~" + exportQuadrant(world_collision_pp) + "|";
	finalStr += "+~-~" + exportQuadrant(world_collision_pm) + "|";
	finalStr += "-~+~" + exportQuadrant(world_collision_mp) + "|";
	finalStr += "-~-~" + exportQuadrant(world_collision_mm);
	//world_collision_pp
	return finalStr;
}

function exportQuadrant(quadrantData) {
	//calculate dimensions
	var ySize = quadrantData.length;
	var xSize = 0;
	//using a for loop so that I can make sure all the rows have a potential data spot
	//also go to one row after what's necessary to prevent the counter from going overboard (c, c+1)
	for (var y=0; y<=ySize; y++) {
		if (quadrantData[y] == undefined) {
			quadrantData[y] = [];
		}
		xSize = Math.max(xSize, quadrantData[y].length);
	}

	var savedStr = "";

	//using a counter to wrap around ends of lines
	var value;
	var eightsPlace;
	var onesPlace;
	for (var c=0; c<xSize*ySize; c+=2) {
		eightsPlace = quadrantData[Math.floor(c / xSize)][c % xSize];
		onesPlace = quadrantData[Math.floor((c+1) / xSize)][(c+1) % xSize];
		value = 8 * (eightsPlace ?? 0) + (onesPlace ?? 0);
		savedStr += base64[value];
	}

	return  `${xSize}~${ySize}~${starrify(savedStr)}`;
}

function exportEditorPolygon() {
	return JSON.stringify(editor_polyPoints.map((a) => {
		return [+(a[0].toFixed(1)), +(a[1].toFixed(1))];
	}));
}

function reset() {
	//reset all data except for ends
	if (confirm(`Are you sure you want to reset? This will erase your progress.`)) {
		var endStorage = data_persistent.ends;
		data_persistent = data_persistentDefaults;
		data_persistent.ends = endStorage;
		window.localStorage["monarch_data"] = JSON.stringify(data_persistent);
		window.location.reload();
	}


}

function trueReset() {
	if (confirm(`Are you sure you want to perform a True Reset? This will erase all data.`)) {
		//expunge all data
		window.localStorage["monarch_data"] = undefined;
		window.location.reload();
	}
}



function screenToSpace(x, y) {
	return [
		(x - (canvas.width / 2)) / camera.scale + camera.x,
		(y - (canvas.height / 2)) / camera.scale + camera.y,
	]
}

function spaceToScreen(x, y) {
	return [
		camera.scale * (x - camera.x) + (canvas.width / 2),
		camera.scale * (y - camera.y) + (canvas.height / 2)
	]
}


function spliceIn(string, charStart, string2) {
	return string.slice(0, charStart) + string2 + string.slice(charStart, string.length);
}

function spliceOut(string, charStart, charEnd) {
	return string.slice(0, charStart) + string.slice(charEnd, string.length);
}

function unstarrify(toParse) {
	//loop through all characters of the data
	for (var u=0;u<toParse.length;u++) {
		//if the character is a star, look forwards for other stars
		if (toParse[u] == "*") {
			var detectorChar = u+1;
			var starNum = 1;

			//determining number of stars/number of repeats
			while (toParse[detectorChar] == "*") {
				detectorChar += 1;
				starNum += 1;
			}
			var repeatTimes = base64.indexOf([toParse[detectorChar]]);

			//removing the stars and indicator number from the original data
			toParse = spliceOut(toParse, u, detectorChar+1);

			

			//extending the data through the duplication process
			var charsToRepeat = toParse.substr(u-starNum, starNum);
			for (var g=0; g<repeatTimes-1; g++) {
				toParse = spliceIn(toParse, u, charsToRepeat);
			}
		}
	}
	return toParse;
}

function starrify(toParse) {
	var strStore = "";
	var strFinal = "";
	var repeatTimes = 0;
	var repeatLimit = 0;
	//go through all the characters
	while (toParse.length > 0) {
		//repeat for all the stars
		for (var starNum=1; starNum<=terrain_starChainMax; starNum++) {
			//get initial check value
			strStore = toParse.substring(0, starNum);

			//jump through and detect how many times that value repeats
			while (strStore == toParse.substring(repeatTimes * starNum, (repeatTimes + 1) * starNum)) {
				repeatTimes += 1;
			}

			//cap repeatTimes at 63, I don't want undefined characters in my data
			if (repeatTimes > 63) {
				repeatTimes = 63;
			}

			//if there's only 1 star, it must repeat 4+ times. 2 stars requires 3 repeats, and 3+ stars requires only 2 repeats
			switch (starNum) {
				case 1:
					repeatLimit = 3;
					break;
				default:
					repeatLimit = 2;
					break;
			}

			//if repeated enough, use the stars and leave the loop. if not, move to the next star number
			if (repeatTimes > repeatLimit) {
				//append to final string
				strFinal += strStore;
				for (var s=0; s<starNum; s++) {
					strFinal += "*";
				}
				strFinal += base64[repeatTimes];
				//update toParse and leave star loop
				toParse = toParse.substring(starNum * repeatTimes);
				starNum = terrain_starChainMax + 1;
			} else if (starNum == terrain_starChainMax) {
				//if out of star numbers, remove and add the single character
				strFinal += toParse[0];
				toParse = toParse.substring(1);
			}

			//reset things to default
			repeatTimes = 0;
		}
	}
	return strFinal;
}