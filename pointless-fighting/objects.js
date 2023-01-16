
//for camera movement
class Camera {
	constructor(x, y, zoom) {
		this.x = x;
		this.y = y;
		this.cornerCoords;

		this.dx = 0;
		this.dy = 0;
		this.speed = 0.2;

		this.scale = zoom;
		this.targetScale = this.scale;
		//all sprites are done at 4/5ths perspective (due to the vertical squish)
	}

	calculateCorners() {
		this.scale = ((this.scale * 7) + this.targetScale) / 8;
		this.cornerCoords = [screenToSpace(0, 0), screenToSpace(canvas.width, canvas.height)];
	}

	tick_free() {
		this.x += this.dx;
		this.y += this.dy;
		this.calculateCorners();
	}

	tick_follow() {
		this.x = player.x;
		this.y = player.y;
		this.calculateCorners();
	}
}

//a general orb creature that can walk, display text, etc
class Creature {
	constructor(x, y, color) {
		this.x = x;
		this.y = y;
		this.color = color;
		this.r = 0.3;

		this.targetPos = [x, y];
	}

	beDrawn() {
		var [drawX, drawY] = spaceToScreen(this.x, this.y);
		var drawR = this.r * camera.scale;

		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.ellipse(drawX, drawY - (drawR * render_vSquish * 0.9), drawR, drawR * 2 * render_vSquish, 0, 0, Math.PI * 2);
		ctx.fill();
	}

	tick() {

	}

	pathTo(x, y) {
		this.targetPos = [x, y];
	}
}


class NPC extends Creature {
	constructor(x, y, color, name, dialogues) {
		super(x, y, color);
		this.name = name;
		this.dialogues = dialogues;

		this.dx = 0;
		this.dy = 0;
		this.dMax = 0.125;

		this.ax = 0;
		this.ay = 0;
		this.aSpeed = 1 / 16;
		this.friction = 0.85;
	}

	beginDialogue() {
		//go through the dialogues, find the last one that's valid
		for (var c=this.dialogues.length-1; c>-1; c--) {
			//checking if the conversation is valid
			if (data_dialogues[this.dialogues[c]].requires == undefined || eval(data_dialogues[this.dialogues[c]].requires) == true) {
				loading_state = new State_Dialogue(data_dialogues[this.dialogues[c]]);
			}
		}
	}

	tick() {
		if (this.targetPos[0] != this.x || this.targetPos[1] != this.y) {
			//figure out if further pathing is required
			var xDiff = this.targetPos[0] - this.x;
			var yDiff = this.targetPos[1] - this.y;
			var dToTarget = Math.sqrt(xDiff ** 2 + yDiff ** 2);
			var aToTarget = (Math.atan2(yDiff, xDiff) + (Math.PI * 2)) % (Math.PI * 2);

			var currentVel = Math.sqrt(this.dx ** 2 + this.dy ** 2);

			var slideDist = this.calculateSlidingDistance(currentVel, this.friction);

			if (dToTarget < slideDist) {
				//if the rest of the way can be done by sliding, then don't accelerate more
				this.ax = 0;
				this.ay = 0;

				//if close enough, snap to the target
				if (dToTarget < 0.01) {
					this.x = this.targetPos[0];
					this.y = this.targetPos[1];
					this.dx = 0;
					this.dy = 0;
				}
			} else {
				//acceleration is necessary in this case
				this.ax = Math.cos(aToTarget) * this.aSpeed;
				this.ay = Math.sin(aToTarget) * this.aSpeed;
			}
		}


		//updating velocity
		if (this.ax == 0) {
			this.dx *= this.friction;
		} else {
			this.dx += this.ax;
		}
		if (this.ay == 0) {
			this.dy *= this.friction;
		} else {
			this.dy += this.ay;
		}

		//normalize if speed is too great
		var velocity = Math.sqrt(this.dx ** 2 + this.dy ** 2);
		if (velocity > this.dMax) {
			this.dx = this.dx / velocity * this.dMax;
			this.dy = this.dy / velocity * this.dMax;
		}

		//updating position
		this.x += this.dx;
		this.y += this.dy;
	}

