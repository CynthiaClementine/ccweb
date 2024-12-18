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
		this.targetX = x;
		this.targetY = y;
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

		this.layers = {
			'r': 1,
			'g': 0,
			'b': 0,
		}
		this.layersPast = JSON.parse(JSON.stringify(this.layers));
		this.layersFuture;
		this.layerQueue = ['r'];
		this.queueTime = 0;
	}

	rescale(newTargetWidth) {
		newTargetWidth = newTargetWidth ?? this.targetWidth;
		this.targetWidth = newTargetWidth;
		this.scale = canvas.width / this.targetWidth;
	}

	setLayerTarget(layer) {
		if (layer != this.layerQueue[this.layerQueue.length-1]) {
			this.layerQueue.push(layer);
		}
	}

	tick(dt) {
		switch (this.moveMode) {
			case "follow":
				this.x = player.x;
				this.y = player.y;
				break;
			case "followX":
				this.x = player.x;
				this.y = linterp(this.y, this.targetY, 0.2);
				break;
			case "followY":
				this.x = linterp(this.x, this.targetX, 0.2);
				this.y = player.y;
				break;
			case "target":
				break;
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

		//layer adjustment
		if (this.layerQueue.length > 1) {
			this.tickLayers(dt);
		}

		//calculate corner coordinates
		this.cornerUL = screenToSpace(0, 0);
		this.cornerDR = screenToSpace(canvas.width, canvas.height);
	}

	tickLayers(dt) {
		if (this.queueTime == 0) {
			//if it's the first frame, define what the future layers are
			this.layersFuture = {
				'r': +(layerInteracts['r'].includes(this.layerQueue[1])),
				'g': +(layerInteracts['g'].includes(this.layerQueue[1])),
				'b': +(layerInteracts['b'].includes(this.layerQueue[1])),
			};
		}
		this.queueTime += 2 * dt;
	
		if (this.queueTime > 1) {
			this.layers = this.layersFuture;
			this.layersPast = JSON.parse(JSON.stringify(this.layers));
			this.queueTime = 0;
			this.layerQueue.shift();
			return;
		}

		this.layers['r'] = linterp(this.layersPast['r'], this.layersFuture['r'], this.queueTime);
		this.layers['g'] = linterp(this.layersPast['g'], this.layersFuture['g'], this.queueTime);
		this.layers['b'] = linterp(this.layersPast['b'], this.layersFuture['b'], this.queueTime);
	}
}

class Comment_Audio {
	constructor(x, y, audioData) {
		this.homeX = x;
		this.homeY = y;
		this.data = audioData;
	}
	
	updateText(newText) {
		this.text = newText;
		this.brokenText = newText.split("\n");
	}

	draw(dt) {
		//draw all the text
	}

	tick(dt) {

	}

	giveStringData() {
		return `CommentA~${this.homeX}~${this.homeY}~???`;
	}
}

class Comment_Text {
	constructor(x, y, text) {
		this.homeX = x;
		this.homeY = y;
		this.text = "";
		this.updateText(text);

		this.maxWidth = 4;
	}

	updateText(newText) {
		this.text = newText;
		this.brokenText = newText.split("\n");
	}

	draw(dt) {
		//draw all the text
	}

	tick(dt) {

	}

	giveStringData() {
		return `CommentT~${this.homeX}~${this.homeY}~${this.text}`;
	}
}


class Trigger {
	/**
	 * Creates a trigger to do something in the world. There are multiple different types of triggers.
	 * 
	 * @param {*} x1 
	 * @param {*} y1 
	 * @param {*} x2 
	 * @param {*} y2 
	 * @param {*} layer 
	 * @param {*} thickness 
	 * @param {String} triggerType "conversation", "respawn", "execute", or "layer"
	 * @param {*} state 
	 */
	constructor(x1, y1, x2, y2, layer, thickness, triggerType, state) {
		this.line = [[x1, y1], [x2, y2]];
		this.layer = layer;
		this.width = thickness;
		this.type = triggerType;
		this.state = state;

		this.dormant = false;
	}

