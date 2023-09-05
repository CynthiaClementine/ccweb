
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
		this.targetWidth = 16;

		this.nextX;
		this.nexY;
		this.nextScale;

		this.cornerUL = [0, 0];
		this.cornerDR = [0, 0];
		// this.target = [x, y];
	}

	tick() {
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




class Orb {
	/**
	 * 
	 * @param {Number} x starting x pos
	 * @param {Number} y starting y pos
	 * @param {Number} r radius, in world units
	 * @param {Texture} texture the texture object to use for idle animation
	 */
	constructor(x, y, r, texture) {
		this.x = x;
		this.y = y;
		this.a = 0;
		this.dx = 0;
		this.dy = 0;
		this.dMax = 0.09;
		this.da = 0;

		this.r = r;

		this.textureIdle = texture;
		this.textureActive = this.textureIdle;
		var d = data_textures;
		var dM = data_textures.Magic;
		this.textureBlock = new Texture(dM.sheet, d.tileSize, ...dM.block, false);
		this.blockA = undefined;

		//start idle texture at a random frame
		this.textureIdle.frame = randomBounded(0, this.textureIdle.frames.length - 1);
	}

	draw() {
		if (!isOnScreen(this.x - this.r / 2, this.y - this.r / 2, this.r, this.r)) {
			return;
		}
		//draw the texture over self
		var coords = spaceToScreen(this.x, this.y);

		if (this.blockA != undefined && this.textureBlock != undefined) {
			this.textureBlock.draw(coords[0], coords[1], this.blockA, this.r * camera.scale);
			if (this.textureBlock.frame >= this.textureBlock.frames.length - 1) {
				this.textureBlock.reset();
				this.blockA = undefined;
			}
		}

		this.textureActive.draw(coords[0], coords[1], this.a, this.r * camera.scale);
	}

	tick() {
		this.x += this.dx;
		this.y += this.dy;
		this.a += this.da;
		if (this.do != 0) {
			this.opacity = clamp(this.opacity + this.do, 0, 1);
		}
	}
}

class MagicSphere extends Orb {
	/**
	 * 
	 * @param {Number} x The world x-coordinate the sphere should spawn at
	 * @param {Number} y The world y-coordinate the sphere should spawn at
	 * @param {Radian} angle the angle the sphere will travel in
	 * @param {Boolean} large whether the sphere is large or not
	 */
	constructor(x, y, angle, large) { 
		var d = data_textures;
		var dL = data_textures.Magic;
		var dLM = large ? dL.large : dL.small;
		super(x, y, 1 + +large, new Texture(dL.sheet, d.tileSize, ...dLM, true));
		this.speed = 0.2 - (0.1 * large);
		this.isLarge = large;
		this.dx = this.speed * Math.cos(angle);
		this.dy = this.speed * Math.sin(angle);

		this.age = 0;
		this.ageMax = 100;

		this.hittables = this.constructHittables();
	}

	constructHittables() {
		var ar = [];
		//all entities that are within the distance this orb will travel in its lifetime x 2 count as hittable
		//square it so I don't have to use a square root in comparisons
		var lifetimeDist = this.speed * this.speed * this.ageMax * this.ageMax * 4;
		world_entities.forEach(e => {
			//make sure the entity is actually hittable and isn't the player
			if (e != player && e.health != undefined && distSquared(e.x - this.x, e.y - this.y) < lifetimeDist) {
				if (e.constructor.name == "Horse") {
					console.log(`horse`);
				}
				ar.push(e);
			}
		});
		return ar;
	}

	draw() {
		super.draw();
	}

	dealDamage(h) {
		try {
			h.beDamaged(1.5 + 3.5 * this.isLarge);
			this.ageOut();
		} catch (error) {
			console.log(`cannot damage ${h.constructor.name}!`);
		}
	}

	tick() {
		this.age += 1;
		if (this.age >= this.ageMax) {
			this.r -= Math.abs(this.age - this.ageMax) * 0.02;
			if (this.r <= 0.01) {
				this.DELETE = true;
			}
			return;
		}

		super.tick();

		//collide with entities
		this.hittables.forEach(h => {
			if (distSquared(h.x - this.x, h.y - this.y) < this.r * this.r && !(h.dashTime > 0)) {
				//if they're shielded, play the blocking animation
				if (h.shield) {
					h.blockA = Math.atan2(this.y - h.y, this.x - h.x);
					this.ageOut();
				} else {
					//if they're not shielded, do damage
					this.dealDamage(h);
				}
			}
		});

		//collide with world
		if (terrain_surfaces[getWorldData(this.x, this.y)] == undefined) {
			this.ageOut();
		}
	}

	ageOut() {
		this.dx = 0;
		this.dy = 0;
		this.age = this.ageMax + 2;
	}
}

class MagicSphere_Enemy extends MagicSphere {
	constructor(x, y, backColor, frontColor, angle, large, ageMaxOPTIONAL) {
		super(x, y, angle, large);
		this.r = large ? 1 : 0.25;


		this.textureActive = undefined;
		this.textureIdle = undefined;

		this.color1 = backColor;
		this.color2 = frontColor;
		this.ageMax = ageMaxOPTIONAL ?? 1000;

		this.speed = large ? 0.09 : 0.05;
		this.dx = this.speed * Math.cos(angle);
		this.dy = this.speed * Math.sin(angle);
	}

	
	constructHittables() {
		//just hit the player
		return [player];
	}
	
	dealDamage(h) {
		try {
			h.beDamaged(1 + 0.5 * this.isLarge);
			this.ageOut();
		} catch (error) {
			console.log(`cannot damage ${h.constructor.name}!`);
		}
	}

	draw() {
		if (this.r <= 0.01) {
			return;
		}

		if (!isOnScreen(this.x - 2, this.y - 2, 4, 4)) {
			return;
		}
		ctx.fillStyle = this.color;
		var pos = spaceToScreen(this.x, this.y);
		drawCircle(pos[0], pos[1], this.r * camera.scale, this.color1);
		drawCircle(pos[0], pos[1], this.r * 0.8 * camera.scale, this.color2);
	}
}

class MagicSpaceOrb {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.r = Math.random() * 0.1 + 0.1;
		this.id = 'spaceOrb';

		this.opacityTarget = 0;
		this.opacity = 0;
	}

	//gets the correct angular velocity to travel around the player, based on distance
	orbitalAngularVelocity(distance) {
		/*Fg = GmM / r^2
		so g = GM / r^2

		for uniform circular motion, a = rw^2 = v^2 / r
		since only acceleration is gravity,
		GM / r^2 = rw^2
		GM / r^3 = w^2
		sqrt(GM / r^3) = w

		this isn't the real world, so G and M can basically be whatever I want and can be 
		combined into one constant - gravityStrength
		*/
		return Math.sqrt(gravityStrength / (distance ** 3));
	}

	draw() {
		if (this.opacity <= 0.01) {
			return;
		}

		if (!isOnScreen(this.x - this.r, this.y - this.r, this.r * 2, this.r * 2)) {
			return;
		}

		var coords = spaceToScreen(this.x, this.y);
		ctx.globalAlpha = this.opacity;
		drawCircle(coords[0], coords[1], this.r * camera.scale, color_magic);
		ctx.globalAlpha = 1;
	}

	tick() {
		if (this.opacity != this.opacityTarget) {
			this.opacity = linterp(this.opacity, this.opacityTarget, 0.1);
		}

		//move around player
		if (this.opacity > 0.01) {
			var playerDist = Math.hypot(this.x - player.x, this.y - player.y);
			var angleAdjust = this.orbitalAngularVelocity(playerDist);
			var playerAngle = Math.atan2(this.y - player.y, this.x - player.x);
			playerAngle += angleAdjust;
			[this.x, this.y] = polToXY(player.x, player.y, playerAngle, playerDist);


		}
	}
}

