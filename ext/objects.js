


class Orb {
	/**
	 * Base orb entity object
	 * @param {Number} x starting x pos
	 * @param {Number} y starting y pos
	 * @param {Number} r radius, in world units
	 * @param {String} layer the layer of the world this entity exists in. There are three layers - 'r', 'g', and 'b', with 'r' being the lowest and 'b' being the highest.
	 * @param {TextureData} textureData the TextureData to give the object. See textures.js
	 */
	constructor(x, y, r, layer, textureData) {
		this.homeX = x;
		this.homeY = y;

		this.x = x;
		this.y = y;
		this._dir = 'd';
		this.dx = 0;
		this.dy = 0;
		this.dMax = 0.09;
		this.da = 0;
		
		this.r = r;
		//if not specified, place on the base layer
		this.layer = layer ?? 'r';

		this.textures = textureData;

		//try to match the texture to the first available idle one
		if (this.textures['d']) {
			this.textureActive = this.textures['d'].idle;
		} else {
			this.textureActive = this.textures['l'].idle;
			this.dir = 'l';
		}

		this.textureActive.frame = randomBounded(0, this.textureActive.frames.length - 1);
		//start idle texture at a random frame
	}

	//I don't like setters, but changing direction always changes texture so it's better to do it this way
	/**
	 * @param {Char} newDir */
	set dir(newDir) {
		//don't bother changing it if they're the same
		if (newDir == this.dir) {
			return;
		}

		if (this.textureActive == undefined) {
			this._dir = newDir;
			return;
		}

		var cTexProgress = this.textureActive.frame;
		try {
			var texs = Object.keys(this.textures[this.dir]);
		} catch (e) {
			console.log(`error with getting textures in ${this.dir}`);
			this._dir = newDir;
			return;
		}

		for (var t=0; t<texs.length; t++) {
			if (this.textures[this.dir][texs[t]] == this.textureActive) {
				this.textureActive = this.textures[newDir][texs[t]];
				//make sure to change the texture's dir, while matching original type + timing
				this.textureActive.frame = cTexProgress;
				//also, of course, set the new dir
				this._dir = newDir;
				return;
			}
		}
		//why is anyone still here?
		console.error(`could not map dir from ${this.dir} -> ${newDir}!`);
	}

	get dir() {
		return this._dir;
	}

	draw(dt) {
		if (!isOnScreen(this.x - this.r, this.y - this.r, this.r * 2, this.r * 2)) {
			return;
		}
		//draw the texture over self
		var coords = spaceToScreen(this.x, this.y);

		// if (this.blockA != undefined && this.textureBlock != undefined) {
		// 	this.textureBlock.draw(coords[0], coords[1], this.blockA, this.r * camera.scale);
		// 	if (this.textureBlock.frame >= this.textureBlock.frames.length - 1) {
		// 		this.textureBlock.reset();
		// 		this.blockA = undefined;
		// 	}
		// }

		this.textureActive.draw(coords[0], coords[1], this.r * camera.scale, dt);
	}

	tick(dt) {
		this.x += this.dx * dt;
		this.y += this.dy * dt;
		if (this.do != 0) {
			this.opacity = clamp(this.opacity + this.do * dt, 0, 1);
		}
	}
}