	playerIsOn() {
		if (player.layer != this.layer) {
			return;
		}
		var [p1, p2] = this.line;
		var angle = -Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
		var endCoords = rotate(...d2_subtract(p2, p1), angle);
		var relCoords = rotate(player.x - p1[0], player.y - p1[1], angle);

		return (relCoords[0] > 0 && relCoords[0] < endCoords[0] && Math.abs(relCoords[1]) < this.width);
	}

	draw() {
		//draw self in the debug area
		if (!editor_active) {
			return;
		}

		var bounds1 = [...this.line[0]];
		var bounds2 = [...this.line[1]];

		if (bounds1[0] > bounds2[0]) {
			[bounds1[0], bounds2[0]] = [bounds2[0], bounds1[0]];
		}
		if (bounds1[1] > bounds2[1]) {
			[bounds1[1], bounds2[1]] = [bounds2[1], bounds1[1]];
		}

		if (!isOnScreen(...bounds1, bounds2[0] - bounds1[0], bounds2[1] - bounds1[1])) {
			return;
		}

		this.drawDebugBit();
	}

	drawDebugBit() {
		ctx.lineWidth = canvas.height / 50;
		var sp1 = spaceToScreen(...this.line[0]);
		var sp2 = spaceToScreen(...this.line[1]);
		var spMid = linterpMulti(sp1, sp2, 0.5);
		var perpVec = d2_subtract(sp2, sp1);
		perpVec = [-perpVec[1], perpVec[0]];
		var magni = Math.sqrt(distSquared(...perpVec)) / 20;
		perpVec = [perpVec[0] / magni, perpVec[1] / magni];

		//different colored line depending on type
		var types = {
			"conversation": `#88F`,
			"respawn": `#8F8`,
			"execute": `#F8F`,
			"layer": `#888`,
			"music": `"#F80`
		};
		var col = types[this.type];
		//main line
		drawLine(...sp1, ...sp2, col);
		// drawLine(...sp1, ...d2_add(sp1, delta), col);
		drawCircle(...sp1, editor_selectTolerance, "#000");
		drawCircle(...sp2, editor_selectTolerance, "#000");

		//arrow
		ctx.lineWidth = canvas.height / 100;
	}

	tick() {
		if (!this.playerIsOn()) {
			this.dormant = false;
			return;
		}

		switch (this.type) {
			case "conversation":
				break;
			case "respawn":
				break;
			case "execute":
				break;
			case "layer":
				if (editor_active) {
					return;
				}
				changeEntityLayer(player, this.state[1]);
				camera.setLayerTarget(this.state[0]);
				break;
		}
	}

	giveStringData() {
		var [[x1, y1], [x2, y2]] = this.line;
		return `Trigger~${this.type}~${x1.toFixed(1)}~${y1.toFixed(1)}~${x2.toFixed(1)}~${y2.toFixed(1)}~${this.layer}~${this.width}~${this.state}`;
	}
}

class Trigger_Music extends Trigger {
	constructor(x1, y1, x2, y2, layer, thickness, beforeState, afterState) {
		super(x1, y1, x2, y2, layer, thickness, "music");
		this.stateAfter = afterState;
	}