class NPC extends Orb {
	/**
	 * A non player character entity that exists in the world
	 * @param {Number} x world x coordinate
	 * @param {Number} y world y coordinate
	 * @param {Radian} a initial angle
	 * @param {Array[]} animationData idle animation data
	 * @param {HexColor} textColor text color to display when this entity is engaged in a conversation
	 * @param {Array[]} conversations the list of conversations the entity can participate in
	 * @param {String} id Optional: the entity's ID, for reference later
	 */
	constructor(x, y, a, animationData, textColor, conversations, id, extraAnimations) {
		//if it's just one string correct the issue
		conversations = conversations ?? [];
		if (conversations.constructor.name == "String") {
			conversations = [[true, conversations]];
		}
		var texture;
		if (animationData != undefined) {
			texture = new Texture(data_textures.Player.sheet, data_textures.tileSize, ...animationData, true);
		}
		super(x, y, 1, texture);
		this.animations = extraAnimations ?? {};
		this.a = a;
		this.color = textColor;
		this.conversations = conversations;
		this.convoCurrent = undefined;
		this.line = 0;
		this.lineTime = 0;

		this.id = id;
		this.opacity = 1;
		this.do = 0;

		this.shield = true;
	}

	draw() {
		//try to avoid changing the globalAlpha unless necessary
		if (this.opacity != 1) {
			ctx.globalAlpha = this.opacity;
			super.draw();
			ctx.globalAlpha = 1;
		} else {
			super.draw();
		}
		this.drawConversation();
	}

	drawConversation() {
		//don't draw if there's no conversation to draw
		if (this.convoCurrent == undefined) {
			return;
		}

		//if off the end of the conversation, leave
		if (this.convoCurrent[this.line] == undefined) {
			this.endConversation();
			return;
		}

		this.lineTime += 1;

		//if it's a blank line, don't bother
		if (this.convoCurrent[this.line] == "") {
			return;
		}
		
		//if it's a command line, handle that
		if (this.convoCurrent[this.line][0] == "|") {
			this.executeConversationCommand(this.convoCurrent[this.line].slice(1));
			return;
		}

		//if there's an escape character, move to the next line
		var drawText = getTextAtTime(this.convoCurrent[this.line], this.lineTime);
		if (drawText.includes("\\")) {
			this.finishConversationCommand();
			return;
		}

		//draw the actual function
		var self = this;
		deferredFunc = function() {
			var px = canvas.height * text_size;
			ctx.font = `${Math.floor(px)}px Playfair Display`;
			ctx.textAlign = "center";

			//put text on opposite side that the player is unless the player is far away
			//default is to draw text below self
			var flipDir = (player.y - self.y > 0 && (player.y - self.y) * camera.scale < canvas.height * 0.3) || (self.y - player.y) * camera.scale > canvas.height * 0.3;
			var sn = boolToSigned(flipDir);
			var boxes = drawText.split("\n");
			var startCoords = spaceToScreen(self.x, self.y - 0.75 * sn);
			
			//draw bubble behind the text
			var width;
			ctx.fillStyle = color_textBackground;
			for (var y=0; y<boxes.length; y++) {
				width = ctx.measureText(boxes[flipDir ? (boxes.length-1-y) : y]).width + 7;
				ctx.fillRect(startCoords[0] - width / 2, startCoords[1] - sn*(px * 1.5 * (y + sn * 0.5)), width, px * 1.5);
			}
			
			//actually drawing text
			ctx.fillStyle = self.color;
			for (var y=0; y<boxes.length; y++) {
				ctx.fillText(boxes[flipDir ? (boxes.length-1-y) : y], startCoords[0], startCoords[1] - sn*(px * 1.5 * y));
			}
		}
		
	}

	endConversation() {
		this.convoCurrent = undefined;
		this.line = 0;
		this.lineTime = 0;

		//only do this next bit (releasing the player) if the player was in a conversation with self to begin with
		if (player.convoPartner == this) {
			player.locked = false;
			player.convoPartner = undefined;
			player.dy = 0;
			player.dx = 0;
		}
	}

	executeConversationCommand(command) {
		//first split the command
		var spl = command.split("~");
		//turn all empty strings into undefineds
		spl = spl.map(a => (a == "") ? undefined : a);

		//first component says what type of command it is
		switch (spl[0]) {
			case "ACCEPT":
				this.ecc_accept(spl);
				break;
			case "ANIMATE":
				this.ecc_animate(spl);
				break;
			case  "DELAY":
				this.ecc_delay(spl);
				break;
			case "EXECUTE":
				eval(spl[1]);
				this.finishConversationCommand();
				break;
			case "FILTER":
				this.ecc_filter(spl);
				break;
			case "FOCUS":
				this.ecc_focus(spl);
				break;
			case "LOCK":
				this.ecc_lock();
				break;
			case "MUSIC":
				//really doesn't need to be its own function
				setMusic(spl[1]);
				this.finishConversationCommand();
				break;
			case "PROPERTY":
				this.ecc_property(spl);
				break;
			case "TELEPORT":
				this.ecc_teleport(spl);
				break;
			case "UNLOCK":
				this.ecc_unlock();
				break;
			case "WALK":
				this.ecc_walk(spl);
				break;
			default:
				//get some info and then print what went wrong
				var convosList = Object.keys(data_conversations);
				var thisConvo;
				for (var a=0; a<convosList.length; a++) {
					if (this.convoCurrent == data_conversations[convosList[a]]) {
						thisConvo = convosList[a];
						a = convosList.length + 1;
					}
				}
				console.log(`unknown command ${spl[0]} at line ${this.line} of conversation ${thisConvo}`);
				break;
		}
	}

	finishConversationCommand() {
		this.command_bin1 = undefined;
		this.command_bin2 = undefined;
		this.command_bin3 = undefined;
		this.line += 1;
		this.lineTime = 0;
	}

	//continue to the next line after the user presses whatever button is specified
	ecc_accept(spl) {
		//set up the acceptance
		if (spl[1] == 'down') {
			button_acceptingInput = [spl[2], eval(`() => ${spl[3]}`)];
		} else if (spl[1] == 'up') {
			button_acceptingOutput = [spl[2], eval(`() => ${spl[3]}`)];
		} else {
			console.log(`unknown key state "${spl[1]}"!`);
		}

		this.finishConversationCommand();
	}