	pathTo(x, y) {
		this.targetPos = [x, y];
	}

	//given μ (what velocity is multiplied by each frame) and the current velocity, calculate how far self would slide before stopping
	calculateSlidingDistance(velocity, frictionCoefficient) {
		//no. bad. frictionless surfaces are a big no-go.
		if (frictionCoefficient >= 1) {
			return 1e1001;
		}

		//I've decided less than 0.01 blocks / frame is slow enough to be considered stopped
		var stopTolerance = 0.02;
		var trackVelocity = velocity;
		var distance = 0;
		//essentially step through the physics calculations
		while (trackVelocity > stopTolerance) {
			trackVelocity *= frictionCoefficient;
			distance += trackVelocity;
		}

		return distance;
	}
}







//TODO: 'time since attack' system doesn't work properly
//player class
class Player extends Creature {
	constructor(x, y) {
		super(x, y, color_player);
		this.a = 0;
		this.aFriction = 0.7;

		this.dx = 0;
		this.dy = 0;

		this.attackBoxNum = 10;
		this.attackBoxLength = 2.8;
		this.attackBoxRadiusMult = 1.6;
		this.attackFrame = 0;
		this.attackLength = 15;
		this.attackPushMultiplier = 0.4;

		this.friction = 0.85;
		this.locked = false;
		this.dir = 0;
		this.animDir = 0;

		this.speedDash = 1 / 2;
		this.speedMax = 1 / 8;
		this.speedHit = 1 / 16;
		this.speedWalk = 1 / 32;
		

		this.keysDown = [false, false, false, false];
		this.keyPressTimes = [-100, -100, -100, -100];

		this.maxHealth = 6;
		this.health = this.maxHealth;
		this.healthRegen = 1 / 720;
		this.maxStamina = 6;
		this.stamina = this.maxStamina;
		this.staminaRegen = 1 / 180;

		this.dashTimeLimit = 40;
		this.dashStamina = this.maxStamina * 0.1;
		
		this.timeSinceAttack = 15;

		this.texture = data_images.Characters.Player;
	}

	

	//performs an attack
	attack() {
		var xDist;
		var yDist;

		//get list of entities that's possibly close enough
		loading_map.entities.forEach(e => {
			if (e != this) {
				xDist = e.x - this.x;
				yDist = e.y - this.y;

				//an approximation for if it's close enough
				if (Math.abs(xDist) < 3 && Math.abs(yDist) < 3) {
					//true test for if it can be interacted with
					if (this.posIsInteractable(xDist, yDist)) {
						//attack the entity
						this.hitEntity(e);
					}
				}
			}
		});
	}

	//given a position relative to the player, determines whether that position can be interacted with
	posIsInteractable(relativeX, relativeY) {
		//the range of interaction is an ellipse put slightly in front of the player
		var hSquish = 1.69;
		var vSquish = 0.49;
		var xOff = 0.5;
		var yOff = 0;

		//first rotate the relative position by the player's angle, to simplify calculations (in front of the player is always +x)
		[relativeX, relativeY] = rotate(relativeX, relativeY, -this.a);

		return (((relativeX - xOff) ** 2 / hSquish) + ((relativeY - yOff) ** 2 / vSquish) < 1);
	}