	tick() {
		if (!this.playerIsOn()) {
			return;
		}

		//player relative coordinates
		
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

class Portal {
	/**
	 * Creates a Portal that teleports the player between the start and end.
	 * @param {Number[]} line1 The line segment representing the start of the portal
	 * @param {Char} layer The layer the portal should be on
	 * @param {Number[]} delta [change in X, change in Y] from the start to the end of the portal.
	 * @param {Boolean} backtrackable Whether the end should teleport the player to the start
	 * @param {Boolean} directional When false, both sides of the portal will teleport the player. When true, the portal will only teleport the player if they enter from one side
	 */
	constructor(line, layer, delta, backtrackable, directional) {
		this.layer = layer;
		this.line = line;
		this.delta = delta;
		this.deltaPoint = d2_add(this.line[0], this.delta);

		this.EtoS = backtrackable;
		this.directional = directional;
		this.playerAbove = false;
	}

	draw(dt) {
		//only draw if in editor mode
		if (!editor_active) {
			return;
		}

		var lMult = 5;
		var playerLine = [
			[player.x - player.dx * dt * lMult, player.y - player.dy * dt * lMult],
			[player.x + player.dx * dt * lMult, player.y + player.dy * dt * lMult]
		];
		playerLine = playerLine.map(a => spaceToScreen(...a));

		var sp1 = spaceToScreen(...this.line[0]);
		var sp2 = spaceToScreen(...this.line[1]);
		var spMid = linterpMulti(sp1, sp2, 0.5);
		var delta = [camera.scale * this.delta[0], camera.scale * vScale * this.delta[1]];

		//rainbow line owowuwu 
		var col = `hsl(${dt_tLast / 20}, 80%, 50%)`;
		drawLine(...sp1, ...sp2, col);
		drawLine(...sp1, ...d2_add(sp1, delta), col);
		drawCircle(...sp1, editor_selectTolerance, "#000");
		drawCircle(...sp2, editor_selectTolerance, "#000");
		drawCircle(...d2_add(sp1, delta), editor_selectTolerance, "#000");

		drawLine(playerLine[0][0], playerLine[0][1], playerLine[1][0], playerLine[1][1], "#FFF");
	}

	teleport(mult) {
		player.x += this.delta[0] * mult;
		player.y += this.delta[1] * mult;

		if (camera.moveMode == "follow") {
			camera.x += this.delta[0] * mult;
			camera.y += this.delta[1] * mult;
		}
	}

	tick(dt) {
		//editor updating potentially
		if (editor_active && editor_entity != undefined && editor_entity.ent == this) {
			if (arrsAreSame(editor_entity.line, this.line)) {
				this.deltaPoint = d2_add(this.line[0], this.delta);
			} else {
				//update delta
				this.delta = d2_subtract(this.deltaPoint, this.line[0]);
			}
		}

		//if the line the player makes (with their velocity and body) crosses over the portal's line, they should be teleported.
		//At least.. probably. If the portal is only one way, we gotta check which way the line's going. 
		//And if the portal's backtrackable, we also need to check a second set of lines. But that's ok. 

		var lMult = 5;
		var portalLine = this.line;
		var portalLine2 = [d2_add(this.line[0], this.delta), d2_add(this.line[1], this.delta)];
		var playerLine = [
			[player.x - player.dx * dt * lMult, player.y - player.dy * dt * lMult],
			[player.x + player.dx * dt * lMult, player.y + player.dy * dt * lMult]
		];

		var intersects1 = lineIntersect(...portalLine, ...playerLine);
		var intersects2 = lineIntersect(...portalLine2, ...playerLine);
		// console.log(intersects1, intersects2);

		if (!intersects1 && !intersects2) {
			//if there are no potential crossings we don't care
			return;
		}

		console.log("intersection detect");

		//backwards case
		if (intersects2) {
			//if the player can't go back we don't care
			if (!this.EtoS) {
				return;
			}

			//check for proper directionality
			if (this.directional && getOrientation(portalLine2[0], portalLine2[1], playerLine[1]) != 1) {
				return;
			}
			//teleport the player
			this.teleport(-1);
			return;
		}

		//regular start case
		if (intersects1) {
			//check for proper directionality
			if (this.directional && getOrientation(portalLine[0], portalLine[1], playerLine[1]) != 1) {
				return;
			}

			this.teleport(1);
		}
	}

	giveStringData() {
		return `Portal~${JSON.stringify(this.line)}~${this.layer}~${JSON.stringify(this.delta)}~${this.EtoS}~${this.directional}`;
	}
}

class UI_ColorButtons {
	constructor(x, y, buttonArr, onClick) {
		this.x = x;
		this.y = y;
		this.buttonData = buttonArr;
		this.func = onClick;
	}


}