	ecc_animate(spl) {
		if (spl[2] != undefined) {
			spl[2] = +spl[2];
		}
		//if it's the player be special
		if (spl[3] == "player") {
			switch (spl[1]) {
				case 'idle':
					player.textureActive = player.textureIdle;
					this.finishConversationCommand();
					break;
				case 'attack':
				// case 'reach':
				case 'crown':
					player.textureActive = {"attack": player.textureAttack, "reach": player.textureReach, "crown": player.textureCrown}[spl[1]];
					if (player.textureActive.frame >= (spl[2] ?? (player.textureActive.frames.length - 1))) {
						this.finishConversationCommand();
					}
					break;
				default:
					console.log(`unknown player animation ${spl[1]}`);
					break;
			}
			return;
		}


		//if it's the idle texture just do that
		if (spl[1] == "idle") {
			this.textureActive = this.textureIdle;
			this.finishConversationCommand();
			return;
		}


		//play the animation
		if (this.textureActive != this.animations[spl[1]]) {
			this.textureActive = this.animations[spl[1]];
			this.textureActive.reset();
		}
		if (this.textureActive.frame >= (spl[2] ?? (this.textureActive.frames.length - 1))) {
			this.finishConversationCommand();
		}
	}

	//delays for a number of ticks specified
	ecc_delay(spl) {
		this.command_bin1 = this.command_bin1 ?? 0;
		this.command_bin1 += 1;
		
		if (this.command_bin1 >= +spl[1]) {
			this.finishConversationCommand();
		}
	}

	//change the opacity of the background filter
	ecc_filter(spl) {
		var useForeground = spl[2] == "f";
		if (this.command_bin1 == undefined) {
			this.command_bin1 = 0;
			this.command_bin2 = useForeground ? render_fgFilterOpacity : render_bgFilterOpacity;
		}

		this.command_bin1 += 1;
		if (useForeground) {
			render_fgFilterOpacity = linterp(this.command_bin2, +spl[1], this.command_bin1 / time_default);
		} else {
			render_bgFilterOpacity = linterp(this.command_bin2, +spl[1], this.command_bin1 / time_default);
		}

		if (this.command_bin1 >= time_default) {
			this.finishConversationCommand();
		}
	}

	//focus the camera on a specific portion of the world
	ecc_focus(spl) {
		spl[1] = spl[1] ?? player.x;
		spl[2] = spl[2] ?? player.y;
		spl[3] = spl[3] ?? camera_xBlocks;
		spl[4] = spl[4] ?? time_default;
		spl[4] = +spl[4];

		//if haven't started yet, start
		if (this.command_bin1 == undefined) {
			this.command_bin1 = [camera.x, camera.y, camera.scale];
			this.command_bin3 = 0;
			return;
		}
		//bin2 has to be refreshed in case the user resizes the screen
		this.command_bin2 = [+spl[1], +spl[2], canvas.width / +spl[3]];

		//move forwards
		this.command_bin3 += 1;
		camera.nextX = easerp(this.command_bin1[0], this.command_bin2[0], this.command_bin3 / spl[4]);
		camera.nextY = easerp(this.command_bin1[1], this.command_bin2[1], this.command_bin3 / spl[4]);
		camera.nextScale = easerp(this.command_bin1[2], this.command_bin2[2], this.command_bin3 / spl[4]);

		//if off the end, finish
		if (this.command_bin3 >= +spl[4]) {
			camera.targetWidth = +spl[3];
			this.finishConversationCommand();
		}
	}

	ecc_lock() {
		//lock the current conversation
		for (var i=this.conversations.length-1; i>-1; i--) {
			if (data_conversations[this.conversations[i][1]] == this.convoCurrent) {
				this.conversations[i][0] = false;
				i = -1;
			}
		}
		this.finishConversationCommand();
	}

	ecc_property(spl) {
		//set some property of the self or other entity
		var entity = this;
		if (spl[3] != undefined) {
			entity = getEntityFromID(spl[3]);
			if (entity == undefined) {
				console.log(`unknown entity ${spl[3]}!`);
				this.finishConversationCommand();
				return;
			}
		}
		entity[spl[1]] = JSON.parse(spl[2]);
		this.finishConversationCommand();
	}

	ecc_teleport(spl) {
		//if targeting an entity other than the self, do that
		var target = this;
		if (spl[3] != undefined) {
			if (spl[3] == "player") {
				target = player;
			} else {
				target = getEntityFromID(spl[3]);
			}
		}

		target.x = +spl[1];
		target.y = +spl[2];
		this.finishConversationCommand();
	}

	//unlocks the next conversation
	ecc_unlock() {
		for (var i=0; i<this.conversations.length-1; i++) {
			if (data_conversations[this.conversations[i][1]] == this.convoCurrent) {
				this.conversations[i+1][0] = true;
				i = this.conversations.length + 1;
			}
		}
		this.finishConversationCommand();
	}

	//move self to a different location
	ecc_walk(spl) {
		//figure out if using absolute coordinates
		var absolute = false;
		if (spl[1] == "^") {
			absolute = true;
			spl.splice(1, 1);
		}

		//figure out which entity is being moved
		var entity = this;
		if (spl[3] != undefined) {
			if (spl[3] == "player") {
				entity = player;
			} else {
				entity = getEntityFromID(spl[3]);
			}
		}

		if (this.command_bin1 == undefined) {
			//set the target and start moving towards it
			this.command_bin1 = absolute ? [+spl[1], +spl[2]] : [entity.x + +spl[1], entity.y + +spl[2]];
			var angle = Math.atan2(+spl[2], +spl[1]);
			entity.dx = entity.dMax * Math.cos(angle);
			entity.dy = entity.dMax * Math.sin(angle);
			entity.a = angle;
		}
		
		//if it's a player, make sure to keep a constant speed (counteract friction)
		if (entity == player) {
			var speed = Math.hypot(entity.dx, entity.dy);
			entity.dx = entity.dx / speed * entity.dMax;
			entity.dy = entity.dy / speed * entity.dMax;
		}
		
		//make sure angle continues to align
		var angle = Math.atan2(this.command_bin1[1] - entity.y, this.command_bin1[0] - entity.x);
		entity.dx = entity.dMax * Math.cos(angle);
		entity.dy = entity.dMax * Math.sin(angle);
		
		//if close enough to the target, stop
		if (distSquared(this.command_bin1[0] - entity.x, this.command_bin1[1] - entity.y) < (entity.dMax * entity.dMax * 3)) {
			entity.dx = 0;
			entity.dy = 0;
			[entity.x, entity.y] = this.command_bin1;
			this.finishConversationCommand();
		}
	}

	startConversation() {
		//turn to face the player maybe
		//I really don't feel like making this a variable or separate function
		if (this.constructor.name != "TileEntity" && this.constructor.name != "Horse") {
			this.a = Math.atan2(player.y - this.y, player.x - this.x);
		}

		//don't start a conversation if there are none to start
		if (this.conversations.length == 0) {
			return;
		}

		//decide which conversation to start
		//start the last one that has a true tag
		var type;
		for (var c=this.conversations.length-1; c>=0; c--) {
			//function / boolean duality
			type = this.conversations[c][0].constructor.name;
			//if it's true
			if ((type == "Function" && this.conversations[c][0]()) || (type == "Boolean" && this.conversations[c][0])) {
				//start that one
				this.convoCurrent = data_conversations[this.conversations[c][1]];
				player.locked = true;
				player.dy = 0;
				player.dx = 0;
				player.convoPartner = this;
				return;
			}
		}
	}

	//forces a conversation to start, even if that conversation isn't necessarily 
	forceConversation(convoID) {
		this.convoCurrent = data_conversations[convoID];
		player.locked = true;
		player.dy = 0;
		player.dx = 0;
		player.convoPartner = this;
	}

