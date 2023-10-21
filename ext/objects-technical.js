//triggers, audio classes, and the camera class go here


class AudioChannel {
	constructor(volume) {
		this.current = undefined;
		this.target = undefined;
		this.playObj = undefined;
		this.volume = volume;
		this.time = 0;
		this.paused = false;
	}

	pause() {

	}

	play() {

	}

	tick() {
		this.change();

		if (this.current.music == undefined) {
			return;
		}

		var maxTime = (60 / this.current.bpm) * this.current.activeBeats;

		//make sure current sound is being played
		if (this.playObj.paused && this.current.loop != false) {
			this.time = 0;
			this.reset();
		} else if (this.playObj.currentTime - 0.1 > maxTime + ((this.current.inactiveBeats ?? 0) * (60 / this.current.bpm))) {
			//this is a separate condition for smooth looping
			this.time = 0;
			this.playObj.currentTime -= maxTime;
		}

		//set volume
		this.playObj.volume = this.volume * (1 - (this.time / audio_fadeTime));
	}

	change() {
		//if the audios are already the same decrease time
		if (this.target == this.current) {
			if (this.time > 0) {
				this.time -= 1;
			}
			return;
		}


		//audios are different - run a timer to swap them
		this.time += 1;

		//if time is up, snap volume up and change audio
		//alternatively, a change from undefined happens instantly
		if (this.time > audio_fadeTime || this.current == undefined) {
			this.time = 0;
			this.current = this.target;
			if (this.current == undefined) {
				this.playObj = undefined;
			} else {
				this.playObj = this.current.music;
				this.reset();
			}
			return;
		}
	}

	//starts playing the current audio file, from the beginning
	reset() {
		if (this.playObj != undefined) {
			this.playObj.currentTime = 0;
			this.playObj.play();
		}
	}
}

//an audio container can play many sounds at once, as well as pausing / playing all of them
class AudioContainer {
	constructor(volume) {
		this.volume = volume;
		this.objs = {};
	}

	//adds an instance of that sound
	play(soundStr) {
		//don't bother if volume is already 0
		if (this.volume == 0) {
			return;
		}
		//make sure that string bin exists
		if (this.objs[soundStr] == undefined) {
			this.objs[soundStr] = [data_audio[soundStr]];
		}

		//loop through that string bin
		for (var f=0; f<this.objs[soundStr].length; f++) {
			//play the first available audio that isn't playing
			if (this.objs[soundStr][f].paused) {
				this.objs[soundStr][f].volume = this.volume;
				this.objs[soundStr][f].play();

				//if it's the last one create a new element
				if (f == this.objs[soundStr].length - 1) {
					this.objs[soundStr].push(new Audio(this.objs[soundStr][0].src));
				}
				return;
			}
		}
	}

	//gets the first sound with a sound string
	getSound(soundStr) {
		for (var d=0; d<this.objs.length; d++) {
			if (this.objs[d][0] == soundStr) {
				return this.objs[d][1];
			}
		}
	}

	pauseAll() {
		// this.objs.forEach()
	}

	//removes all instances of that sound from self and stops them from playing
	removeSound(soundStr) {
		// for (var d=0; d<this.objs.length; d++) {
		// 	if ()
		// }
	}

	tick() {

	}
}



class Camera {
	constructor(x, y, scale) {
		this.x = x;
		this.y = y;
		this.scale = scale;
		this.defaultWidth = 16;
		this.targetWidth = this.defaultWidth;

		this.nextX;
		this.nexY;
		this.nextScale;

		this.cornerUL = [0, 0];
		this.cornerDR = [0, 0];
		// this.target = [x, y];
		this.moveMode = "follow";
	}

	rescale(newTargetWidth) {
		newTargetWidth = newTargetWidth ?? this.targetWidth;
		this.targetWidth = newTargetWidth;
		this.scale = canvas.width / this.targetWidth;
	}

