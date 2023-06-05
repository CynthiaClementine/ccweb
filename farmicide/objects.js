
class Entity {
	constructor(x, y, owner) {
		this.x = x;
		this.y = y;
		this.owner = owner;
		
		this.r = 0.5;
		this.health = 1e1001;
		this.healthMax = this.health;
		this.interactable = false;
	}

	tick() {
		//repel players
		circleRepel(player1, this.x, this.y, this.r);
		circleRepel(player2, this.x, this.y, this.r);

		//increase age, if has it
		if (this.age != undefined) {
			this.age += 1;
		}

		if (this.health <= 0) {
			this.DELETE = true;
		}
	}

	draw() {
		var cord = spaceToScreen(this.x, this.y);
		if (this.health < this.healthMax) {
			drawCircularMeter(cord[0], cord[1], game_tileSize * 0.5, game_tileSize * 0.375, color_health, this.health / this.healthMax);
		}
	}
}


class Beacon extends Entity {
	constructor(x, y, owner) {
		super(x, y, owner);
		this.health = 4;
		this.healthMax = 4;
		this.claimR = 8;
	}

	draw() {
		super.draw();
		var cord = spaceToScreen(this.x, this.y);
		ctx.drawImage(image_beacon, cord[0] - game_tileSize * 0.5, cord[1] - game_tileSize, game_tileSize, game_tileSize);
	}
}


class Bullet extends Entity {
	constructor(x, y, a, v, owner, producer) {
		super(x, y, owner);
		//bullets have a producer tag so entities that are hit know where it originated from
		this.producer = producer;
		this.r = 0.3;
		this.a = a;
		this.v = v;
		[this.dx, this.dy] = polToXY(0, 0, a, v);
	}

	tick() {
		//loop through the entities
		var harmable = entities.filter(e => e != this && e != this.producer && e.health >= 0 && e.owner != (this.owner ?? "uniqueStr"));
		//walls are a special case - ones of the same owner can never be hit, even if in friendly fire mode
		harmable = harmable.filter(w => w.constructor.name != "Rock" || w.owner != this.producer.owner);

		//if close to one, damage them
		for (var h=0; h<harmable.length; h++) {
			if (Math.hypot(this.x - harmable[h].x, this.y - harmable[h].y) < this.v + this.r + harmable[h].r * 0.25) {
				harmable[h].health -= 1;
				if (harmable[h].hitAlert) {
					harmable[h].hitAlert(this.producer);
				}
				this.DELETE = true;
				h = harmable.length + 1;
			}
		}
		//move
		this.x += this.dx;
		this.y += this.dy;

		//if off the screen leave
		var coords = spaceToScreen(this.x, this.y);
		if (Math.abs(coords[0]) > canvas.width / 2 || Math.abs(coords[1]) > canvas.height / 2) {
			this.DELETE = true;
		}
	}

	draw() {
		texture_potato.draw(...spaceToScreen(this.x, this.y), this.a + Math.PI / 2, game_tileSize * this.r * 2);
	}
}

class Chicken extends Entity {

}

class Coin extends Entity {
	constructor(x, y, owner) {
		super(x, y, owner);
		this.r = 0.25;
		this.health = undefined;

		this.dx = 0;
		this.dy = 0;
		this.friction = 0.95;
		this.force = 0.001;
	}

	tick() {
		//be absorbed by players if close enough
		//terrible code but L + ratio + it doesn't matter that much
		if (Math.hypot(this.x - player1.x, this.y - player1.y) < this.r + player1.r) {
			this.DELETE = true;
			player1.money += 1;
			return;
		}
		if (Math.hypot(this.x - player2.x, this.y - player2.y) < this.r + player2.r) {
			this.DELETE = true;
			player2.money += 1;
			return;
		}

		//move towards owner
		if (this.owner == undefined) {
			return;
		}
		var ownVec = [this.owner.x - this.x, this.owner.y - this.y];
		var ownDist = Math.hypot(...ownVec);
		ownVec[0] /= ownDist;
		ownVec[1] /= ownDist;
		this.dx += ownVec[0] * this.force / ownDist;
		this.dy += ownVec[1] * this.force / ownDist;

		this.dx *= this.friction;
		this.dy *= this.friction;

		this.x += this.dx;
		this.y += this.dy;
	}