	progressConversation() {
		//first make sure it's a text line. If the conversation is currently on a command line, the player can't do anything
		var startChar = this.convoCurrent[this.line][0];
		if (startChar == "|" || startChar == ">") {
			return;
		}

		//if not done displaying all the text characters, do that
		if (getTextAtTime(this.convoCurrent[this.line], 1e1001) != getTextAtTime(this.convoCurrent[this.line], this.lineTime)) {
			this.lineTime = 1e1001;
			return;
		}

		//if done with the line, move on
		this.line += 1;
		this.lineTime = 0;
	}

	tick() {
		super.tick();

		//repel the player
		circleRepelPlayer(this.x, this.y, 0.6);
		
	}
}

//an NPC that can be killed with magic
class NPC_Killable extends NPC {
	constructor(x, y, a, animationData, textColor, conversations, id, extraAnimations, onKill) {
		super(x, y, a, animationData, textColor, conversations, id, extraAnimations);
		this.shield = false;
		this.health = 1;
		this.deathFriction = 0.85;

		this.onKill = onKill;
	}

	beDamaged() {
		//don't die multiple times
		if (this.health == 0) {
			return;
		}

		this.onKill();
		this.health = 0;
		this.opacity = 0.6;

		//move away from the player
		[this.dx, this.dy] = polToXY(0, 0, Math.atan2(this.y - player.y, this.x - player.x), 0.2);
	}

	tick() {
		super.tick();
		if (this.health == 0) {
			this.dx *=this.deathFriction;
			this.dy *= this.deathFriction;

			//if stopped, actually die
			if (distSquared(this.dx, this.dy) < 1e-6) {
				this.DELETE = true;
			}
		}
	}
}

class InvisibleTexter extends NPC {
	constructor(x, y, w, h, conversations, id) {
		super(x, y, 0,  data_textures.NPCS.green, color_textDefault, conversations, id);
		this.width = w;
		this.height = h;
		this.posStore = [];
	}

	draw() {
		this.drawConversation();
	}

	tick() {
		//doesn't need to tick
	}

	startConversation() {
		super.startConversation();
		this.posStore = [this.x, this.y];
		//move to the best position based on where the player activated from

		//what if it's just the player's position?
		this.x = player.x;
		this.y = player.y;
	}

	endConversation() {
		super.endConversation();
		[this.x, this.y] = this.posStore;
	}
}

class Horse extends NPC {
	constructor(x, y, conversations, id) {
		super(x, y, 0, daTex.NPCS.yellow, "#834f1b", conversations, id);
		this.health = 1e1001;
		this.maxHealth = 1e1001;
		this.dMax = 0.18;
		this.r = 2;

		this.home = [x, y];
		this.range = 20;
		this.target = [x, y];
		this.anglesGrazed = [];
		this.grazeTolerance = 0.5;
		this.grazeTime = 0;
		this.grazeTimeRange = [10, 20];

		this.a = randomBounded(0, Math.PI * 2);
		this.aTarget = this.a;

		var d = data_textures;
		var dH = d.Horse;
		this.textureIdle = new Texture(dH.sheet, d.tileSize, ...dH.idle, true);
		this.textureSwish = new Texture(dH.sheet, d.tileSize, ...dH.tailFlick, false);
		this.textureGraze = new Texture(dH.sheet, d.tileSize, ...dH.graze, false);

		this.textureActive = this.textureIdle;

		this.decisionRate = 0.01;
		this.swishChance = 0.2;
		this.grazeChance = 0.1;
		this.moveChance = 0.3;
	}

	angleAlreadyGrazed(angle) {
		this.anglesGrazed.forEach(a => {
			if (modularDifference(angle, a, Math.PI * 2) < this.grazeTolerance) {
				return true;
			}
		});
		return false;
	}

	collide() {
		var relPlayerPos = rotate(player.x - this.x, player.y - this.y, -this.a);
		var rx = 2;
		var ry = 1.1;
		var colliderValue = (relPlayerPos[0] * relPlayerPos[0]) / (rx * rx) + (relPlayerPos[1] * relPlayerPos[1]) / (ry * ry);

		if (colliderValue < 1) {
			//implicit differentiation gives the slope of the line away from an ellipse at any point
			var pushRatio = (relPlayerPos[0] * ry * ry) / (relPlayerPos[1] * rx * rx);
			var pushVec = [0, 1];
			if (pushRatio > 0 || pushRatio < 0) {
				//if it's positive or negative
				pushVec = normalize([Math.abs(pushRatio), Math.sign(pushRatio)]);
				if (relPlayerPos[0] < 0) {
					pushVec[0] *= -1;
					pushVec[1] *= -1;
				}
			} else if (pushRatio == 0) {
				//if it's 0
				pushVec = [0, Math.sign(relPlayerPos[1])];	
			} else {
				//if it's undefined
				pushVec = [Math.sign(relPlayerPos[0]), 0];
			}

			//rotate the pushVector back
			pushVec = rotate(pushVec[0], pushVec[1], this.a);

			//push player away and decrease player's speed
			player.x += pushVec[0] * (1 - colliderValue);
			player.y += pushVec[1] * (1 - colliderValue);
			// player.dx += pushVec[0] * player.speed;
			// player.dy += pushVec[1] * player.speed;
		}
	}

	draw() {
		if (!isOnScreen(this.x - 2, this.y - 2, 4, 4)) {
			return;
		}
		var coords = spaceToScreen(this.x, this.y);

		if (this.blockA != undefined) {
			this.textureBlock.draw(coords[0], coords[1], this.blockA, 2 * this.r * camera.scale);
			if (this.textureBlock.frame >= this.textureBlock.frames.length - 1) {
				this.textureBlock.reset();
				this.blockA = undefined;
			}
		}

		this.textureActive.draw(coords[0], coords[1], this.a, this.r * camera.scale);

		this.drawConversation();
	}

	tick() {
		//if self is too far away, don't bother. This tick is a bit intensive and I don't want it to be wasted
		if (Math.abs(this.x - player.x) > camera.targetWidth || Math.abs(this.y - player.y) > camera.targetWidth * 0.75) {
			return;
		}

		//push the player away
		this.collide();

		//cancel animations potentially
		if (this.textureActive == this.textureSwish && this.textureSwish.frame == this.textureSwish.frames.length - 1) {
			this.textureActive = this.textureIdle;
			this.textureSwish.reset();
		}

		if (this.textureActive == this.textureGraze && this.textureGraze.frame == this.textureGraze.frames.length - 1) {
			this.textureGraze.frame -= 1;
			this.grazeTime -= 1;
			if (this.grazeTime <= 0) {
				this.textureActive = this.textureIdle;
				this.textureGraze.reset();
			}
		}
		
		//don't decide to move if the player is conversing
		if (player.convoPartner == this) {
			return;
		}




		/*
		Horses can stand, swish their tail, graze, or move to a new location.
		They won't graze repeatedly in the same location, so once grazed they must either move or turn
		*/
		//can only already decide to do things in an idle state
		if (this.textureActive != this.textureIdle) {
			this.move();
			return;
		}



		if (Math.random() < this.decisionRate) {
			//has decided to do something
			if (Math.random() < this.swishChance) {
				//initiate tail swish
				this.textureActive = this.textureSwish;
				return;
			}

			



			if (Math.random() < this.grazeChance) {
				this.grazeTime = Math.floor(randomBounded(this.grazeTimeRange[0], this.grazeTimeRange[1]));
				//if already grazed, look for a new location
				if (Math.random() < this.moveChance || this.anglesGrazed.length > 5) {
					//choose that new location
					var r = Math.random() + Math.random();
					var theta = Math.random() * Math.PI * 2;
					if (r > 1) {
						r = 2 - r;
					}
					this.target = polToXY(this.home[0], this.home[1], theta, r * this.range);
				} else {
					//rotate a bit then graze
					var newAngle = randomBounded(0, Math.PI * 2);
					var attempts = 1;
					while (this.angleAlreadyGrazed(newAngle) && attempts < 100) {
						newAngle = randomBounded(0, Math.PI * 2);
						attempts += 1;
					}
					this.aTarget = newAngle;
					this.textureActive = this.textureGraze;
				}
			}
		}

		this.move();
	}