	beDrawn() {
		//interaction grid
		if (editor_active) {
			this.drawInteractGrid("#0F0", "#F00");
		}

		super.beDrawn();

		//eyes are based on angle
		var angleSeparation = 0.3;
		if (this.a > -angleSeparation && this.a < Math.PI + angleSeparation) {
			var [drawX, drawY] = spaceToScreen(this.x, this.y);
			var xOff;
			var yOff;
			var drawR = this.r * camera.scale;
			drawY -= (drawR * render_vSquish * 0.9);

			//left eye
			if (this.a < Math.PI - angleSeparation) {
				[xOff, yOff] = polToXY(0, 0, this.a + angleSeparation, drawR);
				yOff *= 0.2;
				drawCircle(color_player_eyes, drawX + xOff, drawY + yOff, drawR / 10);
			}

			//right eye
			if (this.a > angleSeparation) {
				[xOff, yOff] = polToXY(0, 0, this.a - angleSeparation, drawR);
				yOff *= 0.2;
				drawCircle(color_player_eyes, drawX + xOff, drawY + yOff, drawR / 10);
			}
		}
	}

	drawInteractGrid(yesColor, noColor) {
		ctx.globalAlpha = 0.5;
		for (var x=0; x<4; x+=0.1) {
			for (var y=0; y<4; y+=0.1) {
				drawCircle((this.posIsInteractable(x-2, y-2) ? yesColor : noColor), ...spaceToScreen(this.x + x - 2, this.y + y - 2), 5);
			}
		}
		ctx.globalAlpha = 1;
	}

	attemptAttack() {
		if (this.attackFrame == 0) {
			this.attackFrame = 1;
		} else {
			this.timeSinceAttack = 0;
		}
	}

	hitEntity(entity) {
		//if they're an NPC, interact instead of attack
		if (entity.dialogues != undefined) {
			entity.beginDialogue();
			return;
		}

		var strength = 0.8 * sigmoid((this.timeSinceAttack * 0.6) - (this.attackLength * 0.5), 0, 1);
		entity.speed = entity.speedHit;
		entity.moveQueue.splice(0, 0, ((this.a / (Math.PI / 2)) + 2) % 4);
		entity.health -= strength;
	}

	tick() {
		//health regeneration
		if (this.health > 0) {
			this.health = Math.min(this.maxHealth, this.health + (Math.abs(Math.sin(world_time / 90)) * this.healthRegen));
			this.stamina = Math.min(this.maxStamina, this.stamina + (Math.abs(Math.sin(world_time / 90)) * this.staminaRegen));
		}

		//attack related things
		this.timeSinceAttack += 1;
		if (this.attackFrame > 0) {
			this.attackFrame += 1;

			if (this.attackFrame == Math.floor(this.attackLength / 4)) {
				this.attack();
			}

			if (this.attackFrame > this.attackLength) {
				this.attackFrame = 0;
			}
		}

		//movement
		this.updateMomentum();
		this.updatePosition();
	}

	handleInput(negatingBOOLEAN, index) {
		if (negatingBOOLEAN) {
			this.keysDown[index] = false;
			return;
		}

		//if pressing the key
		if (!this.keysDown[index]) {
			this.animDir = index;
			//if it isn't already pressed, press it and refresh the time
			this.keysDown[index] = true;

			//if it's been pressed fast enough, do the boost
			if (world_time - this.keyPressTimes[index] < this.dashTimeLimit) {
				//dashing goes here
				this.keyPressTimes[index] = -1;
			} else {
				this.keyPressTimes[index] = world_time;
			}
		}
	}

	teleport(relativeX, relativeY) {
		this.x += relativeX;
		this.y += relativeY;
	}

	updateMomentum() {
		var xAcc = this.keysDown[2] - this.keysDown[0];
		var yAcc = this.keysDown[3] - this.keysDown[1];
		//update velocity based on acceleration
		if (xAcc == 0) {
			//apply friction if not accelerating
			this.dx *= this.friction;
		} else {
			this.dx += this.speedWalk * xAcc;
		}

		if (yAcc == 0) {
			this.dy *= this.friction;
		} else {
			this.dy += this.speedWalk * yAcc;
		}

		//capping
		var mag = Math.sqrt(this.dx ** 2 + this.dy ** 2);
		if (mag > this.speedMax) {
			this.dx = this.dx / mag * this.speedMax;
			this.dy = this.dy / mag * this.speedMax;
		}

		//updating view angle
		if (yAcc != 0 || xAcc != 0) {
			//atan2 generates a number between pi and -pi, but the player's angle range is between 0 and 2pi
			var targetA = (Math.atan2(yAcc, xAcc) + (Math.PI * 2)) % (Math.PI * 2);

			if (this.a - targetA > Math.PI) {
				targetA += Math.PI * 2;
			} else if (this.a - targetA < -Math.PI) {
				targetA -= Math.PI * 2;
			}

			this.a = (linterp(this.a, targetA, this.aFriction) + Math.PI * 2) % (Math.PI * 2);
		}
	}