	tick() {
		switch (this.moveMode) {
			case "follow":
				this.x = player.x;
				this.y = player.y;
				break;
			case "followX":
				this.x = player.x;
				break;
			case "followY":
				this.y = player.y;
				break;

			// case ""
		}
	
		// if (//there's a fight active - case is lcoked) {
		// 	camera.x = clamp(camera.x, fight_boundsUL[0] + (canvas.width * 0.5 / camera.scale), fight_boundsDR[0] - (canvas.width * 0.5 / camera.scale));
		// 	camera.y = clamp(camera.y, fight_boundsUL[1] + (canvas.height * 0.5 / camera.scale), fight_boundsDR[1] - (canvas.height * 0.5 / camera.scale));
		// }

		//if the nexts are defined, adjust to them
		if (this.nextX != undefined) {
			this.x = this.nextX;
			this.nextX = undefined;
		}
		if (this.nextY != undefined) {
			this.y = this.nextY;
			this.nextY = undefined;
		}
		if (this.nextScale != undefined) {
			this.scale = this.nextScale;
			this.nextScale = undefined;
		}

		//calculate corner coordinates
		this.cornerUL = screenToSpace(0, 0);
		this.cornerDR = screenToSpace(canvas.width, canvas.height);
	}
}



//entities that sit at locations and do things when stepped on
class Tile {
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}

	playerIsOn() {
		return (player.x > this.x && player.x < this.x + this.w && player.y > this.y && player.y < this.y + this.h);
	}

	draw() {
		//draw self in the debug area
		if (!editor_active) {
			return;
		}

		if (!isOnScreen(this.x, this.y, this.w, this.h)) {
			return;
		}

		this.drawDebugBit();
	}

	drawDebugBit() {
		ctx.fillStyle = color_editorHighlight2;
		var coords = spaceToScreen(this.x, this.y);
		ctx.fillRect(coords[0], coords[1], this.w * camera.scale, this.h * camera.scale * vScale);
	}

	tick() {

	}
}



class Tile_Conversator extends Tile {
	constructor(x, y, w, h, characterToConverseWith, id) {
		super(x, y, w, h);
		this.dormant = false;
		this.charID = characterToConverseWith;
		this.id = id;
	}
	
	tick() {
		//if the player's stepped on, start the conversation and go dormant until the player's stepped off
		if (this.dormant) {
			if (!player.locked && !this.playerIsOn()) {
				this.dormant = false;
			}
			return;
		}
		
		if (this.playerIsOn()) {
			var ent = getEntityFromID(this.charID);
			if (ent != undefined) {
				ent.startConversation();
			}
			this.dormant = true;
		}
	}
}

class Tile_Music extends Tile {
	constructor(x, y, w, h, musicToSet) {
		super(x, y, w, h);
		this.musicStr = musicToSet;
	}

	tick() {
		if (this.playerIsOn()) {
			setMusic(this.musicStr);
		}
	}
}

class Tile_Arbitrary extends Tile {
	constructor(x, y, w, h, codeToExecute) {
		super(x, y, w, h);
		this.func = codeToExecute;
	}

	tick() {
		if (this.playerIsOn()) {
			this.func();
		}
	}
}

//sits at a location and sets the player's respawn point if they step on the tile
class Tile_Respawn extends Tile {
	constructor(x, y, w, h) {
		super(x, y, w, h);
	}

	tick() {
		if (this.playerIsOn()) {
			player.respawnPoint = [player.x, player.y];
		}
	}

	drawDebugBit() {
		ctx.lineWidth = canvas.height / 100;
		ctx.strokeStyle = "#FFFFFF";
		var coords = spaceToScreen(this.x, this.y);
		ctx.beginPath();
		ctx.rect(coords[0], coords[1], this.w * camera.scale, this.h * camera.scale);
		ctx.stroke();
	}
}

class Tile_SemiSolid extends Tile {
	constructor(x, y, w, h, startSolid) {
		super(x, y, w, h);
		this.solid = startSolid;
	}
}