	move() {
		this.x += this.dx;
		this.y += this.dy;

		if (this.target != undefined) {
			//targeting
			//if self is close to the target, stop having it be a target
			if (distSquared(this.x - this.target[0], this.y - this.target[1]) < 1) {
				this.target = undefined;
				this.dx = 0;
				this.dy = 0;
				return;
			}

			//move towards the target potentially
			var angle = Math.atan2(this.target[1] - this.y, this.target[0] - this.x);
			this.aTarget = angle;
			this.a = angle;
			[this.dx, this.dy] = polToXY(0, 0, angle, this.dMax);

			//make sure to not go out of bounds
			if (terrain_surfaces[getWorldData(this.x + this.dx, this.y + this.dy)] == undefined) {
				this.dx = 0;
				this.dy = 0;
				this.target = undefined;
			}
		}

		if (this.aTarget != this.a) {
			//if they're close enough make them the same
			if (modularDifference(this.aTarget, this.a, Math.PI * 2) < 0.01) {
				this.a = this.aTarget;
				return;
			}
			this.textureActive.frame = 0;
			var sign = boolToSigned(this.aTarget > this.a);
			this.a += Math.min(0.05 * sign, (this.aTarget - this.a) / 2);

		}
	}
}



class Player extends Orb {
	constructor(x, y) {
		super(x, y, 1, new Texture(data_textures.Player.sheet, data_textures.tileSize, ...data_textures.Player.idle, true));
		this.walkTimer = 0;
		this.walkTimerMax = 22;
		this.textureAttack;
		this.textureActive = this.textureIdle;

		this.health = 7.5;
		this.maxHealth = 7.5;
		this.respawnPoint = [x, y];

		this.iframes = 0;
		this.iframesMax = 40;

		this.ax = 0;
		this.ay = 0;
		this.collisionR = this.r / 5;
		this.dMax = 0.09;
		this.friction = 0.85;
		this.speed = 0.02;

		this.dashTime = 0;
		this.dashTimeMax = 10;
		this.dashGhostsMax = 4;
		this.dashGhosts = [];
		this.dashSpeedMult = 2;
		this.dashCooldown = 0;
		this.dashCooldownMax = 30;

		this.chocolate = 0;
		
		this.convoPartner = undefined;
		this.locked = false;


		this.weapon = 0;
		this.attacking = false;
		this.damageFrame = 3;
		this.damageDone = false;

		this.magicLearned = false;
		this.magicActive = false;
		this.magicActiveAnim = undefined;
		var dP = data_textures.Player;
		var d = data_textures;
		this.magicChargeAnimation = new Texture(d.Magic.sheet, d.tileSize, ...d.Magic.charge, false);
		this.magicHoldAnimation = new Texture(d.Magic.sheet, d.tileSize, ...d.Magic.hold, true);
		// this.textureReach = new Texture(dP.sheet, d.tileSize, ...dP.reach, false);
		this.textureCrown = new Texture(dP.sheet, d.tileSize, ...dP.crown, false);
	}

	//starts the attack process
	attack_start() {
		if (this.locked) {
			//progress the conversation forwards
			if (this.convoPartner != undefined) {
				this.convoPartner.progressConversation();
			}
		}
		if (this.locked || this.attacking) {
			return;
		}

		//check if self should talk instead
		var entList = this.attack_getHittable();
		if (entList.length > 0) {
			//if one of these is talkable talk instead
			for (var b=0; b<entList.length; b++) {
				if (entList[b].line != undefined && entList[b].conversations.length > 0) {
					entList[b].startConversation();
					return;
				}
			}
		}

		if (this.weapon != 0) {
			this.attacking = true;
			this.textureActive = this.textureAttack;
		}
	}

	//returns a list of the entities hittable by an attack
	attack_getHittable() {
		//self because context is wacky when going into filter functions
		var self = this;
		return world_entities.filter(h => {
			if (h == self) {
				return false;
			}

			//if it's an Invisible Texter collision is special
			if (h.constructor.name == "InvisibleTexter") {
				//if the vision line goes into the entity it's hittable
				var visionCoords = polToXY(self.x, self.y, self.a, 1);
				return (visionCoords[0] > h.x && visionCoords[0] < h.x + h.width && visionCoords[1] > h.y && visionCoords[1] < h.y + h.height);
			}

			var xDist = h.x - self.x;
			var yDist = h.y - self.y;
			
			//make sure distance is within a certain threshold to bother going further
			if (Math.abs(xDist) > 3 || Math.abs(yDist) > 3) {
				return false;
			}


			//regular hitting case

			//rotate backwards to cancel player's rotation and make collision just a rectangle
			[xDist, yDist] = rotate(xDist, yDist, -self.a);

			//the hitbox is a rectangle of size 2.3 x 1.5 roughly centered on the player
			return (xDist > -0.6 && xDist < 1.7 && Math.abs(yDist) < 0.75);
		});
	}

	//the damage-dealing part of the attack
	attack_damage() {
		if (this.convoPartner != undefined) {
			return;
		}

		//get the hittable things
		var hit = false;
		this.attack_getHittable().forEach(e => {
			//do another check for conversation, just in case
			if (e.line != undefined && e.conversations.length > 0) {
				e.startConversation();
				return;
			}
			if (e.health != undefined) {
				hit = true;
				e.health -= weapon_damages[this.weapon];
				e.iframes = e.iframesMax;
				//knockback
				var theta = Math.atan2(e.y - this.y, e.x - this.x);
				e.dx +=	e.dMax * e.knockback * Math.cos(theta);
				e.dy +=	e.dMax * e.knockback * Math.sin(theta);
			}
		});
		audio_sfxChannel.play(hit ? "fxHit" : "fxMiss");
	}

	beDamaged(amount) {
		//play sound if it's a significant amount of damage
		if (amount > 0.4) {
			audio_sfxChannel.play("fxBeHit");
		}
		//don't get damaged if in iframe mode
		if (this.iframes != 0) {
			return;
		}

		this.health -= amount;
		this.iframes = this.iframesMax;
		if (this.health <= 0) {
			this.locked = true;
		}
	}