	updatePosition() {
		//position updates, if map allows
		if (loading_map.validateMovementTo(Math.round(this.x + this.dx), Math.round(this.y), this)) {
			this.x += this.dx;
		} else {
			this.dx *= this.friction ** 2;
		}

		if (loading_map.validateMovementTo(Math.round(this.x), Math.round(this.y + this.dy), this)) {
			this.y += this.dy;
		} else {
			this.dy *= this.friction ** 2;
		}
	}
}


//general portal class
class Portal {
	constructor(x, y, leadsToZoneID) {
		this.x = x;
		this.y = y;
		this.r = 1;
		this.rBase = this.r;
		this.zone = leadsToZoneID;

		//the edges of the portal, stored as an array of world points relative to the xy area.
		this.edgeStorage = [];

		//the slightly larger bounding box used in place of the screen's normal cornerCoords on the other side of the portal
		this.cornerCoords = [];

		this.absorbing = false;
		this.absorbTime = 0;
	}

	beDrawn() {
		//only draw if there's information to draw
		if (this.edgeStorage.length < 3) {
			return;
		}

		//go around and draw all the edges
		ctx.beginPath();

		//don't bother running spaceToScreen for all points, just run it once and then use that to calculate the other points
		var p1 = spaceToScreen(this.x, this.y);
		var [xHat, yHat] = spaceToScreen(this.x + 1, this.y + 1);
		xHat = xHat - p1[0];
		yHat = yHat - p1[1];
		
		for (var a=0; a<this.edgeStorage.length; a++) {
			ctx.lineTo(p1[0] + xHat * this.edgeStorage[a][0], p1[1] + yHat * this.edgeStorage[a][1]);
		}

		//make sure other side is defined
		if (this.zone == undefined) {
			//draw solid wall
			ctx.fillStyle = color_portal;
			ctx.fill();
			return;
		}
		//setup, draw other side, then reverse setup
		ctx.save();
		ctx.clip();
		var saved = camera.cornerCoords;
		camera.cornerCoords = this.cornerCoords;

		drawBackground();
		this.zone.beDrawn();
		player.beDrawn();

		ctx.restore();
		camera.cornerCoords = saved;
	}

	//says whether the player should be sucked into the portal
	playerIsIn() {
		return false;
	}

	tick() {
		//make sure zone is defined
		if (this.zone.constructor.name == "String") {
			this.zone = getZone(this.zone);
		}

		//make sure edges are defined
		this.calculateEdges();

		//absorb
		if (!this.absorbing && this.playerIsIn()) {
			this.absorbing = true;
		}

		if (this.absorbing) {
			//expand radius
			this.r *= 1 + (this.absorbTime / 100);

			//suck player inwards
			this.doSuckEffects();

			this.absorbTime += 1;

			//if radius is great enough, cancel absorption and switch maps
			if (this.r > Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / camera.scale) {
				this.absorbTime = 0;
				this.r = this.rBase;
				loading_map.entities.splice(loading_map.entities.indexOf(player), 1);
				this.zone.entities.push(player);
				loading_map = this.zone;
				//tick the zone once so that the player is aligned correctly in the map
				this.zone.tick();
			}
		}
	}
}

