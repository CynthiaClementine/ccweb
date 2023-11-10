


/*
INDEX

endGame()
localStorage_read()
localStorage_write()
localStorage_writeEnding(endValue)
prepareWorld()
enableSpaceOrbs()
disableSpaceOrbs()
calculatePushVec(p1, p2)
getImage(url, useStoredCanvas)
getTextAtTime(text, time)

getEntityFromID(id)



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
		toRead = window.localStorage["ext_data"];
	} catch(error) {
		console.log(`ERROR: could not access local storage. Something has gone very seriously wrong.`);
		if (error.name == "NS_ERROR_FILE_CORRUPTED") {
			alert("Hi! Something has gone terribly wrong. But don't panic.\nMost likely the local browser storage has been corrupted.\nYou can fix it by clearing your browser history, including cookies, cache, and local website data.");
		}
	}

	try {
		toRead = JSON.parse(toRead);
	} catch (error) {
		console.log(`ERROR: could not parse ${toRead}, using default`);
		prepareWorld();
		return;
	}

	//make sure it's somewhat safe, and then make it into the game flags
	if (typeof(toRead) == "object") {
		data_persistent = toRead;
	} else {
		console.log("ERROR: invalid type specified in save data, using default");
		prepareWorld();
		return;
	}

	//change the world based on save data
	prepareWorld();

	//update settings
	console.log("loaded save");
}

function localStorage_write() {
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

function prepareWorld() {
	var depe = data_persistent;
	//x, y, and m are easy, just move the player and set music
	player.x = depe.x;
	player.y = depe.y;
	player.respawnPoint = [player.x, player.y];
	setMusic(depe.music);

	//volumes
	audio_bgChannel.volume = depe.vols[0];
	audio_sfxChannel.volume = depe.vols[1];
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

//for collision lines, uses the two points in the line to calculate how entities should be pushed
function calculatePushVec(p1, p2) {
	return normalize([p2[1] - p1[1], p1[0] - p2[0]]);
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

function getImage(url, useStoredCanvas) {
	var image = new Image();
	image.src = url;

	//if using an offscreen canvas return that instead
	if (useStoredCanvas) {
		var nowCanvas = document.createElement('canvas');
		var nowCtx = nowCanvas.getContext('2d');
		nowCanvas.width = 0;
		nowCanvas.height = 0;

		image.onload = () => {
			//when the image loads resize the canvas and paint to it
			nowCanvas.width = image.width;
			nowCanvas.height = image.height;
			nowCtx.drawImage(image, 0, 0);
		}
		return nowCanvas;
	}
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
	if (text[0] == "#") {
		
	}
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
				time -= tInc * text_tabsCount;
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

//moves the player out of a circle
function circleRepelPlayer(circleX, circleY, circleR) {
	var delta = {x: player.x, y: player.y};
	circleRepel(delta, circleX, circleY, circleR);
	moveInWorld(player.x, player.y, delta.x - player.x, delta.y - player.y, player.r, player.layer);
}

function circleRepel(entity, circleX, circleY, circleR) {
	//helper relative variables
	var relPX = entity.x - circleX;
	var relPY = entity.y - circleY;
	var pDist;

	if (Math.abs(relPX) < circleR && Math.abs(relPY) < circleR) {
		//try to keep player circleR units away, also avoid /0 errors
		pDist = 0.001 + Math.hypot(relPX, relPY);
		// console.log(`2`, pDist);
		
		if (pDist < circleR) {
			// console.log(`3`, pDist);
			relPX = relPX / pDist * circleR;
			relPY = relPY / pDist * circleR;

			entity.x = circleX + relPX;
			entity.y = circleY + relPY;
		}
	}
}


function roofNameFromData(dimensionData) {
	var possibles = editor_listR.str;
	var name;
	for (var e=0; e<possibles.length; e++) {
		if (arrsAreSame(data_textures.Roofs[possibles[e]][0], dimensionData[0]) && 
			arrsAreSame(data_textures.Roofs[possibles[e]][1], dimensionData[1]) && 
			arrsAreSame(data_textures.Roofs[possibles[e]][2], dimensionData[2])) {
			name = possibles[e];
			e = possibles.length + 1;
		}
	}
	return name;
}

function ellipticalRepelPlayer(ellipseX, ellipseY, radiusX, radiusY) {
	//transform player's relative coordinates so that it's like an ellipse
	var delta = {x: player.x, y: player.y};
	// console.log(delta);
	delta.x -= ellipseX;
	delta.x /= radiusX;
	delta.y -= ellipseY;
	delta.y /= radiusY;
	circleRepel(delta, 0, 0, 1);
	delta.x = delta.x * radiusX + ellipseX;
	delta.y = delta.y * radiusY + ellipseY;
	// console.log(delta, player);
	[player.x, player.y] = moveInWorld(player.x, player.y, delta.x - player.x, delta.y - player.y, player.r, player.layer);
}

function importEntity(entityDataLine) {
	var spl = entityDataLine.split("~");

	switch (spl[0]) {
		case "DreamSkater":
			return new DreamSkater(+spl[1], +spl[2], spl[3], spl[4], spl[5]);
	}
}

/**
 * Takes in movement information for a circular entity and returns a new position that the entity should be in. 
 * In the process, this collides with walls and movement-altering surfaces.
 * @param {Number} x The x-coordinate of the entity
 * @param {Number} y The y-coordinate of the entity
 * @param {Number} dx The entity's x speed
 * @param {Number} dy The entity's y speed
 * @param {Number} r The radius of the entity
 * @param {String} layer The color layer the entity is currently on
 */
