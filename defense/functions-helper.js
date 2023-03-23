

function cancelAsyncFunc(id) {
	window.clearInterval(level_asyncFuncs[id]);
}

function cLinterp(color1HalfHex, color2HalfHex, percentage) {
	//performing a linear interpolation on all 3 aspects
	var finR = linterp(parseInt(color1HalfHex[1], 16), parseInt(color2HalfHex[1], 16), percentage);
	var finG = linterp(parseInt(color1HalfHex[2], 16), parseInt(color2HalfHex[2], 16), percentage);
	var finB = linterp(parseInt(color1HalfHex[3], 16), parseInt(color2HalfHex[3], 16), percentage);
	//converting back to hex
	return ("#" + Math.floor(finR).toString(16) + Math.floor(finG).toString(16) + Math.floor(finB).toString(16));
}

function drawSpace() {
	//blueshift
	if (tintAmount > 0.01) {
		ctx.fillStyle = "#00F";
		ctx.globalAlpha = tintAmount;
		ctx.fillRect(-320, -240, 640, 480);
		ctx.globalAlpha = 1;
	}

	//if the black hole has mass draw it
	if (bhMass == 0) {
		drawStarsSimple();
		return;
	}

	if (bhHighDetail) {
		drawStars();
	} else {
		drawStarsFast();
	}
}

function setMusicVolume(vol) {
	var titles = Object.keys(audio_musics);
	titles.forEach(t => {
		audio_musics[t].volume = vol;
	});
}

function setEffectsVolume(vol) {
	audio_effects.forEach(t => {
		t.volume = vol;
	});
}




function readStorage() {
	var toRead;
	try {
		toRead = window.localStorage["orange_data"];
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
		[data_persist.top, data_persist.skip, data_persist.vols[0], data_persist.vols[1]] = toRead;
	} else {
		console.log("ERROR: invalid type specified in save data, using default");
		return;
	}
}

function writeStorage() {
	window.localStorage["orange_data"] = `[${data_persist.top},${data_persist.skip},${data_persist.vols[0].toFixed(2)},${data_persist.vols[1].toFixed(2)}]`;
}

function rotateStarSphere(radians) {
	for (var v=0; v<stars.length; v++) {
		[stars[v][0], stars[v][2]] = rotate(stars[v][0], stars[v][2], radians);
	}
	starTracker = modulate(starTracker + radians, Math.PI * 2);
}

function repelOranges() {
	var allOranges = [...game_systems[0].oranges];
	if (game_systems.length == 2) {
		allOranges = allOranges.concat(game_systems[1].oranges);
	}

	//only repel if there are oranges to repel
	if (allOranges.length > 0) {
		var speedChange = Math.max(0.06, allOranges[0].speed / 18);
		allOranges.forEach(o => {
			o.speed -= speedChange;
		});
		return true;
	}
	return false;
}