class Portal_Round extends Portal {
	constructor(x, y, leadsToZoneID) {
		super(x, y, leadsToZoneID);

		this.r = 0.7;
		this.rBoost = 1.05;
		this.rBase = this.r;
		this.rVariance = 0.04;
		this.rTime = 40;

		this.aBase = 0;
		this.aVariance = 0.2;
		this.aTime = 120;

		this.sides = 12;
	}

	calculateEdges() {
		var angularOffset = this.aBase + this.aVariance * Math.sin(world_time / this.aTime);
		this.cornerCoords = [[this.x - (this.r + this.rVariance), this.y - (this.r + this.rVariance)], 
							[this.x + (this.r + this.rVariance), this.y + (this.r + this.rVariance)]]

		//calculate portal sizes
		var okError = 0.01;
		var angle;
		var dist;
		var distStep;
		var pointing;
		var strength;
		var variance;
		var i;
		for (var a=0; a<this.sides; a++) {
			angle =  ((Math.PI * 2 * a) / this.sides) + angularOffset;
			pointing = polToXY(0, 0, angle, 1);
			//portal edges wobble in and out over time, even though the actual strength formula doesn't change
			variance = this.rVariance * Math.cos((world_time / this.rTime) + 5 * angle);

			//start with an initial guess, then approximate the distance to strength=1 and move there repeatedly until close enough
			dist = this.r;
			distStep = this.r / 10;
			i = 100;
			while (i > 0) {
				strength = this.evalStrengthAt(this.x + pointing[0] * dist, this.y + pointing[1] * dist);

				//if the error is ok, break out of the loop
				if (Math.abs(1 - strength) <= okError) {
					break;
				}
				dist += distStep * boolToSigned(strength > 1);
				distStep *= 0.99;
				i -= 1;
			}

			//use the distance to give the new position
			this.edgeStorage[a] = [pointing[0] * (dist + variance), pointing[1] * (dist + variance)];
		}
	}

	doSuckEffects() {
		var playerDir = [player.x - this.x, player.y - this.y];
		player.dx *= player.friction;
		player.dy *= player.friction;

		playerDir[0] *= 0.95;
		playerDir[1] *= 0.95;

		player.x = this.x + playerDir[0];
		player.y = this.y + playerDir[1];
	}

	evalStrengthAt(x, y) {
		//take into account self's x/y, as well as player's x/y
		var val;
		val = 1 / (Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2) / player.r) ** 4;
		val += 1 / (Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2) / this.r);
		return  val;
	}

	playerIsIn() {
		return  Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2) < this.r;
	}
}

class Portal_Polygon extends Portal {
	//edgePointsList is an array of 2d world positions relative to the portal that act as points of boundary polygon
	constructor(x, y, leadsToZoneID, edgePointsList) {
		//x and y coordinates based on where the edges of the portal are
		var bounds = [edgePointsList.reduce((a, b) => Math.min(a, b[0]), 1e1001),
							edgePointsList.reduce((a, b) => Math.max(a, b[0]), -1e1001),
							edgePointsList.reduce((a, b) => Math.min(a, b[1]), 1e1001),
							edgePointsList.reduce((a, b) => Math.max(a, b[1]), -1e1001),
		]
		super(x, y, leadsToZoneID);
		this.cornerCoords = [[x + bounds[0] - 1, y + bounds[2] - 1], [x + bounds[1] + 1, y + bounds[3] + 1]];

		this.edgeGuides = edgePointsList;

		this.pointSeparation = 1;

		//how far forwards / back the portal border can move
		this.aBase = 0.25;
		this.aVariance = 0.2;
		this.aTime = 120;

		//how far in / out the portal border can move
		this.r = 1;
		this.rBase = 1;

		this.rVariance = 0.1;
		this.rTime = 40;
	}

