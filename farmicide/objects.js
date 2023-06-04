
class Entity {
	constructor(x, y, owner) {
		this.x = x;
		this.y = y;
		this.owner = owner;
		
		this.r = 0.5;
		this.interactable = false;
	}

	tick() {
		//repel players
		circleRepel(player1, this.x, this.y, this.r);
		circleRepel(player2, this.x, this.y, this.r);
	}

	draw() {

	}
}



class Beacon extends Entity {
	constructor(x, y, owner) {
		super(x, y, owner);
		this.claimR = 8;
	}
}


class Bullet extends Entity {
	constructor(x, y, a, v, owner) {
		super(x, y, owner);
		[this.dx, this.dy] = polToXY(0, 0, a, v);
	}

	tick () {
		//loop through the entities
		//if close to one that doesn't have the same owner as self, damage them
	}

	draw() {

	}
}


class Vendor extends Entity {
	constructor(x, y, itemID) {
		super(x, y, undefined);
		this.r = 1;
		this.itemID = itemID;
		this.cost = entity_data[itemID].price;

		this.interactable = true;
		this.interactText = `Buy ${itemID} (${entity_data[itemID].price}¢)`;
	}

	interact(player) {
		//can't sell to the player if they don't have enough money
		if (player.money < this.cost) {
			return;
		}
		
		//can't give player more than one item
		if (player.bag[0] != undefined && player.bag[0] != this.itemID) {
			return;
		}

		//finally give the player the item
		player.money -= this.cost;
		player.bag[0] = this.itemID;
		player.bag[1] += 1;
	}

	draw() {
		texture_vendors.frame = entity_data[this.itemID].vendorID;
		texture_vendors.draw(...spaceToScreen(this.x, this.y), 0, game_tileSize * 2);
	}
}

class Crop extends Entity {
	constructor(x, y, owner) {
		super(x, y, owner);
		this.claimR = 2;
		this.age = 0;
		this.ageMax = entity_data["corn"].maxAge;
		this.texture = new Texture(image_corn, 120, this.ageMax / 4, [2, 2], [1, 1.75], [[0, 0], [2, 0], [4, 0], [6, 0]], false);
	}

	harvest() {

	}

	tick() {
		super.tick();
		this.age += 1;
	}

	draw() {
		//draw different stage based on age
		var coords = spaceToScreen(this.x, this.y);
		this.texture.draw(coords[0], coords[1], 0, game_tileSize);
	}
}



class Player {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.r = 0.5;
		this.dx = 0;
		this.dy = 0;
		this.accel = 0.02;
		//starting from left, going clockwise
		this.dirsDown = [0, 0, 0, 0];

		this.friction = 0.75;
		this.dSprint = 0.12;
		this.dWalk = 0.1;

		this.sprintTime = 30;
		this.timeDown = 0;

		this.bag = [undefined, 0];
		this.money = player_moneyStart;
		this.health = 100;
		this.healthMax = 100;
		this.regenRate = 0.02;
	}

	tick() {
		//update acceleration
		for (var k=0; k<this.dirsDown.length; k++) {
			if (this.dirsDown[k] > 0) {
				this.dirsDown[k] += 1;
			}
		}
		var ax = this.accel * (+(this.dirsDown[2] > 0) - (this.dirsDown[0] > 0));
		var ay = this.accel * (+(this.dirsDown[3] > 0) - (this.dirsDown[1] > 0));
		var lock = (this.dirsDown[2] > 0 && this.dirsDown[0] > 0) || (this.dirsDown[3] > 0 && this.dirsDown[1] > 0);
		var hasX = this.dirsDown[0] > 0 || this.dirsDown[2] > 0;
		var hasY = this.dirsDown[1] > 0 || this.dirsDown[3] > 0;

		this.timeDown = (hasX || hasY) ? this.timeDown + 1 : 0;

		var dMaxCurrent = (this.timeDown > this.sprintTime) ? this.dSprint : this.dWalk;
		if (!lock || !data_persistent.interactLock) {
			this.dx = clamp(this.dx + ax, -dMaxCurrent, dMaxCurrent);
			this.dy = clamp(this.dy + ay, -dMaxCurrent, dMaxCurrent);
		}

		if (lock && data_persistent.interactLock) {
			hasX = false;
			hasY = false;
		}

		if (!hasX || ax * this.dx < 0) {
			this.dx *= this.friction;
		}
		if (!hasY || ay * this.dy < 0) {
			this.dy *= this.friction;
		}


		//update position
		this.x = clamp(this.x + this.dx, -game_dims[0] / 2, game_dims[0] / 2);
		this.y = clamp(this.y + this.dy, -game_dims[1] / 2, game_dims[1] / 2);

		//repel the other player
		if (player1 != this) {
			circleRepel(player1, this.x, this.y, this.r);
		}
		if (player2 != this) {
			circleRepel(player2, this.x, this.y, this.r);
		}

		//health
		if (data_persistent.regen && this.health > 0) {
			this.health += Math.abs(Math.sin(timer / 100) * this.regenRate);
		}
	}

	//places a bagged entity at a certain xy coordinate
	placeEntityAt(x, y) {
		if (this.bag[0] == undefined) {
			return;
		}

		//entity placement
		var placeEntity = new entity_data[this.bag[0]].obj(x, y, this);
		entities.push(placeEntity);
		updateBoardWith(placeEntity);

		//bag updating
		this.bag[1] -= 1;
		if (this.bag[1] <= 0) {
			this.bag[0] = undefined;
			this.bag[1] = 0;
		}
	}

	//finds the closest interactable entity
	findInteractable() {
		var distCap = 2.5 ** 2;
		var bestEntity, dist;
		for (var e=0; e<entities.length; e++) {
			if (entities[e].constructor.name != "Player") {
				dist = (entities[e].x - this.x) ** 2 + (entities[e].y - this.y) ** 2;
				if (dist < distCap) {
					bestEntity = entities[e];
					distCap = dist;
				}
			}
		}
		return bestEntity;
	}

	interact() {
		var interObj = this.findInteractable();
		if (interObj == undefined) {
			return;
		}
		interObj.interact(this);
	}

	draw() {
		var selfCoords = spaceToScreen(this.x, this.y);
		var startCoords = spaceToScreen(this.x - 0.85, this.y - 2);
		var endCoords = spaceToScreen(this.x + 0.85, this.y);

		//draw box
		var textSize = game_tileSize / 3;
		ctx.fillStyle = color_boxBG2;
		ctx.fillRect(selfCoords[0] - game_tileSize * 1.05, selfCoords[1] - game_tileSize * 4.05, game_tileSize * 2.1, game_tileSize * 1.1);
		ctx.fillStyle = color_boxBG;
		ctx.fillRect(selfCoords[0] - game_tileSize, selfCoords[1] - game_tileSize * 4, game_tileSize * 2, game_tileSize);
		ctx.font = `${textSize}px Lato`;
		var text = [
			(this.findInteractable() ?? {interactText: ``}).interactText,
			(this.bag[0] == undefined) ? `Empty` : `${this.bag[0]} x${this.bag[1]}`,
			this.money + `¢`
		];
		ctx.fillStyle = color_textPlayer;

		for (var t=0; t<text.length; t++) {
			
		}

		ctx.drawImage(image_player, 0, 0, image_player.width, image_player.height, ...startCoords, endCoords[0] - startCoords[0], endCoords[1] - startCoords[1]);
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