class MagicSphere extends Orb {
	/**
	 * 
	 * @param {Number} x The world x-coordinate the sphere should spawn at
	 * @param {Number} y The world y-coordinate the sphere should spawn at
	 * @param {String} layer The world layer the sphere will be on
	 * @param {Radian} angle the angle the sphere will travel in
	 * @param {Boolean} large whether the sphere is large or not
	 */
	constructor(x, y, layer, angle, large) { 
		var d = data_textures;
		var dL = data_textures.Magic;
		var dLM = large ? dL.large : dL.small;
		super(x, y, 1 + +large, layer, {d: {idle: new Texture(dL.sheet, d.tileSize, dLM, true)}});
		this.speed = large ? 0.1 : 0.2;
		this.isLarge = large;
		this.dx = this.speed * Math.cos(angle);
		this.dy = this.speed * Math.sin(angle);

		this.age = 0;
		this.ageMax = 10 / 6;

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

	tick(dt) {
		this.age += dt;
		if (this.age >= this.ageMax) {
			this.r -= Math.abs(this.age - this.ageMax) * 0.02;
			if (this.r <= 0.01) {
				this.DELETE = true;
			}
			return;
		}

		var collisionPos = moveInWorld(this.x, this.y, this.dx, this.dy, Math.sqrt(distSquared(this.dx, this.dy)), this.layer);
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
		var eppy = 0.05;
		if (Math.abs(collisionPos[0] - this.x) > eppy || Math.abs(collisionPos[1] - this.y) > eppy) {
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

class NPC extends Orb {
	/**
	 * A non player character entity that exists in the world
	 * @param {Number} x world x coordinate
	 * @param {Number} y world y coordinate
	 * @param {String} layer the layer to exist on
	 * @param {String} dir initial direction to face
	 * @param {TextureData} textureData all texture/animation data
	 * @param {String} textColor text color to display when this entity is engaged in a conversation
	 * @param {Array[]} conversations the list of conversations the entity can participate in
	 * @param {String|undefined} id Optional: the entity's ID, for reference later
	 */
	constructor(x, y, layer, dir, textureData, textColor, conversations, id) {
		//if it's just one string correct the issue
		conversations = conversations ?? [];
		if (conversations.constructor.name == "String") {
			conversations = [[true, conversations]];
		}
		super(x, y, 1.5, layer, textureData);
		this.rPhysical = 1;
		this.dir = dir;
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

	draw(dt) {
		//try to avoid changing the globalAlpha unless necessary
		if (this.opacity != 1) {
			ctx.globalAlpha = this.opacity;
			super.draw(dt);
			ctx.globalAlpha = 1;
		} else {
			super.draw(dt);
		}
		this.drawConversation(dt);
	}

	drawConversation(dt) {
		//don't draw if there's no conversation to draw
		if (this.convoCurrent == undefined) {
			return;
		}
		var cLine = this.convoCurrent[this.line];

		//if off the end of the conversation, leave
		if (cLine == undefined) {
			this.endConversation();
			return;
		}

		this.lineTime += dt;

		//don't bother with blank lines
		if (cLine == "") {
			return;
		}
		
		//handle commands
		if (cLine[0] == "|") {
			this.executeConversationCommand(cLine.slice(1));
			return;
		}

		//if there's an escape character, move to the next line
		var drawText = getTextAtTime(cLine, this.lineTime);
		if (drawText.includes("\\")) {
			this.finishConversationCommand();
			return;
		}

		var drawObj = this;



		//potential drawing as different characters
		if (cLine[0] == "#") {
			if (cLine[1] == "$") {
				try {
					drawObj = getEntityFromID(cLine.slice(2, cLine.indexOf("$", 2)));
				} catch (e) {
					console.error(`${cLine.slice(2, cLine.indexOf("$", 2))} is not a valid entity ID!`);
				}
			} else {
				drawObj = player;
			}
		}


		//draw the actual function
		deferredFunc = () => {drawTextAs(drawObj, drawText);}
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
		spl[3] = spl[3] ?? camera.defaultWidth;
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
	//TODO: what was I trying to say with the end of this sentence? And why in the world didn't I finish it?
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

	tick(dt) {
		super.tick(dt);

		//repel the player
		ellipticalRepelPlayer(this.x, this.y - (this.rPhysical * 0.2), this.rPhysical, this.rPhysical * vScale * vScale);
	}
}

//an NPC that can be killed with magic
class NPC_Killable extends NPC {
	/**
	 * Creates an NPC that can be killed with magic.
	 * @param {Number} x the x-coordinate of the entity
	 * @param {Number} y the y-coordinate of the entity
	 * @param {Char} layer whether the entity exists on the r, g, or b layer
	 * @param {Char} dir the direction the entity initially faces. (u, d, l, or r)
	 * @param {TextureData} textureData the texture data for the entity
	 * @param {String} textColor what color text read by the entity should display as
	 * @param {Array[][]} conversations conversation data
	 * @param {String} id the entity ID
	 * @param {Function} onKill what should happen when the entity is killed
	 */
	constructor(x, y, layer, dir, textureData, textColor, conversations, id, onKill) {
		super(x, y, layer, dir, textureData, textColor, conversations, id);
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
					this.target = polToXY(this.homeX, this.homeY, theta, r * this.range);
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
	constructor(x, y, layer, textures) {
		super(x, y, 0.2, layer, textures ?? {d: {idle: new Texture(data_textures.Warrior.sheet, data_textures.tileSize, data_textures.Warrior.idleFront, true)}});
		this.walkTimer = 0;
		this.walkTimerMax = 22 / 60;

		this.health = 7.5;
		this.maxHealth = 7.5;
		this.respawnPoint = [x, y];

		this.iframes = 0;
		this.iframesMax = 0.7;

		this.ax = 0;
		this.ay = 0;
		this.dMax = 0.09;
		this.friction = 0.85;
		this.speed = 1.2;

		this.dashTime = 0;
		this.dashTimeMax = 1 / 6;
		this.dashGhostsMax = 4;
		this.dashGhosts = [];
		this.dashSpeedMult = 2;
		this.dashCooldown = 0;
		this.dashCooldownMax = 0.5;

		this.chocolate = 0;
		
		this.convoPartner = undefined;
		this.locked = false;

		this.weapon = 0;
		this.attacking = false;
		this.damageFrame = 3;
		this.damageDone = false;
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

	chooseTexture() {
		var tSubset = this.textures[this.dir];
		var oldActive = this.textureActive;

		//choose best texture for currnet situation somehow
		if (this.ax != 0 || this.ay != 0) {
			this.textureActive = tSubset.walk;
		} else {
			this.textureActive = tSubset.idle;
		}
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

	draw(dt) {
		this.chooseTexture();

		var drawR = 1;
		var coords = spaceToScreen(this.x, this.y);
		var currentTextureTime = this.textureActive.frame;
		
		//magic
		if (this.magicActive) {
			this.magicActiveAnim.draw(coords[0], coords[1], 0, drawR * 1.25 * camera.scale);
			
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
				
				this.textureActive.frame = Math.max(0, this.textureActive.frame - ng * dt / this.textureActive.changeTime);
				ghostCoords = spaceToScreen(this.dashGhosts[ng][0], this.dashGhosts[ng][1]);
				this.textureActive.draw(ghostCoords[0], ghostCoords[1], drawR * camera.scale, dt);
				this.textureActive.frame = currentTextureTime;
			}
			
			//update dash time
			this.dashTime += dt;
			if (this.dashTime > this.dashTimeMax) {
				this.dashTime = 0;
			}

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
		this.textureActive.draw(coords[0], coords[1], drawR * camera.scale, dt);

		if (this.attacking) {
			//if switching into the damage frame do the damage
			if (Math.floor(currentTextureTime) != this.damageFrame && Math.floor(this.textureActive.frame) == this.damageFrame) {
				this.attack_damage();
			}

			//if attacking and the attack has ended, reset to normal
			// if (this.textureAttack.frame >= this.textureAttack.frames.length - 1) {
			// 	this.textureAttack.reset();
			// 	this.textureActive = this.textureIdle;
			// 	this.attacking = false;
			// }
		}
		ctx.globalAlpha = 1;

		//if the editor's active, draw collision info
		if (editor_active) {
			//drawing player's collision bubble
			drawCircle(coords[0], coords[1], this.r * camera.scale, color_editorHighlight);
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

	tick(dt) {
		//invincibility frames
		if (this.iframes > 0) {
			this.iframes -= dt;
		}
		//dash cooldown
		if (this.dashCooldown > 0) {
			this.dashCooldown -= dt;
		}

		//update true acceleration
		this.ax = 0;
		this.ay = 0;
		switch (button_queue[button_queue.length-1]) {
			case "Left":
				this.ax = -1;
				this.dir = 'l';
				break;
			case "Up":
				this.ay = -1;
				this.dir = 'u';
				break;
			case "Right":
				this.ax = 1;
				this.dir = 'r';
				break;
			case "Down":
				this.ay = 1;
				this.dir = 'd';
				break;
			default:
				break;
		}


		//if attacking, can't accelerate forwards as well
		var accMult = 1;
		var tol = 0.01 * dt;
		
		//can't accelerate while dead
		if (this.health <= 0) {
			accMult = 0;
		}

		//attacking reduces acceleration, dashing cancels that reduction
		if (this.attacking && this.dashTime == 0) {
			accMult = ((this.textureAttack.frame / (this.textureAttack.frames.length-1)) * 2 - 1) ** 6;
		}
		accMult *= !this.locked;

		//accelerate and reduce speed due to friction
		var effAX = this.ax * accMult * dt;
		var effAY = this.ay * accMult * dt;
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
		this.walkTimer += dt;
		if (this.walkTimer >= this.walkTimerMax) {
			this.walkTimer = 0;
			this.playFootstep();
		}

		if (this.dashTime == 0) {
			this.updateAngle();
		}

		for (var t=Math.max(1, this.dashSpeedMult * Math.sign(this.dashTime)); t>0; t--) {
			this.collide();
		}
	}

	playFootstep() {
		//TODO: footsteps
		// audio_sfxChannel.play(effect);
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
		//the moveInWorld algorithm has proven to ocassionally fling the player halfway across the map. 
		//To prevent this, I check to make sure the player doesn't move too terribly far.
		var oldPos = [this.x, this.y];
		var newPos = moveInWorld(this.x, this.y, this.dx, this.dy, this.r, this.layer);
		var expectedDist = distSquared(this.dx, this.dy) * 0.98;
		var maxMovement = this.dMax * this.dMax * 3.5;
		if (distSquared(newPos[0] - oldPos[0], newPos[1] - oldPos[1]) < maxMovement) {
			[this.x, this.y] = newPos;
		} else {
			//if newPos can't be reached, set it to the currentPos so we know there's an issue
			newPos = [this.x, this.y];
		}

		if (distSquared(oldPos[0] - newPos[0], oldPos[1] - newPos[1]) > expectedDist / 20) {
			return;
		}

		//if there's no movement, try a little to the left and a little to the right
		var mult = this.dMax;
		var perpVel = [-this.ay * mult, this.ax * mult];
		var leftPos = moveInWorld(this.x + perpVel[0], this.y + perpVel[1], this.dx, this.dy, this.r, this.layer);
		var rightPos = moveInWorld(this.x - perpVel[0], this.y - perpVel[1], this.dx, this.dy, this.r, this.layer);
		var leftDist = distSquared(oldPos[0] - leftPos[0], oldPos[1] - leftPos[1]);
		var rightDist = distSquared(oldPos[0] - rightPos[0], oldPos[1] - rightPos[1]);

		rightDist = (rightDist < maxMovement) ? rightDist : 0;
		leftDist = (leftDist < maxMovement) ? leftDist : 0;
		if (leftDist * 0.99 > rightDist && leftDist < maxMovement) {
			[this.x, this.y] = leftPos;
			return;
		}
		
		if (rightDist * 0.99 > leftDist && rightDist < maxMovement) {
			[this.x, this.y] = rightPos;
			return;
		}
	}
}


class Warrior extends Player {
	constructor(x, y, layer) {
		var dW = data_textures.Warrior;
		var t = data_textures.tileSize;
		super(x, y, layer, {
			l: {
				idle: new Texture(dW.sheet, t, dW.idleSide, true, true),
				walk: new Texture(dW.sheet, t, dW.walkSide, true, true)
			},
			u: {
				idle: new Texture(dW.sheet, t, dW.idleBack, true),
				walk: new Texture(dW.sheet, t, dW.walkBack, true)
			},
			r: {
				idle: new Texture(dW.sheet, t, dW.idleSide, true),
				walk: new Texture(dW.sheet, t, dW.walkSide, true)
			},
			d: {
				idle: new Texture(dW.sheet, t, dW.idleFront, true),
				walk: new Texture(dW.sheet, t, dW.walkFront, true)
			}
		});
	}

	changeWeaponTo(n) {
		this.weapon = n;
		data_persistent.weapon = n;
		var d = data_textures;
		var dP = data_textures.Player;
		// switch(n) {		NO LONGER WORKS WITH CURRENT TEXTURE SYSTEM
		// 	case 0:
		// 		//nothing
		// 		this.textureAttack = undefined;
		// 		this.textureIdle = new Texture(dP.sheet, d.tileSize, ...dP.idle, true);
		// 		break;
		// 	case 1:
		// 		//stick
		// 		this.textureAttack = new Texture(dP.sheet, d.tileSize, ...dP.attackStick, false);
		// 		this.textureIdle = new Texture(dP.sheet, d.tileSize, ...dP.idleStick, true);
		// 		break;
		// 	case 2:
		// 		//sword
		// 		this.textureAttack = new Texture(dP.sheet, d.tileSize, ...dP.attackSword, false);
		// 		this.textureIdle = new Texture(dP.sheet, d.tileSize, ...dP.idleSword, true);
		// 		break;
		// }
		this.textureActive = this.textureIdle;
	}
}

class Mage extends Player {
	constructor(x, y, layer) {
		var dM = data_textures.Mage;
		var t = data_textures.tileSize;
		super(x, y, layer, {
			l: {

			},
			u: {

			},
			r: {

			},
			d: {

			}
		})
	}
}


class TileEntity extends NPC {
	constructor(x, y, animationData, conversations, id) {
		super(x, y, "d", animationData, color_textDefault, conversations, id);
		this.forceA = this.a;
	}

	tick() {

	}
}

class DreamSkater extends NPC {
	/**
	 * A Dream Skater is a large, friendly entity that resides in the badlands. It is repelled by magical flow
	 * @param {*} x x position
	 * @param {*} y y position
	 * @param {*} layer world layer
	 * @param {*} id id, if necessary
	 * @param {*} stateSpecifier if you want to set this dream skater to be in a particular state, rather than cycling between them
	 */
	constructor(x, y, layer, id, stateSpecifier) {
		var dS = data_textures.DreamSkaters;
		var t = data_textures.tileSize;
		super(x, y, layer, "l", {
			l: {
				charge: new Texture(dS.sheet, t, dS.charge, true, true),
				idle: new Texture(dS.sheet, t, dS.idle, true, true),
				fly: new Texture(dS.sheet, t, dS.fly, false, true), 
				stretch: new Texture(dS.sheet, t, dS.stretch, false, true),
				sad: new Texture(dS.sheet, t, dS.sad, true, true),
			},
			r: {
				charge: new Texture(dS.sheet, t, dS.charge, true, false),
				idle: new Texture(dS.sheet, t, dS.idle, true, false),
				fly: new Texture(dS.sheet, t, dS.fly, false, false), 
				stretch: new Texture(dS.sheet, t, dS.stretch, false, false),
				sad: new Texture(dS.sheet, t, dS.sad, true, false)
			}
		}, color_dreamSkater, undefined, id)

		this.r = 1.5;
		this.rPhysical = 1.5;
		this.state = "idle";
		this.states = ["idle", "stretch", "charge", "fly"];
		this.stateWeights = [1, 0.9, 0.75, 0.5];
		this.stateTime = this.newStateTime();
		this.stateTimeCurrent = 0;
		this.rotateChance = 0.2;

		this.dMax = 8;
		this.flyRange = 12;
		this.flyGoal;

		//choose specified state by forcing all other weights to 0
		if (stateSpecifier) {
			this.forceState(stateSpecifier);
		}
	}

	forceState(state) {
		this.stateSpecified = state;
		var weights = this.stateWeights;
		this.state = "";
		this.stateWeights = this.stateWeights.fill(0);
		this.stateWeights[this.states.indexOf(state)] = 1;
		this.chooseNewState();
		//set weights back so there's no permanent loss of information
		this.stateWeights = weights;
		this.stateTime = 1e1001;
	}

	tick(dt) {
		//fix in place for the editor
		if (editor_active) {
			return;
		}

		//some states just consist of an animation. Those don't need to show up in the block because they auto-end with the state time
		switch(this.state) {
			case "idle":
			case "idleSad":
				//switch dir every once in a while
				if ((dt_tLast / 1000) % 1 < 0.5 && ((dt_tLast / 1000) - dt) % 1 > 0.5 && Math.random() < this.rotateChance) {
					this.dir = (this.dir == 'l') ? 'r' : 'l';
				}
				break;
			case "fly":
				//little speed fade in / fade out
				var dir = [this.flyGoal[0] - this.x, this.flyGoal[1] - this.y];
				var remaining = Math.sqrt(distSquared(dir[0], dir[1])) + 0.01;
				var dPenult = this.dMax - 0.1;
				var speedTarget = 0.1 + Math.min(dPenult * Math.abs(this.stateTime - 100) ** 0.5, dPenult, dPenult * (remaining ** 0.5));

				dir[0] /= remaining;
				dir[0] *= speedTarget;
				dir[1] /= remaining;
				dir[1] *= speedTarget;

				// console.log(dir, remaining, speedTarget, this.dx, this.dy);

				this.dx = dir[0];
				this.dy = dir[1];

				//pause in the middle of the animation until close to the end
				if (this.textureActive.frame > 1.5 && remaining > this.dMax / 3) {
					this.textureActive.frame = 1;
				}

				//if close enough to the target, end
				if (remaining < 0.1) {
					this.dx = 0;
					this.dy = 0;
					this.chooseNewState();
				}
				break;
		}
		super.tick(dt);
		this.changeStateTime(dt);
	}

	newStateTime() {
		return randomBounded(5, 12.5);
	}

	changeStateTime(dt) {
		this.stateTime -= dt;
		if (this.stateTime < 0) {
			this.chooseNewState();
		}
	}

	chooseNewState() {
		var otherStates = this.states.filter(s => s != this.state);
		var rejected = true;
		var i;
		//some states should happen more frequently than others. This is controlled by stateWeights.
		while (rejected) {
			i = randomInt(0, otherStates.length);
			rejected = (this.stateWeights[this.states.indexOf(otherStates[i])] + Math.random() < 1);
		}
		this.state = otherStates[i];


		//some states require setup
		switch(this.state) {
			case "idle":
				this.textureActive = this.textures[this.dir].idle;
				this.stateTime = this.newStateTime();
				break;
			case "stretch":
				this.textureActive = this.textures[this.dir].stretch;
				this.textureActive.reset();
				this.stateTime = this.textureActive.frames.length * this.textureActive.changeTime;
				break;
			case "charge":
				this.textureActive = this.textures[this.dir].charge;
				this.stateTime = this.newStateTime() * 0.4;
				break;
			case "fly":
				this.textureActive = this.textures[this.dir].fly;
				this.textureActive.reset();
				//choose a target position - dream skaters tend to fly left/right, rather than up/down, so y movement is limited
				var targetXDist = randomBounded(this.flyRange / 2, this.flyRange);
				var targetYDist;
				var xyRatio = 0.33;
				//tend to fly towards the center
				var leftChance = clamp(0.5 + 0.5 * ((this.x - this.homeX) / this.flyRange), 0, 1);
				var left = (Math.random() < leftChance);

				this.dir = left ? 'l' : 'r';

				//don't go outside of the home range:
				//keep x in range
				if (left) {
					targetXDist *= -1;
					targetXDist = Math.max(targetXDist, (this.homeX - this.flyRange) - this.x);
				} else {
					targetXDist = Math.min(targetXDist, (this.homeX + this.flyRange) - this.x);
				}
				targetYDist = (Math.random() > 0.33) ? (targetXDist * xyRatio) : 0;
				if (targetYDist != 0) {
					targetYDist *= boolToSigned(Math.random() > 0.5);
					//keep y in range
					if (Math.abs((this.y + targetYDist) - this.homeY) > this.flyRange) {
						targetYDist *= -1;
					}
				}

				//make sure movement is valid collision-wise. If not, shorten the movement
				var locale = moveInWorld(this.x, this.y, targetXDist, targetYDist, this.r, this.layer);
				while (distSquared(locale[0] - (this.x + targetXDist), locale[1] - (this.y + targetYDist)) > 0.5) {
					targetXDist += (targetXDist > 0) ? -1 : 1;
					targetYDist += (targetYDist > 0) ? -xyRatio : xyRatio;
					locale = moveInWorld(this.x, this.y, targetXDist, targetYDist, this.r, this.layer);

					if (Math.abs(targetXDist) < 1) {
						//just give up if movement isn't possible
						this.chooseNewState();
						return;
					}
				}

				//set target
				this.flyGoal = [this.x + targetXDist, this.y + targetYDist];
				this.stateTime = 100;
				break;
		}
	}

	giveStringData() {
		return rmUndefs(`DreamSkater~${this.homeX.toFixed(1)}~${this.homeY.toFixed(1)}~${this.layer}~${this.id}~${this.stateSpecified}`);
	}
}

/*
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
} */