	changeWeaponTo(n) {
		this.weapon = n;
		data_persistent.weapon = n;
		var d = data_textures;
		var dP = data_textures.Player;
		switch(n) {
			case 0:
				//nothing
				this.textureAttack = undefined;
				this.textureIdle = new Texture(dP.sheet, d.tileSize, ...dP.idle, true);
				break;
			case 1:
				//stick
				this.textureAttack = new Texture(dP.sheet, d.tileSize, ...dP.attackStick, false);
				this.textureIdle = new Texture(dP.sheet, d.tileSize, ...dP.idleStick, true);
				break;
			case 2:
				//sword
				this.textureAttack = new Texture(dP.sheet, d.tileSize, ...dP.attackSword, false);
				this.textureIdle = new Texture(dP.sheet, d.tileSize, ...dP.idleSword, true);
				break;
		}
		this.textureActive = this.textureIdle;
	}

	charge() {
		//if doesn't know magic, or already charging, ignore
		if (this.magicLearned == 0 || this.magicActive) {
			return;
		}

		//if has learned magic, start charging
		this.magicActive = true;
		this.magicActiveAnim = this.magicChargeAnimation;
		this.magicChargeAnimation.reset();
		this.magicHoldAnimation.reset();
	}

	dash() {
		if (this.dashCooldown == 0) {
			this.dashGhosts = [];
			this.dashTime = 1;
			this.dashCooldown = this.dashCooldownMax;
		}
	}

	discharge() {
		var nSpheres;
		//if haven't learned or not using, ignore
		if (!this.magicLearned|| !this.magicActive) {
			return;
		}

		this.magicActive = false;

		//if not charged enough
		if (this.magicActiveAnim == this.magicChargeAnimation) {
			var percentage = this.magicActiveAnim.frame / this.magicActiveAnim.frames.length;
			if (percentage > 0.5) {
				nSpheres = 3;
				for (var a=0; a<nSpheres; a++) {
					world_entities.splice(0, 0, new MagicSphere(this.x, this.y, (a / nSpheres) * (Math.PI * 2), false))
				}
				audio_sfxChannel.play("fxOrbS");
			}
			
			return;
		}

		//release SPHERES
		nSpheres = 8;
		for (var a=0; a<nSpheres; a++) {
			world_entities.splice(0, 0, new MagicSphere(this.x, this.y, (a / nSpheres) * (Math.PI * 2), true))
		}
		audio_sfxChannel.play("fxOrbL");
	}

	draw() {
		var coords = spaceToScreen(this.x, this.y);
		var currentTextureTime = this.textureActive.frame;
		
		//magic
		if (this.magicActive) {
			this.magicActiveAnim.draw(coords[0], coords[1], 0, this.r * 1.25 * camera.scale);
			
			//switch animations if done
			if (this.magicActiveAnim == this.magicChargeAnimation && this.magicActiveAnim.frame >= this.magicActiveAnim.frames.length-1) {
				this.magicActiveAnim = this.magicHoldAnimation;
			}
		}

		//draw ghosts if dashing
		if (this.dashTime > 0) {
			var ghostCoords;
			
			//loop through all ghosts
			for (var ng=0; ng<this.dashGhosts.length; ng++) {
				//set opacity and then draw ghost
				ctx.globalAlpha = ng / this.dashGhosts.length;
				
				this.textureActive.frame = Math.max(0, this.textureActive.frame - ng * this.textureActive.amount);
				ghostCoords = spaceToScreen(this.dashGhosts[ng][0], this.dashGhosts[ng][1]);
				this.textureActive.draw(ghostCoords[0], ghostCoords[1], this.a, this.r * camera.scale);
				this.textureActive.frame = currentTextureTime;
			}
			
			//update dash time
			this.dashTime = (this.dashTime + 1) % this.dashTimeMax;
			this.dashGhosts.push([this.x, this.y]);
			if (this.dashGhosts.length > this.dashGhostsMax) {
				this.dashGhosts.splice(0, 1);
			}
		}
		
		

		//special case if dead
		if (this.health <= 0) {
			this.iframes = this.iframesMax;
			this.textureIdle.frame = this.textureIdle.frames.length-1;
			if (this.magicActive) {
				this.magicActiveAnim.frame = 0;
				this.discharge();
			}
		}
		
		//draw normally
		ctx.globalAlpha = 1 - 0.4 * (this.iframes % render_iframePeriod > render_iframePeriod / 2);
		this.textureActive.draw(coords[0], coords[1], this.a, this.r * camera.scale);

		if (this.attacking) {
			//if switching into the damage frame do the damage
			if (Math.floor(currentTextureTime) != this.damageFrame && Math.floor(this.textureActive.frame) == this.damageFrame) {
				this.attack_damage();
			}

			//if attacking and the attack has ended, reset to normal
			if (this.textureAttack.frame >= this.textureAttack.frames.length - 1) {
				this.textureAttack.reset();
				this.textureActive = this.textureIdle;
				this.attacking = false;
			}
		}
		ctx.globalAlpha = 1;

		//if the editor's active, draw collision info
		if (editor_active) {
			//drawing player's collision bubble
			drawCircle(coords[0], coords[1], this.collisionR * camera.scale, color_editorHighlight);

			//drawing the box of the tiles around self
		}
	}

	respawn() {
		this.iframes = 0;
		this.locked = false;
		this.health = this.maxHealth;
		[this.x, this.y] = this.respawnPoint;
		this.dx = 0;
		this.dy = 0;
	}

	tick() {
		//invincibility frames
		if (this.iframes > 0) {
			this.iframes -= 1;
		}
		//dash cooldown
		if (this.dashCooldown > 0) {
			this.dashCooldown -= 1;
		}


		//if attacking, can't accelerate forwards as well
		var mult = 1;
		var tol = 0.01;
		
		//can't accelerate while dead
		if (this.health <= 0) {
			mult = 0;
		}

		//attacking reduces acceleration, dashing cancels that reduction
		if (this.attacking && this.dashTime == 0) {
			mult = ((this.textureAttack.frame / (this.textureAttack.frames.length-1)) * 2 - 1) ** 6;
		}

		//accelerate and reduce speed due to friction
		var effAX = this.ax * mult * !this.locked;
		var effAY = this.ay * mult * !this.locked;
		this.dx += effAX * this.speed;
		if (this.dx * effAX <= tol) {
			this.dx *= this.friction;
		}

		this.dy += effAY * this.speed;
		if (this.dy * effAY <= tol) {
			this.dy *= this.friction;
		}

		//speed cap
		var speed = Math.hypot(this.dx, this.dy);
		if (speed > this.dMax) {
			this.dx = this.dx / speed * this.dMax;
			this.dy = this.dy / speed * this.dMax;
		}

		
		if (speed < tol) {
			this.walkTimer = 0;
			this.dx = 0;
			this.dy = 0;
			return;
		}

		//change orientation
		this.walkTimer += 1;
		if (this.walkTimer >= this.walkTimerMax) {
			this.walkTimer = 0;
			var effect = terrain_surfaces[getWorldData(this.x, this.y)];
			if (effect != undefined) {
				audio_sfxChannel.play(effect);
			}
		}
		if (this.dashTime == 0) {
			this.updateAngle();
		}

		for (var t=Math.max(1, this.dashSpeedMult * Math.sign(this.dashTime)); t>0; t--) {
			this.x += this.dx;
			this.y += this.dy;
			this.collide();
		}
	}