	calculateEdges() {
		//loop through each individual edge and create a set of points along it
		this.edgeStorage = [];
		// this.cornerCoords = [[this.x - 20, this.y - 20], [this.x + 20,this.y + 20]];
		var center;
		var eStart;
		var eEnd;
		var eLen;
		var eSpeed;
		var eTrack = 0;
		var eiHat;
		var ejHat;
		var offsetAmount;
		for (var e=0; e<this.edgeGuides.length; e++) {
			//figure out edge parameters
			eStart = [this.edgeGuides[e][0] * this.r, this.edgeGuides[e][1] * this.r];
			eEnd = [this.edgeGuides[(e+1) % this.edgeGuides.length][0] * this.r, this.edgeGuides[(e+1) % this.edgeGuides.length][1] * this.r];
			
			eLen = Math.sqrt((eEnd[0] - eStart[0]) ** 2 + (eEnd[1] - eStart[1]) ** 2);
			eSpeed = this.pointSeparation / eLen;
			//make sure there are an whole number of points per edge
			eSpeed = 1 / Math.round(1 / eSpeed);
			//set a base eTrack
			eTrack = (this.aBase + this.aVariance * Math.sin(world_time / this.aTime)) / eLen;

			eiHat = [(eEnd[0] - eStart[0]) / eLen, (eEnd[1] - eStart[1]) / eLen];
			ejHat = rotate(...eiHat, Math.PI * 0.5);

			//generating points
			while (eTrack < 1) {
				center = [linterp(eStart[0], eEnd[0], eTrack), linterp(eStart[1], eEnd[1], eTrack)];
				offsetAmount = this.rVariance * Math.cos((world_time / this.rTime) + (eTrack * Math.PI * 4));
				this.edgeStorage.push([center[0] + ejHat[0] * offsetAmount, center[1] + ejHat[1] * offsetAmount]);

				eTrack += eSpeed;
			}
		}

		//put edgeGuides into world coordinates
		// for (var p=0; p<this.edgeStorage.length; p++) {
		// 	this.edgeStorage[p][0] += this.x;
		// 	this.edgeStorage[p][1] += this.y;
		// }
		// this.edgeStorage.forEach(p => {
		// 	p[0] += this.x;
		// 	p[1] += this.y;
		// });
	}

	doSuckEffects() {
		player.dx *= player.friction;
		player.dy *= player.friction;
		
		//move the player to the center of the square they're already on
		var target = [Math.round(player.x), Math.round(player.y)];
		player.x = ((player.x - target[0]) * 0.95) + target[0];
		player.y = ((player.y - target[1]) * 0.95) + target[1];
	}

	playerIsIn() {
		return inPoly([player.x - this.x, player.y - this.y], this.edgeGuides);
	}
}



//map class, for maps y'know?
class Zone {
	constructor(x, y, name, collisionData, display, entities, palettePath, music) {
		this.name = name;
		this.x = x;
		this.y = y;

		//data and display are 2d arrays, entities is a 1d array that gets organized by y coordinate
		this.data = collisionData;
		this.display = display;
		this.entities = entities;

		this.palettePath = palettePath;
		this.palette = eval(`data_images.${palettePath}`);

		this.musicID = music;

		this.dArr = undefined;
	}

	beDrawn() {
		//draw self
		this.dArr = this.display;
		this.beDrawn_images();

		//if there are portals, make sure to put them on top of the map
		//variables for reference
		var ccc = camera.cornerCoords;
		var tol = 2;
		this.entities.forEach(h => {
			//only portals have edge storage
			if (h.edgeStorage != undefined) {
				//only draw if it's close enough
				if (h.x > ccc[0][0] - tol && h.x < ccc[1][0] + tol && h.y > ccc[0][1] - tol && h.y < ccc[1][1] + tol) {
					h.beDrawn();
				}
			}
		});
	}

	beDrawn_collision() {
		//border around the map
		ctx.lineWidth = 2;
		ctx.strokeStyle = color_editor_border;
		var startXY = spaceToScreen(this.x - 0.5, this.y - 0.5);
		var endXY = spaceToScreen(this.x + this.data[0].length - 0.5, this.y + this.data.length - 0.5);
		ctx.rect(startXY[0], startXY[1], endXY[0] - startXY[0], endXY[1] - startXY[1]);
		ctx.stroke();

		//actual squares, just reuses the images function with a different palette
		this.dArr = this.data;
		var palStore = this.palette;
		this.palette = data_images.Empty;
		this.beDrawn_images(true);
		this.dArr = this.display;
		this.palette = palStore;
	}

