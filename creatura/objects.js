
class Player {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.dx = 0;
		this.dy = 0;
		this.dz = 0;
		this.ax = 0;
		this.ay = -7;
		this.az = 0;

		this.thetaLast = 0;
		this.theta = 0;
		this.phi = 0;

		//constants
		this.speed = 5;
		this.accelPower = 9;
		this.jumpPower = 4;
		this.height = 0.6;
		this.friction = 0.95;
	}

	tick(dt) {
		//theta is changed directly by mouse movements, so thetaLast gives approximate dTheta
		//use change in direction to change what our velocity should be
		var dTheta = this.theta - this.thetaLast;
		[this.dx, this.dz] = rotate(this.dx, this.dz, -dTheta);

		//add to speed via accel
		this.dx = clamp(this.dx + this.ax * dt, -this.speed, this.speed);
		//quick turnarounds
		if (this.dx * this.ax < 0) {
			this.dx *= -1;
		}
		if (this.ax == 0) {
			this.dx *= this.friction;
		}

		this.dz = clamp(this.dz + this.az * dt, -this.speed, this.speed);
		if (this.dz * this.az < 0) {
			this.dz *= -1;
		}
		if (this.az == 0) {
			this.dz *= this.friction;
		}

		//this is wrong. I'm not quite sure why
		var moveVec = polToXY(0, 0, this.theta, this.dx);
		moveVec = polToXY(...moveVec, this.theta + Math.PI / 2, this.dz);

		

		this.dy += this.ay * dt;
		this.y += this.dy * dt;
		//super simple ground collision check. Can't get away with this for anything more complicated than 2.5d but shhhhhh
		if (this.y <= this.height) {
			this.y = this.height;
			this.dy = 0;
		}

		this.thetaLast = this.theta;

		this.subtick(dt / 3, moveVec);
		this.subtick(dt / 3, moveVec);
		this.subtick(dt / 3, moveVec);
	}

	//just move the player and collide with walls. this happens multiple times per frame,
	// like in mario, it prevents clipping through walls with high dt
	subtick(dt, moveVec) {
		this.x += moveVec[0] * dt;
		this.z += moveVec[1] * dt;
		//collide with walls
		var cell = [Math.floor(this.x), Math.floor(this.z)];
		try {
			world_map[cell[1]][cell[0]].collide(this);
		} catch (er) {
			//probably outside map bounds. tbh it doesn't matter that much
		}
	}
}

class C {
	//very basic storage class.
	//plus collision i guess
	constructor(leftType, upType, rightType, downType, entities) {
		this.entities = entities ?? [];
		this.left = leftType;
		this.up = upType;
		this.right = rightType;
		this.down = downType;
	}

	collide(entity) {
		var modH = entity.x % 1;
		var modV = entity.z % 1;

		if (this.left != ' ' && modH < wallThickness) {
			modH = wallThickness;
		}
		if (this.right != ' ' && modH > 1 - wallThickness) {
			modH = 1 - wallThickness;
		}
		if (this.up != ' ' && modV < wallThickness) {
			modV = wallThickness;
		}
		if (this.down != ' ' && modV > 1 - wallThickness) {
			modV = 1 - wallThickness;
		}

		entity.x = Math.floor(entity.x) + modH;
		entity.z = Math.floor(entity.z) + modV;
	}
}

class Creatura {
	constructor(id, x, z, height, textureDat, conversationData, pathFunc) {
		this.x = x;
		this.y = 0.1;
		this.z = z;
		this.id = id;
		this.tex = textureDat;
		this.time = 0;
		this.pathFunc = pathFunc ?? ((t) => {return [x, y]});
		
		this.conversations = conversationData;
		this.convoTime = 0;
		this.convoLine = 0;

	}

	interact() {

	}

	beDrawn() {
		//first figure out how large it should be
		var feetPos = spaceToScreen(this.x, this.y, this.z);
		var midPos = spaceToScreen(this.x, this.y + this.height / 2, this.z);
		var headPos = spaceToScreen(this.x, this.y + this.height, this.z);

		this.tex.beDrawn(x, y, );
	}

	conversePos() {
		return [this.x, this.y + this.height * 0.6, this.z];
	}

	// handleConversation(dt) {
	// 	this.converseTime += 
	// }

	tick(dt) {
		if (conversingWith == this) {
			this.texture.passTime(dt);
		}
		//push player away, be pushed away a bit
		var pVec = [player.x - this.x, player.z - this.z];
		if (distSquared(...pVec) > this.r * this.r) {
			return;
		}

	}
}

class Page {
	constructor(x, z, pageID) {

	}

	interact() {
		//
		//find and destroy self
	}
}



/*
spriteSheet - the image source of the texture
imageSize - how large each individual image is
coordinates - an array, the coordinates of each frame (EX: [[1, 1], [0, 1], [0, 0]])
*/
class Texture {
	constructor(spriteSheet, frameWidth, fps, loopBOOLEAN, frames) {
		this.looping = loopBOOLEAN;
		this.sheet = spriteSheet;
		this.fWidth = frameWidth;
		this.frames = frames;
		this.frame = 0;
		this.fps = fps;
	}

	passTime(dt) {
		this.frame += dt * this.fps;
		if (this.looping) {
			this.frame = this.frame % this.frames.length;
		} else {
			this.frame = Math.min(this.frame, this.frames.length - 1);
		}
	}

	beDrawn(x, y, targetHeight) {
		//actually draw self
		var aspect = (this.fWidth / this.sheet.height);
		var yOff = targetHeight / 2;
		var xOff = yOff * aspect;
		//transforming
		ctx.drawImage(this.sheet, 
					this.fWidth * this.frames[Math.floor(this.frame)], 0, this.fWidth, this.sheet.height, 
					x - xOff, y - yOff, size, targetHeight);
	}

	reset() {
		this.frame = 0;
	}
}