function moveInWorld(x, y, dx, dy, r, layer) {
	//give up if dx and dy are too small
	if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
		return [x, y];
	}


	var colP1 = [x, y];
	var colP2 = [x + dx, y + dy];
	var dMagni = Math.sqrt(distSquared(dx, dy));
	var r2 = r * r;
	//get all the lines that could interact with the player
	var ls = 0;
	var l, rot, movePercent;
	var pastLines = [];
	//repeat until movement isn't necessary (or out of iterations)
	while (distSquared(colP1[0] - colP2[0], colP1[1] - colP2[1]) > 0.0001 && ls < 10) {
		l = moveInWorld_getLine(colP1, colP2, r, layer);

		//if there are no lines to collide with, just move (:
		if (l == undefined) {
			return colP2;
		}

		//if the line has already been collided with, this is probably in a situation where collision simply is not resolvable
		if (pastLines.includes(l)) {
			console.log(`unresolvable!`);
			return colP1;
		}

		//if there is a unique line though..
		//transform to line's POV
		colP1[0] -= l[0][0];
		colP1[1] -= l[0][1];
		colP2[0] -= l[0][0];
		colP2[1] -= l[0][1];

		rot = -Math.atan2(l[1][1] - l[0][1], l[1][0] - l[0][0]);
		colP1 = rotate(colP1[0], colP1[1], rot);
		colP2 = rotate(colP2[0], colP2[1], rot);

		// console.log(`relative movement coords: ${colP1[0].toFixed(5)},${colP1[1].toFixed(5)} -> ${colP2[0].toFixed(5)},${colP2[1].toFixed(5)}`);

		//if off the near edge, try to avoid causing problems by shunting the player away in the x
		if (colP1[0] < -0.1 && Math.abs(colP2[0] - colP1[0]) < 0.01) {
			colP2[0] = colP1[0] - 0.01;
		}
		
		if (colP2[1] < -r) {
			//if somehow all good, proceed
			colP1[1] = -r * 1.01;
		} else if (colP2[1] < -r * 0.9) {
			//if it's close enough to the collision edge, just snap upwards and be fine with it
			colP2[1] = -r;
			colP1[0] = colP2[0];
			colP1[1] = colP2[1];
		} else {
			//move until a collision happens
			movePercent = getPercentage(colP1[1], colP2[1], -r);
			if (!Number.isFinite(movePercent)) {
				//if a non-finite movement amount is happening, that must mean the player is moving directly parallel to the line and therefore is fine
				movePercent = 1;
				// console.error(`Collision error: non-finite movement resolution with line ${JSON.stringify(l)} for relative movement ${colP1[0].toFixed(5)},${colP1[1].toFixed(5)} -> ${colP2[0].toFixed(5)},${colP2[1].toFixed(5)}`);
				// return colP2;
			}
			// if (movePercent < -0.02 || movePercent > 1) {
			// 	console.error(`Collision error: Allowed ${movePercent}% with line ${JSON.stringify(l)} for relative movement ${colP1[0].toFixed(5)},${colP1[1].toFixed(5)} -> ${colP2[0].toFixed(5)},${colP2[1].toFixed(5)}`);
			// 	return colP2;
			// }
			// console.log(`allowing ${movePercent * 100}% movement`);
			colP1 = linterpMulti(colP1, colP2, movePercent);
			colP2[1] = -r;
			// console.log(`re-snapped to ${colP1[0].toFixed(5)},${colP1[1].toFixed(5)} -> ${colP2[0].toFixed(5)},${colP2[1].toFixed(5)}`);
		}

		//transform back to world coordinates
		rot = -rot;
		colP1 = rotate(colP1[0], colP1[1], rot);
		colP2 = rotate(colP2[0], colP2[1], rot);

		colP1[0] += l[0][0];
		colP1[1] += l[0][1];
		colP2[0] += l[0][0];
		colP2[1] += l[0][1];

		ls += 1;
	}
	if (ls >= 10) {
		console.log(`out of movement iterations!`);
	}
	return colP1;
}