	beDrawn_images(ignoreEntities) {
		//squares
		//I separate this and then turn it back into an array so it doesn't reference cornerCoords
		var startXY = [...camera.cornerCoords[0]];
		startXY[0] = Math.max(Math.floor(startXY[0]) - this.x, 0);
		startXY[1] = Math.max(Math.floor(startXY[1]) - this.y, 0);
		var pixelStartXY = spaceToScreen(this.x, this.y);
		pixelStartXY[0] = Math.floor(pixelStartXY[0]);
		pixelStartXY[1] = Math.floor(pixelStartXY[1]);

		//the number of tiles to draw for
		var xLen = Math.min(camera.cornerCoords[1][0] - camera.cornerCoords[0][0] + 3, this.data[0].length - startXY[0]);
		var yLen = Math.min(camera.cornerCoords[1][1] - camera.cornerCoords[0][1] + 3, this.data.length - startXY[1]);

		ctx.fillStyle = color_collision;
		var drawXStart = pixelStartXY[0] + 1 + ((startXY[0] - 0.5) * camera.scale);
		var drawYStart = pixelStartXY[1] + 1 + ((startXY[1] - 0.5) * camera.scale * render_vSquish) - (camera.scale * (1 - render_vSquish));
		var entityArrPos = 0;
		for (var y=startXY[1]; y<startXY[1]+yLen; y++) {
			for (var x=startXY[0]; x<startXY[0]+xLen; x++) {
				//draw square
				this.palette.drawTexture(this.dArr[y][x], x, y, drawXStart + ((x - startXY[0]) * camera.scale), drawYStart + ((y - startXY[1]) * camera.scale * render_vSquish), camera.scale);
			}
			//draw the entities for that row, assuming all the entities are in order
			while (!ignoreEntities && entityArrPos < this.entities.length && this.entities[entityArrPos].y - this.y <= y) {
				//don't draw portals
				if (this.entities[entityArrPos].edgeStorage == undefined) {
					this.entities[entityArrPos].beDrawn();
				}
				entityArrPos += 1;
			}
		}

		//entities that fall below the map
		while (!ignoreEntities && entityArrPos < this.entities.length) {
			if (this.entities[entityArrPos].edgeStorage == undefined) {
				this.entities[entityArrPos].beDrawn();
			}
			entityArrPos += 1;
		}
	}

	//TODO: this feels horribly inefficient
	changeCollisionSquare(x, y, newValue) {
		//if y is invalid
		if (y < 0) {
			this.entities.forEach(e => {
				e.y -= y;
			});
		}
		for (y; y<0; y++) {
			this.y -= 1;
			
			this.data.splice(0, 0, []);
			for (var a=0; a<this.data[1].length; a++) {
				this.data[0][a] = " ";
			}
			this.display.splice(0, 0, JSON.parse(JSON.stringify(this.data[0])));
		}
			
		while (y > this.data.length-1) {
			this.data.push([]);
			for (var a=0; a<this.data[0].length; a++) {
				this.data[this.data.length-1][a] = " ";
			}
			this.display.push(JSON.parse(JSON.stringify(this.data[this.data.length-1])));
		}
		
		//if x is invalid
		if (x < 0) {
			//move self
			this.x += x;

			this.entities.forEach(e => {
				e.x -= x;
			});

			//add buffer to all rows
			for (var c=0; c<this.data.length; c++) {
				for (var i=0; i<Math.abs(x-1); i++) {
					this.data[c].splice(0, 0, " ");
					this.display[c].splice(0, 0, " ");
				}
			}
			x = 0;
		}

		if (x >= this.data[0].length) {
			var amount = x - (this.data[0].length - 1);
			for (var c=0; c<this.data.length; c++) {
				for (var i=0; i<amount; i++) {
					this.data[c].push(" ");
					this.display[c].push(" ");
				}
			}
		}

		//set square
		this.data[y][x] = newValue;

		this.removeExcessTiles();
	}