	draw() {
		//yelow cirlce
		var cd = spaceToScreen(this.x, this.y);
		ctx.fillStyle = color_coin;
		ctx.beginPath();
		ctx.ellipse(cd[0], cd[1], game_tileSize * 0.2, game_tileSize * 0.2, 0, 0, Math.PI * 2);
		ctx.fill();
	}
}

class Crop extends Entity {
	constructor(x, y, owner) {
		super(x, y, owner);
		this.claimR = 1.5;
		this.scatterR = 1.85;
		this.health = 3;
		this.healthMax = 3;
		this.age = 0;
		this.ageMax = 550;
		this.ageMaxTrue = 1200;
		this.harvestTime = 300;
		this.overripeTime = 200;
		this.texture = new Texture(image_corn, 120, this.ageMax / 4, [2, 2], [1, 1.75], [[0, 0], [2, 0], [4, 0], [6, 0]], false);
		this.interactText = `Growing...`;
	}

	interact() {
		//don't do anything while the crop is still growing
		if (this.age < this.ageMax + this.harvestTime) {
			return;
		}

		//if it's ripe, harvest
		this.harvest();
	}

	harvest() {
		//scatter coin (corn?) throughout the land
		var coinNum = Math.floor(10 + getPercentage(this.ageMax + this.harvestTime, this.ageMax + this.harvestTime + this.overripeTime, this.age));
		var r, theta;
		for (var n=0; n<coinNum; n++) {
			r = randomBounded(0, this.scatterR / 2) + randomBounded(0, this.scatterR / 2);
			theta = randomBounded(0, Math.PI * 2);
			entities.push(new Coin(...polToXY(this.x, this.y, theta, r), this.owner));
		}

		//reset age
		this.interactText = `Growing...`;
		this.age = this.ageMax;
	}

	tick() {
		super.tick();
		if (this.age >= this.ageMax + this.harvestTime) {
			this.interactText = `Harvest!`;
		}
		if (this.age > this.ageMaxTrue) {
			this.age = this.ageMaxTrue;
		}
	}

	draw() {
		super.draw();

		//harvest timer
		//draw different stage based on age
		var coords = spaceToScreen(this.x, this.y);
		if (this.age > this.ageMax) {
			drawCircularMeter(coords[0], coords[1], game_tileSize * 0.3, game_tileSize * 0.2, color_cropWindup, (this.age - this.ageMax) / (this.harvestTime));
		}
		this.texture.draw(coords[0], coords[1] + game_tileSize * 0.2, 0, game_tileSize);
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
		this.health = 10;
		this.healthMax = 10;
		this.regenRate = 0.002;
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
		if (data_persistent.regen && this.health > 0 && this.health < this.healthMax) {
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
		var distCap = 2.5;
		var bestEntity, dist;
		for (var e=0; e<entities.length; e++) {
			if (this.couldInteract(entities[e])) {
				dist = Math.hypot(entities[e].x - this.x, entities[e].y - this.y);
				if (dist < distCap) {
					bestEntity = entities[e];
					distCap = dist;
				}
			}
		}
		return bestEntity;
	}

	couldInteract(entity) {
		return (entity.constructor.name != "Player" && entity.owner != ((player1 == this) ? player2 : player1) && entity.interact);
	}

	interact() {
		var interObj = this.findInteractable();
		if (interObj == undefined) {
			//if there's something in our bag, place it
			if (this.bag[0] != undefined) {
				this.placeEntityAt(this.x, this.y);
			}
			return;
		}
		interObj.interact(this);
	}

	draw() {
		var selfCoords = spaceToScreen(this.x, this.y);
		var startCoords = spaceToScreen(this.x - 0.75, this.y - 2);
		var endCoords = spaceToScreen(this.x + 0.95, this.y);
		
		drawCircularMeter(selfCoords[0], selfCoords[1], game_tileSize * 0.5, game_tileSize * 0.375, color_health, this.health / this.healthMax);

		//draw box
		var textSize = game_tileSize / 3;
		ctx.fillStyle = color_boxBG2;
		ctx.fillRect(selfCoords[0] - game_tileSize * 1.35, selfCoords[1] - game_tileSize * 3.05, game_tileSize * 2.7, game_tileSize * 1.1);
		ctx.fillStyle = color_boxBG;
		ctx.fillRect(selfCoords[0] - game_tileSize * 1.3, selfCoords[1] - game_tileSize * 3, game_tileSize * 2.6, game_tileSize);
		var text = [
			(this.findInteractable() ?? {interactText: ``}).interactText,
			(this.bag[0] == undefined) ? `Empty` : `${this.bag[0]} x${this.bag[1]}`,
			this.money + `¢`
		];
		ctx.fillStyle = color_textPlayer;
		ctx.font = `${textSize}px Lato`;
		ctx.textAlign = "center";

		for (var t=0; t<text.length; t++) {
			ctx.fillText(text[t], selfCoords[0], selfCoords[1] - game_tileSize * 3 + textSize * (0.5 + t));
		}

		ctx.drawImage(image_player, 0, 0, image_player.width, image_player.height, ...startCoords, endCoords[0] - startCoords[0], endCoords[1] - startCoords[1]);
	}
}


class Rock extends Entity {
	constructor(x, y, owner) {
		super(x, y, owner);
		this.r = 1;
		this.claimR = 0.5;
		this.health = 5;
		this.healthMax = 5;
	}