function clipboardCopy(str) {
	navigator.clipboard.writeText(str);
}

function moveInWorld_getLine(colP1, colP2, r, layer) {
	var r2 = r * r;
	var currentLine = undefined;
	var minDist = 1e1001;
	var distTest;
	for (var c of layerInteracts[layer]) {
		for (var l of data_terrain[c]) {
			pts = lineLineClosestPoints(colP1, colP2, l[0], l[1]);
			//if the collision line gets too close, flag the line
			if (distSquared(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) < r2) {
				distTest = distSquared(colP1[0] - pts[1][0], colP1[1] - pts[1][1]);
				if (distTest < minDist) {
					minDist = distTest;
					currentLine = l;
				}
			}
		}
	}
	return currentLine
}

/**
 * gives the ID of the surface at the specified coordinates.
 * For example, getWorldData(3.4, 9.2) could return 1.
 * Returns 0 as a default.
 * @param {Number} x x-coordinate
 * @param {Number} y y-coordinate
 */
function getLayerData(x, y, layer) {

	//actually find the data
	y = Math.floor(2 * Math.abs(y));
	x = Math.floor(2 * Math.abs(x));

	//avoid errors via undefined squares
	if (searchArr[y] == undefined) {
		return 0;
	}
	return searchArr[y][x] ?? 0;
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

/**
 * 
 * @param {Integer} min the minimum value returned
 * @param {Integer} max one greater than the maximum value returned
 * @returns 
 */
function randomInt(min, max) {
	return Math.floor(randomBounded(min, max));
}

//removes all the undefineds from the end of entity string data
function rmUndefs(str) {
	while (str.slice(-10) == "~undefined") {
		str = str.slice(0, -10);
	}
	return str;
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

function resetTrue() {
	if (confirm(`Are you sure you want to perform a True Reset? This will erase all data.`)) {
		//expunge all data
		window.localStorage["monarch_data"] = undefined;
		window.location.reload();
	}
}

function setMusic(musicStr) {
	audio_bgChannel.target = data_audio[musicStr];
	console.log(`set music to ${musicStr}`);
}

/**
 * Either sets a gate to be locked or unlocked.
 * @param {String} leverID The ID of the lever entity corresponding to the gate
 * @param {String} gateID The ID of the gate entity
 * @param {Boolean} locked whether the gate should be locked or unlocked
 */
function setGateState(leverID, gateID, locked) {
	getEntityFromID(leverID).textureActive.frame = +(!locked);
	getEntityFromID(gateID).changeStateTo(+locked);
}



function screenToSpace(x, y) {
	return [
		(x - (canvas.width / 2)) / camera.scale + camera.x,
		(y - (canvas.height / 2)) / vScale / camera.scale + camera.y,
	]
}

function spaceToScreen(x, y) {
	return [
		camera.scale * (x - camera.x) + (canvas.width / 2),
		camera.scale * vScale * (y - camera.y) + (canvas.height / 2)
	]
}


function spliceIn(string, charStart, string2) {
	return string.slice(0, charStart) + string2 + string.slice(charStart, string.length);
}

function spliceOut(string, charStart, charEnd) {
	return string.slice(0, charStart) + string.slice(charEnd, string.length);
}

function isValidStr(str) {
	return (str != null && str != "");
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

function updateWorldEntities() {
	//all entities that are close to the camera, and on the same layer as the player. Things on different layers basically don't exist in the world.
	var maxDistS = 2.5;
	var maxDistX = maxDistS * camera.targetWidth;
	var maxDistY = maxDistS * camera.targetWidth * (15 / 16);

	world_entities = [];

	entities.forEach(e => {

	});

}