	changeDisplaySquare(x, y, newValue) {
		//only change if in bounds
		if (x >= 0 && x < this.display[0].length && y >= 0 && y < this.display.length) {
			this.display[y][x] = newValue;
		}
	}

	removeExcessTiles() {
		//determine which sides are good
		var removal = [true, true, true, true];
		var removed = [0, 0];
		while (removal[0] + removal[1] + removal[2] + removal[3] > 0) {
			//if the left wall worth removing?
			if (removal[0]) {
				for (var y=0; y<this.data.length; y++) {
					if (this.data[y][0] != " " || this.display[y][0] != " ") {
						removal[0] = false;
					}
				}
				//actual remove
				if (removal[0]) {
					removed[0] += 1;
					for (var y=0; y<this.data.length; y++) {
						this.data[y].splice(0, 1);
						this.display[y].splice(0, 1);
					}
				}
			}

			//is the top wall worth removing
			if (removal[1]) {
				for (var y=0; y<this.data[0].length; y++) {
					if (this.data[0][y] != " " || this.display[0][y] != " ") {
						removal[1] = false;
					}
				}

				if (removal[1]) {
					removed[1] += 1;
					this.data.splice(0, 1);
					this.display.splice(0, 1);
				}
			}

			//right wall
			if (removal[2]) {
				for (var y=0; y<this.data.length; y++) {
					if (this.data[y][this.data[y].length-1] != " " || this.display[y][this.data[y].length-1] != " ") {
						removal[2] = false;
					}
				}
				if (removal[2]) {
					for (var y=0; y<this.data.length; y++) {
						this.data[y].pop();
						this.display[y].pop();
					}
				}
			}

			//lower wall
			if (removal[3]) {
				for (var y=0; y<this.data[this.data.length-1].length; y++) {
					if (this.data[this.data.length-1][y] != " " || this.display[this.data.length-1][y] != " ") {
						removal[3] = false;
					}
				}
				if (removal[3]) {
					this.data.pop();
					this.display.pop();
				}
			}
		}

		//entity coordinate changes
		this.entities.forEach(e => {
			e.x -= removed[0];
			e.y -= removed[1];
		});
	}

	stringifyEntities() {
		var str = ``;
		this.entities.forEach(e => {
			switch (e.constructor.name) {
				case "Spike":
					str += `~SPK_${e.x}_${e.y}_${e.type}`;
					break;
			}
		});
		if (str.length > 0) {
			return `entities${str}`;
		}
		return str;
	}

	tick() {
		//sort entities by y
		this.entities.sort(function (a, b) {
			return a.y - b.y;
		});
		this.entities.forEach(e => {
			e.tick();
		});
	}

	transferPlayerToMap(map) {
		player.teleport(this.x - map.x, this.y - map.y);
		audio_channel1.targetAudio = data_audio[map.musicID];
		loading_map = map;
		this.entities.splice(player);
		loading_map.entities.push(player);
	}

	validateMovementTo(x, y, entity) {
		//first subtract self's x and y, to convert from world coordinates to data coordinates
		x -= this.x;
		y -= this.y;
		//edge cases (literally)
		if (this.data[y] == undefined) {
			return false;
		}
		if (this.data[y][x] == undefined) {
			return false;
		}
		if (this.data[y][x] === " ") {
			return false;
		}

		//loop through entities, if there's an entity there don't allow it
		for (var e=0; e<this.entities.length; e++) {
			if (!this.entities[e].intangible && Math.round(this.entities[e].x) == x && Math.round(this.entities[e].y) == y && this.entities[e] != entity) {
				return false;
			}
		}
		return true;
	}
}