	updateAngle() {
		if (this.iframes > this.iframesMax - 5) {
			return;
		}
		var previousA = modulate(this.a, Math.PI * 2);
		var nextA = modulate(Math.atan2(this.dy, this.dx), Math.PI * 2);

		//if there's more than pi difference, (prev = 0.1, next = 6.1) adjust the smaller one to be larger
		if (Math.abs(previousA - nextA) > Math.PI) {
			if (nextA - previousA > 0) {
				previousA += Math.PI * 2;
			} else {
				nextA += Math.PI * 2;
			}
		}
		this.a = modulate(linterp(previousA, nextA, 0.4), Math.PI * 2);
	}

	collide() {
		//get the adjacent eight squares to collide with (center doesn't matter because it should always be clear)
		var tu = terrain_tileUnits;
		var collided = false;
		var squarePositions = [[-tu, 0], [0, tu], [tu, 0], [0, -tu], [-tu, -tu], [-tu, tu], [tu, tu], [tu, -tu]];

		//the world position of the center of the square the player is on, relative to the player
		//I have to use modulate because the % operator doesn't actually work correctly with negative numbers
		var centerSquareRelPos = [(tu / 2) - modulate(this.x, tu), (tu / 2) - modulate(this.y, tu)];
		var solidRelPos = [];
		
		//figure out where the solid squares are
		for (var w=0; w<squarePositions.length; w++) {
			if (!this.canWalkAt(this.x + squarePositions[w][0], this.y + squarePositions[w][1])) {
				//push player out of the square, if they're in it
				solidRelPos = [centerSquareRelPos[0] + squarePositions[w][0], centerSquareRelPos[1] + squarePositions[w][1]];

				//first test whether they're in the bounding box of the square
				if (Math.max(Math.abs(solidRelPos[0]), Math.abs(solidRelPos[1])) < this.collisionR + (tu / 2)) {
					var dist;

					if (Math.abs(solidRelPos[0]) > tu / 2 && Math.abs(solidRelPos[1]) > tu / 2) {
						//corner collision
						var cornerPos = [solidRelPos[0] - (tu / 2) * Math.sign(solidRelPos[0]), solidRelPos[1] - (tu / 2) * Math.sign(solidRelPos[1])];
						dist = Math.hypot(cornerPos[0], cornerPos[1]);
						if (dist < this.collisionR) {
							//normalize cornerPos so that it can then be used as a vector to push the player
							cornerPos[0] = cornerPos[0] / -dist;
							cornerPos[1] = cornerPos[1] / -dist;
							dist = this.collisionR - dist;
							this.x += cornerPos[0] * dist;
							this.y += cornerPos[1] * dist;
							collided = true;
						}
					} else if (Math.abs(solidRelPos[0]) < Math.abs(solidRelPos[1])) {
						//vertical collision
						dist = ((tu / 2) + this.collisionR) * Math.sign(solidRelPos[1]);
						this.y -= dist - solidRelPos[1];
						collided = true;
					} else {
						//horizontal collision
						dist = ((tu / 2) + this.collisionR) * Math.sign(solidRelPos[0]);
						this.x -= dist - solidRelPos[0];
						collided = true;
					}
				}
			}
			//if already collided with the edges, don't bother with the corners
			if (w >= 3 && collided) {
				w = squarePositions.length + 1;
			}
		}
	}