	draw() {
		super.draw();
		var cord = spaceToScreen(this.x, this.y);
		ctx.drawImage(image_rock, cord[0] - game_tileSize * 0.5, cord[1] - game_tileSize, game_tileSize, game_tileSize);
	}
}


class Turret extends Entity {
	constructor(x, y, owner) {
		super(x, y, owner);
		this.claimR = 1;
		this.r = 0.75;
		this.a = 0;
		this.target;
		this.range = 24;
		this.health = 5;
		this.healthMax = 5;
		this.fireCooldown = 180;
		this.age = 0;

		this.bodyYOff = 0.8;
		this.priorityList = [
			"Player",
			"Turret",
			"Beacon",
			"Crop",
			"Chicken",
			"Rock",
		];
		this.distancePriority = 5;
		this.entityPriority = 10;
		this.entityPriorityMult = 1.5;
	}

	retarget() {
		var scoreBest = 0;
		var entityBest;
		var trueEnts = entities.filter(e => e != this && e != this.owner && e.owner != (this.owner ?? "un") && this.priorityList.includes(e.constructor.name));
		var score, dist;

		trueEnts.forEach(e => {
			dist =  Math.hypot(e.x - this.x, e.y - this.y);
			if (dist > this.range) {
				return;
			}
			score = (this.entityPriority / (this.entityPriorityMult ** this.priorityList.indexOf(e.constructor.name))) * this.distancePriority / dist;
			if (score > scoreBest) {
				scoreBest = score;
				entityBest = e;
			}
		});

		this.target = entityBest;
	}

	fire() {
		if (this.target == undefined) {
			return;
		}

		//create potato
		var potatoPos = polToXY(this.x, this.y - this.bodyYOff, this.a, 1);
		entities.push(new Bullet(...potatoPos, this.a, bullet_velocity, data_persistent.friendlyFire ? undefined : this.owner, this));
	}

	hitAlert(entity) {
		//target that entity
		this.target = entity;
	}

	tick() {
		super.tick();
		
		//retargeting
		if (!entities.includes(this.target) || this.age % 200 == 0) {
			this.target = undefined;
		}
		if (this.target == undefined || Math.hypot(this.target.x - this.x, this.target.y - this.y) > this.range) {
			this.retarget();
		}

		if (this.target != undefined) {
			this.a = Math.PI + Math.atan2((this.y - this.bodyYOff) - this.target.y, this.x - this.target.x);
		}

		//firing
		if (this.age % this.fireCooldown == 0) {
			this.fire();
		}
	}

	draw() {
		super.draw();
		var cd = spaceToScreen(this.x, this.y);
		texture_turretStand.draw(cd[0], cd[1], 0, game_tileSize);
		texture_turretArm.draw(cd[0], cd[1] - this.bodyYOff * game_tileSize, this.a, game_tileSize / 4);
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