	canWalkAt(x, y) {
		return (terrain_surfaces[getWorldData(x, y)] != undefined);
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
		ctx.fillRect(coords[0], coords[1], this.w * camera.scale, this.h * camera.scale);
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


class TileEntity extends NPC {
	constructor(x, y, direction, animationData, conversations, id) {
		super(x, y, direction * Math.PI * 0.5, animationData, color_textDefault, conversations, id);
		this.forceA = this.a;
		this.textureActive = new Texture(data_textures.TileEntities.sheet, data_textures.tileSize, ...animationData, true);
		this.textureBlock = undefined;
	}

	tick() {

	}
}

class Gate {
	constructor(x, y, rotation, id) {
		this.x = x;
		this.y = y;
		this.thickness = 0.25;
		this.r = 1.045;
		this.a = rotation * Math.PI * 0.5;
		this.id = id;
		this.textureRaised = new Texture(data_textures.TileEntities.sheet, data_textures.tileSize, ...data_textures.TileEntities.gate, false);
		this.textureLower = new Texture(data_textures.TileEntities.sheet, data_textures.tileSize, ...data_textures.TileEntities.gateFall, false);
		this.textureActive = this.textureRaised;
	}

	changeStateTo(gateRaised) {
		if (gateRaised) {
			this.textureActive = this.textureRaised;
			return;
		}

		this.textureActive = this.textureLower;
		this.textureLower.reset();
	}

	draw() {
		if (!isOnScreen(this.x - 1.5, this.y - 1.5, 3, 3)) {
			return;
		}

		//draw the texture, etc
		var coords = spaceToScreen(this.x, this.y);

		this.textureActive.draw(coords[0], coords[1], this.a, this.r * camera.scale);
	}

	tick() {
		//potentially collide with player
		if (this.textureActive == this.textureLower || distSquared(player.x - this.x, player.y - this.y) > 2.25) {
			return;
		}

		var playerRelCoords = rotate(player.x - this.x, player.y - this.y, -this.a);
		//if player is intersecting.. make them not intersect
		if (Math.abs(playerRelCoords[1]) < this.thickness) {
			playerRelCoords[1] = playerRelCoords[1] / Math.abs(playerRelCoords[1]) * this.thickness;
			playerRelCoords = rotate(playerRelCoords[0], playerRelCoords[1], this.a);
			player.x = playerRelCoords[0] + this.x;
			player.y = playerRelCoords[1] + this.y;

		}
	}
}


class Texture {
	/**
	 * 
	 * @param {Image} spriteSheet the image source of the texture
	 * @param {Integer} imageSize The number of pixels per texture unit size
	 * @param {Number} drawsBeforeImageChange how many times to draw each frame before switching to the next
	 * @param {Number[]} textureSize how many units the texture is
	 * @param {Number[]} centerCoordinates what unit position should be considered the center. These are the corrdinates that will be rotated around.
	 * @param {Integer[][]} coordinates an array of frame coordinates (EX: [[1, 1], [0, 1], [0, 0]])
	 * @param {Boolean} loop should the texture loop when it's finished? 
	 */
	constructor(spriteSheet, imageSize, drawsBeforeImageChange, textureSize, centerCoordinates, coordinates, loop) {
		this.looping = loop;
		this.dims = textureSize;
		this.center = centerCoordinates;
		this.sheet = spriteSheet;
		this.size = imageSize;
		this.frames = coordinates;
		this.frame = 0;
		this.amount = 1 / drawsBeforeImageChange;
	}

	/**
	 * 
	 * @param {Number} x The x pixel to draw the center of the image at
	 * @param {Number} y The y pixel to draw the center of the image at
	 * @param {Radian} rotation how far to rotate the image clockwise
	 * @param {Number} pxUnitSize How large in pixels one image unit should display
	 */
	draw(x, y, rotation, pxUnitSize) {
		//change current frame
		this.frame += this.amount;
		if (this.frame > this.frames.length - 1) {
			this.frame = this.looping ? (this.frame % this.frames.length) : (this.frames.length - 1);
		}


		//need to offset because drawImage draws from the top left corner
		var iHat = [pxUnitSize * Math.cos(rotation), pxUnitSize * Math.sin(rotation)];
		var jHat = [iHat[1], -iHat[0]];
		var xOff = -this.center[0] * iHat[0] + this.center[1] * jHat[0];
		var yOff = -this.center[0] * iHat[1] + this.center[1] * jHat[1];
		//transforming
		ctx.translate(x + xOff, y + yOff);
		ctx.rotate(rotation);
		try {
			ctx.drawImage(this.sheet, this.size * this.frames[Math.floor(this.frame)][0], this.size * this.frames[Math.floor(this.frame)][1], this.size * this.dims[0], this.size * this.dims[1], 
						0, 0, pxUnitSize * this.dims[0], pxUnitSize * this.dims[1]);
		} catch (error) {
			console.log(error, `problem trying to draw frame ${Math.floor(this.frame)}, with frames ${JSON.stringify(this.frames)}`);
		}
		ctx.rotate(-rotation);
		ctx.translate(-(x + xOff), -(y + yOff));

		//debug info
		// ctx.beginPath();
		// ctx.strokeStyle = "#F00";
		// ctx.moveTo(x, y);
		// ctx.lineTo(x + iHat[0], y + iHat[1]);
		// ctx.stroke();
		// ctx.beginPath();
		// ctx.strokeStyle = "#0F0";
		// ctx.moveTo(x, y);
		// ctx.lineTo(x + jHat[0], y + jHat[1]);
		// ctx.stroke();
	}

	reset() {
		this.frame = 0;
	}
}

class Texture_Terrain {
	/**
	 * Creates a texture that will be used as background (terrain)
	 * @param {Image} sheet The image to use as the terrain texture
	 * @param {Number} tileSize The pixel size of each world unit
	 * @param {Number} x The world x coordinate of the top-left corner of the image
	 * @param {Number} y The world y coordinate of the top-left corner of the image
	 */
	constructor(sheet, tileSize, x, y) {
		this.sheet = sheet;
		this.scale = tileSize;
		this.x = x;
		this.y = y;
		//width and height in tiles
		this.w = 0;
		this.h = 0;
	}

	setupDimensions() {
		if (this.w == 0) {
			this.w = this.sheet.width / this.scale;
			this.h = this.sheet.height / this.scale;
		}
	}

	draw() {
		//first make sure image exists
		this.setupDimensions();


		//don't draw if not on the screen
		if (!isOnScreen(this.x, this.y, this.w, this.h)) {
			return;
		}

		var screenPsheetP = this.scale / camera.scale;

		//sx, sy, sWidth, and sHeight are all in img pixel units
		var sx = (camera.cornerUL[0] - this.x) * this.scale;
		var sy = (camera.cornerUL[1] - this.y) * this.scale;
		var sWidth = Math.min(canvas.width * screenPsheetP, Math.floor(this.sheet.width - sx));//(canvas.width / camera.scale) * this.scale;
		var sHeight = Math.min(canvas.height * screenPsheetP, Math.floor(this.sheet.height - sy));//(canvas.height / camera.scale) * this.scale;

		var px = 0;
		var py = 0;
		var pWidth = sWidth / screenPsheetP;
		var pHeight = sHeight / screenPsheetP;
		ctx.drawImage(this.sheet, sx, sy, sWidth, sHeight, px, py, pWidth, pHeight);
	}
}

class Texture_Roof {
	/**
	 * Creates an entity that acts as a roof for a building. Accepts all different shapes of roofs, and becomes transparent when the player walks underneath it.
	 * @param {Image} sheet the image to use for texture reference
	 * @param {Number} tileSize pixel size of each world unit
	 * @param {Number} sheetX the left texture x coordinate, in world units
	 * @param {Number} sheetY the top texture y coordinate, in world units
	 * @param {Number} x the world x coordinate to start drawing the roof
	 * @param {Number} y the world y coordinate to start drawing the roof
	 * @param {Number} width how wide the roof is, in world units
	 * @param {Number} height how tall the roof is, in world units.
	 * @param {Number[][]} collisionPoly The [x, y] points of the polygon that counts as being under the roof. 
	 * The roof will become transparent if the player is inside this polygon.
	 */
	constructor(sheet, tileSize, sheetX, sheetY, x, y, width, height, collisionPoly) {
		this.sheet = sheet;
		this.scale = tileSize;
		this.sx = sheetX;
		this.sy = sheetY;
		this.x = x;
		this.y = y;
		this.w = width;
		this.h = height;

		this.collider = collisionPoly;
		this.colliderXBounds;
		this.colliderYBounds;
		this.calculateColliderBounds();

		this.alphaTime = 0;
		this.alphaTimeMax = 15;
		this.minOpacity = 0.1;
		this.maxOpacity = 1;
	}

	calculateColliderBounds() {
		this.colliderXBounds = [1e1001, -1e1001];
		this.colliderYBounds = [1e1001, -1e1001];
		this.collider.forEach(p => {
			this.colliderXBounds[0] = Math.min(this.colliderXBounds[0], p[0] - 1);
			this.colliderXBounds[1] = Math.max(this.colliderXBounds[1], p[0] + 1);
			this.colliderYBounds[0] = Math.min(this.colliderYBounds[0], p[1] - 1);
			this.colliderYBounds[1] = Math.max(this.colliderYBounds[1], p[1] + 1);
		});
	}

	tick() {
		//only check collider if the player's nearby
		if (this.alphaTime > 0) {
			this.alphaTime -= 1;
		}
		if (player.x < this.colliderXBounds[0] || player.x > this.colliderXBounds[1] || player.y < this.colliderYBounds[0] || player.y > this.colliderYBounds[1]) {
			return;
		}
		//increase alphaTime when the player is under
		//the inPoly algorithm is slightly broken in that having the same y coordinate as a corner will count as two intersections when it should count as one.
		//To fix this I adjust the y coordinate of the player to something it's very difficult for the player to line up with
		if (inPoly([player.x + 0.01, player.y + 0.01], this.collider)) {
			this.alphaTime = clamp(this.alphaTime + 2, 0, this.alphaTimeMax);
		}
	}

	draw() {
		//first check if self should be drawn at all
		if (!isOnScreen(this.x, this.y, this.w, this.h)) {
			return;
		}


		//draw self
		var screenPos = spaceToScreen(this.x, this.y);
		ctx.globalAlpha = linterp(this.maxOpacity, this.minOpacity, this.alphaTime / this.alphaTimeMax);
		ctx.drawImage(this.sheet, this.sx * this.scale, this.sy * this.scale, this.w * this.scale, this.h * this.scale, screenPos[0], screenPos[1], this.w * camera.scale, this.h * camera.scale);
		ctx.globalAlpha = 1;

		//draw collider in editor
		if (editor_active) {
			drawCircle(screenPos[0], screenPos[1], 10, "#000");

			if (this.collider.length > 1) {
	
				ctx.lineWidth = 2;
				ctx.strokeStyle = color_editorPolygon;
				ctx.beginPath();
				ctx.moveTo(...spaceToScreen(...this.collider[0]));
				for (var h=1; h<this.collider.length; h++) {
					ctx.lineTo(...spaceToScreen(...this.collider[h]));
				}
				ctx.lineTo(...spaceToScreen(...this.collider[0]));
				ctx.stroke();
			}
		}
	}
}