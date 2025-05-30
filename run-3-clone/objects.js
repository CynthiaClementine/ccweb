//houses all classes
class AudioChannel {
	constructor(volume) {
		this.audio = undefined;
		this.target = undefined;
		this.volume = volume;
		this.time = 0;
	}

	tick() {
		//if the current sound isn't played, then play it. Also does looping.
		if (this.audio != undefined) {
			if (this.audio.paused || this.audio.currentTime + audio_tolerance >= this.audio.duration) {
				this.time = 0;
				this.reset();
			}
		}

		//changing audio
		this.change();

		//set volume
		if (this.audio != undefined) {
			this.audio.volume = this.volume * (1 - (this.time / audio_fadeTime));
			if (loading_state instanceof State_World && player.parentPrev != undefined) {
				this.audio.volume *= player.parentPrev.power;
			}
		}
	}

	change() {
		//if the audios are different, fade them out and then play
		if (this.target != this.audio) {
			this.time += 1;

			//if time is up, snap volume up and change audio
			//alternatively, a change from undefined happens instantly
			if (this.time > audio_fadeTime || this.audio == undefined) {
				this.time = 0;
				this.audio = this.target;
				if (this.audio != undefined) {
					this.reset();
				}
				return;
			}
		} else {
			//if the audios are the same and time is greater than 0, subtract time
			if (this.time > 0) {
				this.time -= 1;
			}
		}
	}

	//starts playing the current audio file, from the beginning
	reset() {
		this.audio.currentTime = 0;
		this.audio.volume = this.volume;
		this.audio.play();
	}
}






class Camera {
	constructor(x, y, z, xRot, yRot) {
		this.friction = 0.85;

		this.scale = 200;
		this.sens = 0.04;
		this.speed = 0.05;
		this.aSpeed = 0.8;
		this.speedSettingSelected = 1;
		this.speedSettings = [1 / 8, 1, 10];


		this.x = x;
		this.y = y;
		this.z = z;

		this.targetX = x;
		this.targetY = y;
		this.targetZ = z;

		this.dx = 0;
		this.dy = 0;
		this.dz = 0;
		this.dMax = 12;
		this.dMin = 0.02;

		this.ax = 0;
		this.ay = 0;
		this.az = 0;


		this.theta = yRot;
		this.phi = xRot;
		this.rot = 0;
		this.targetTheta = yRot;
		this.targetPhi = xRot;
		this.targetRot = 0;

		this.rotMatrix = [];
		this.createMatrix();

		this.dt = 0;
		this.dp = 0;
		this.dr = 0;
	}

	createMatrix() {
		//creates a rotation matrix based on the current rotation values
		this.rotMatrix = [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1],
		];
		this.rotMatrix.forEach(b => {
			[b[0], b[2]] = rotate(b[0], b[2], this.theta);
			[b[1], b[2]] = rotate(b[1], b[2], this.phi);
			[b[0], b[1]] = rotate(b[0], b[1], this.rot);
		})
	}

	moveFollow() {
		//changing with average
		this.x = (this.targetX + (this.x * (render_animSteps - 1))) / render_animSteps;
		this.y = (this.targetY + (this.y * (render_animSteps - 1))) / render_animSteps;
		this.z = (this.targetZ + (this.z * (render_animSteps - 1))) / render_animSteps;
		this.theta = (this.targetTheta + (this.theta * (render_animSteps - 1))) / render_animSteps;
		this.phi = (this.targetPhi + (this.phi * (render_animSteps - 1))) / render_animSteps;
		this.rot = (this.targetRot + (this.rot * (render_animSteps - 1))) / render_animSteps;
	}

	moveFree() {
		//velocity: add, then bind max, then apply friction
		var vels = [this.dx, this.dy, this.dz];
		var accs = [this.ax, this.ay, this.az];

		for (var u=0; u<vels.length; u++) {
			//if accelerating, add and keep inside bounds. If not, just apply friction
			vels[u] = (accs[u] != 0) ? clamp(vels[u] + accs[u], -this.dMax, this.dMax) : vels[u] * this.friction;
		}
		[this.dx, this.dy, this.dz] = vels;

		//handling position
		var mvMag = this.speedSettings[this.speedSettingSelected];
		var drMag = Math.min(this.speedSettings[1] * this.aSpeed, this.speedSettings[this.speedSettingSelected] * this.aSpeed);
		//first 3 are for positional offsets, second two are for keeping rotation stable
		var moveDirs = [
			[1, 0, 0], 
			[0, 1, 0], 
			[0, 0, 1],
			polToCart(this.dt * drMag, this.dp * drMag, 1), //the new theta-phi vector
			polToCart(this.dt * drMag, (this.dp * drMag) - 0.05, 1) //a reference to get the rotation from
		];
		
		//transform to be relative to the world
		for (var v=0; v<moveDirs.length; v++) {
			[moveDirs[v][0], moveDirs[v][1]] = rotate(moveDirs[v][0], moveDirs[v][1], -this.rot);
			[moveDirs[v][1], moveDirs[v][2]] = rotate(moveDirs[v][1], moveDirs[v][2], -this.phi);
			[moveDirs[v][0], moveDirs[v][2]] = rotate(moveDirs[v][0], moveDirs[v][2], -this.theta);
		}

		//figure out theta and phi
		var pol = cartToPol(moveDirs[3][0], moveDirs[3][1], moveDirs[3][2]);
		this.theta = pol[0];
		this.phi = pol[1];

		//figure out rotation by reverse transforming
		[moveDirs[4][0], moveDirs[4][2]] = rotate(moveDirs[4][0], moveDirs[4][2], this.theta);
		[moveDirs[4][1], moveDirs[4][2]] = rotate(moveDirs[4][1], moveDirs[4][2], this.phi);
		var calculatedRot = (Math.atan2(-moveDirs[4][0], -moveDirs[4][1]) + Math.PI * 2) % (Math.PI * 2);
		this.rot = ((calculatedRot + this.dr) + Math.PI * 2) % (Math.PI * 2);

		//change magnitude of the inertia
		moveDirs[0] = (Math.abs(this.dx) > this.dMin) ? moveDirs[0].map(a => a * this.dx * mvMag) : [0, 0, 0];
		moveDirs[1] = (Math.abs(this.dy) > this.dMin) ? moveDirs[1].map(a => a * this.dy * mvMag) : [0, 0, 0];
		moveDirs[2] = (Math.abs(this.dz) > this.dMin) ? moveDirs[2].map(a => a * this.dz * mvMag) : [0, 0, 0];
		
		//update positions
		this.x += moveDirs[0][0] + moveDirs[1][0] + moveDirs[2][0];
		this.y += moveDirs[0][1] + moveDirs[1][1] + moveDirs[2][1];
		this.z += moveDirs[0][2] + moveDirs[1][2] + moveDirs[2][2];
	}

	moveGimbals() {
		var drMag = Math.min(this.speedSettings[1] * this.aSpeed, this.speedSettings[this.speedSettingSelected] * this.aSpeed);
		var mvMag = this.speedSettings[this.speedSettingSelected];

		//velocity
		var vels = [this.dx, this.dy, this.dz];
		var accs = [this.ax, this.ay, this.az];
		for (var u=0; u<vels.length; u++) {
			vels[u] = (accs[u] != 0) ? clamp(vels[u] + accs[u], -this.dMax, this.dMax) : vels[u] * this.friction;
		}
		[this.dx, this.dy, this.dz] = vels;

		//position
		var moveCoords = [0, 0, 0];
		if (Math.abs(this.dz) > this.dMin) {
			var toAdd = polToCart(this.theta, this.phi, this.dz * mvMag);
			moveCoords = [moveCoords[0] + toAdd[0], moveCoords[1] + toAdd[1], moveCoords[2] + toAdd[2]];
		}
		if (Math.abs(this.dx) > this.dMin) {
			var toAdd = polToCart(this.theta + (Math.PI / 2), 0, this.dx * mvMag);
			moveCoords = [moveCoords[0] + toAdd[0], moveCoords[1] + toAdd[1], moveCoords[2] + toAdd[2]];
		}
		if (Math.abs(this.dy) > this.dMin) {
			var toAdd = polToCart(0, Math.PI / 2, this.dy * mvMag);
			moveCoords = [moveCoords[0] + toAdd[0], moveCoords[1] + toAdd[1], moveCoords[2] + toAdd[2]];
		}

		//theta, phi, and rot are pretty simple
		this.theta += this.dt * drMag;
		//constrain phi to avoid camera weirdness
		this.phi = clamp(this.phi + this.dp * drMag, -Math.PI / 2, Math.PI / 2);
		this.rot += this.dr * drMag;

		this.x += moveCoords[0];
		this.y += moveCoords[1];
		this.z += moveCoords[2];	
	}

	tick() {
		if (!editor_active) {
			this.moveFollow();
		} else {
			if (data_persistent.settings.gimbal) {
				this.moveGimbals();
			} else {
				this.moveFree();
			}
		}
		this.createMatrix();
	}

	reconcileTargets() {
		this.targetX = this.x;
		this.targetY = this.y;
		this.targetZ = this.z;
		this.targetTheta = this.theta;
		this.targetPhi = this.phi;
		this.targetRot = this.rot;
	}

	snapToTargets() {
		this.x = this.targetX;
		this.y = this.targetY;
		this.z = this.targetZ;
		this.theta = this.targetTheta;
		this.phi = this.targetPhi;
		this.rot = this.targetRot;
	}

	reset() {
		this.rot = 0;
		this.phi = 0;
	}
}


class Character {
	constructor(x, y, z, spriteDataName, dzMax, dxMax, zAccel, xAccel, jumpHeightMin, jumpHeightMax) {
		this.dir_down = [0, Math.PI / 2];
		this.dir_side = [0, 0];
		this.dir_front = [Math.PI / 2, 0];

		//velocities
		this.dMax = dzMax;
		this.strafeMax = dxMax;
		this.fallMax = this.dMax * 1.4;
		
		this.speed = zAccel ?? 0.12;
		this.strafeSpeed = xAccel ?? this.speed * 1.2;

		//jumpStregnth and jumpBoostStrength need to be calculated from jump heights. This happens at the end of the constructor
		this.jumpTime = physics_jumpTime;
		this.jumpStrength = 2;
		this.jumpBoostStrength = 0.1;
		
		
		//coyote frames are frames before the player has landed when a jump will be buffered for later execution.
		//I've since learned that coyote time usually refers to the time after the player leaves the platform (what's handled here with the onGround system)
		//but I'm not going to change it, due to laziness and also "buffer" has more namespace interference
		this.coyote = 0;
		this.coyoteSet = player_coyote;

		this.onIce = false;
		this.onGround = 0;
		
		this.parent = undefined;
		this.parentPrev = undefined;
		this.id = spriteDataName;

		//position, velocity, acceleration
		this.x = x;
		this.y = y;
		this.z = z;

		this.dx = 0;
		this.dy = 0;
		this.dz = this.dMax;

		this.ax = 0;
		this.ay = physics_gravity;
		this.az = 0;
		this.friction = 0.9;
		this.naturalFriction = 0.999;

		this.backwards = false;
		this.r = player_radius;
		this.cameraDist = 1000;
		this.drawR = this.r / getDistance(this, world_camera);
		this.color = color_character;

		this.calculateTextures(spriteDataName);

		this.texture_current = this.texture_jumpF;
		this.textureRot = 1;

		this.calculateJumpParams(jumpHeightMin, jumpHeightMax);
	}

	calculateTextures(spriteDataName) {
		var source = data_sprites[spriteDataName];
		this.texture_walkF = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, true, false, source.walkForwards);
		this.texture_walkL = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, true, false, source.walkLeft);
		this.texture_walkR = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, true, true, source.walkRight);
		this.texture_jumpF = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, false, false, source.jumpForwards);
		this.texture_jumpL = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, false, false, source.jumpSideways);
		this.texture_jumpR = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, false, true, source.jumpSideways);
	}

	calculateJumpParams(minH, maxH) {
		//initial jump strength is relatively easy - use energy
		//E = 0.5mv^2 = mgh
		//mgh = 0.5mv^2
		//sqrt(2gh) = v
		this.jumpStrength = Math.sqrt(2 * this.ay * minH);

		/*jumpBoost is a little bit more difficult - we know that the velocity starts at jumpStrength and will decrease to 0, reaching it at minH.
		if the spacebar is released, the slope will be -ay. If the spacebar is held though, the slope will be -(ay - jumpBoostStrength).
		The maximum amount out of this is jumpTime.

		jumpBoost is a constant velocity added each frame - if we treat all the velocity as if it's added at the start, a CAKE simplification can be used

		Vf^2 = V0^2 + 2aΔy
		0 = (js + jt*jbs)^2 + 2 * a * maxH
		0 = (js + jt*jbs)^2 + 2 * a * maxH
		sqrt(2 * a * maxH) = js + jt*jbs
		(sqrt(2 * a * maxH) - js) / jt = jbs
		*/
		this.jumpBoostStrength = (Math.sqrt(2 * this.ay * maxH) - this.jumpStrength) / this.jumpTime;
	}

	collide() {
		//get the closest strip
		var ref = this.parentPrev;
		var [centerStripOffset, selfTile] = stripTileCoordinates(this.x, this.y, this.z, ref);
		selfTile = Math.floor(selfTile);

		for (var n=-1; n<=1; n++) {
			for (var f=-1; f<=1; f++) {
				if (ref.tiles[modulate(centerStripOffset + f, ref.tiles.length)][selfTile+n] != undefined) {
					ref.tiles[modulate(centerStripOffset + f, ref.tiles.length)][selfTile+n].collideWithEntity(this);
				}
			}
		}
		haltRotation = false;
	}

	giveVelocity() {
		var turnForce = polToCart(this.dir_side[0], this.dir_side[1], this.dx);
		var gravForce = polToCart(this.dir_down[0], this.dir_down[1], this.dy);
		var frontForce = polToCart(this.dir_front[0], this.dir_front[1], this.dz);
		return [
			turnForce[0] + gravForce[0] + frontForce[0],
			turnForce[1] + gravForce[1] + frontForce[1],
			turnForce[2] + gravForce[2] + frontForce[2],
		];
	}

	modifyDerivitives(activeGravity, activeFriction, naturalFriction, activeAX, activeAZ) {
		//decreasing the time to jump
		this.onGround -= 1;
		
		//if player has a parent, change gravity based on parent power
		if (this.onGround < physics_graceTime - 2) {
			this.dy -= linterp(activeGravity * 0.8, activeGravity, this.parentPrev.power);
		} else {
			//if the player's on the ground, make sure dy is capped
			if (this.dy < -1) {
				this.dy = -1;
			}
		}

		//jump boost
		if (this.onGround <= 0 && controls_spacePressed && this.jumpTime > 0) {
			this.dy += this.jumpBoostStrength;
			this.jumpTime -= 1;
		}
		
		//cap falling speed
		if (this.dy < -this.fallMax) {
			this.dy = -this.fallMax;
		}

		//calculate true ax (different from active AX, I know this makes no sense but trust me the sigmoid is important)
		if (activeAX != 0) {
			var volume = ((this.strafeMax + (this.dx * boolToSigned(activeAX < 0))) / this.strafeMax) * 9 - 2;
			activeAX = sigmoid(volume, 0, Math.abs(activeAX)) * boolToSigned(activeAX > 0);
		}
		this.dx += activeAX;
		if (this.ax == 0 || this.ax * this.dx < 0) {
			this.dx *= activeFriction;
		}
		this.dx = clamp(this.dx, -this.strafeMax, this.strafeMax);


		//accelerate if too slow
		this.az = ((this.az * 5) + activeAZ) / 6;

		if (Math.abs(this.dz) < this.dMax) {
			this.dz += this.az;
		} else {
			//natural friction
			this.dz *= naturalFriction;
		}
		
	}

	tick() {
		//getting camera distance, for draw radius use a reference point to be more accurate
		this.cameraDist = getDistance(this, world_camera);
		var p1 = spaceToCamera([this.x, this.y, this.z]);
		var p2 = [p1[0], p1[1] + this.r, p1[2]];

		this.drawR = getDistance2d(cameraToScreen(p1), cameraToScreen(p2));

		//setting camera position
		this.setCameraPosition();

		//only do the other tick actions if camera is close enough
		if (this.cameraDist > 1000 || editor_active) {
			return;
		}

		//ticking coyote frames / jumping
		if (this.coyote > 0) {
			this.handleSpace();
			this.coyote -= 1;
		}

		//TODO: this code is ugly and also probably slow. Refactor when / if possible
		if (this.parent != undefined) {
			if (!this.parent.coordinateIsInTunnel(this.x, this.y, this.z, true)) {
				//if in the void, change physics
				var voidStrength = spaceToRelativeRotless(this.parent.centerPos, [this.x, this.y, this.z], this.dir_down)[2] / this.parent.r;
				if (this.parent.playerTilePos > this.parent.len - 0.5) {
					voidStrength *= -0.7;
					//if the player off the end of the tunnel and is above the midpoint, make them go down faster
					if (voidStrength > 0) {
						voidStrength *= 1.8;
					}
				}
				this.modifyDerivitives(this.ay * 0.7 * (voidStrength), 0.95 + (0.0501 * (this.onGround <= 0)), this.naturalFriction, this.ax * 1.5, this.speed / 2);
				//void spin
				this.textureRot += render_voidSpinSpeed;
			} else {
				//in the tunnel
				//restore proper spin
				if (Math.abs(this.textureRot - this.dir_down[1]) > render_voidSpinSpeed * 3) {
					this.textureRot = modulate((this.textureRot + (render_voidSpinSpeed * 3)), Math.PI * 2);

					//if the spin is close enough now, reset it
					if (Math.abs(this.textureRot - this.dir_down[1]) < render_voidSpinSpeed * 3) {
						this.textureRot = this.dir_down[1];
					}
				}
				//don't accelerate if dz is too great, and reduce friction if on ice
				this.modifyDerivitives(this.ay, this.friction, this.naturalFriction, this.ax * (this.onIce ? 0.8 : 1), this.speed * (Math.abs(this.dz) <= this.dMax * 1.1));
			}
		}

		//moving according to forces
		var motion = this.giveVelocity();

		this.x += motion[0];
		this.y += motion[1];
		this.z += motion[2];

		//colliding with tiles
		this.collide();

		//choose texture
		this.chooseTexture();
	}

	beDrawn() {
		if (!isClipped([this.x, this.y, this.z])) {
			var [tX, tY] = spaceToScreen([this.x, this.y, this.z]);
			if (this.backwards) {
				this.texture_current.beDrawn(tX, tY, ((Math.PI * 0.5) - this.textureRot) - world_camera.rot, this.drawR * 2);
			} else {
				this.texture_current.beDrawn(tX, tY, this.textureRot - (Math.PI * 0.5) - world_camera.rot, this.drawR * 2);
			}

			this.syncTextures();

			if (editor_active) {
				drawCrosshair([this.x, this.y, this.z], this.dir_side, this.dir_down, this.dir_front);
			}
		}
	}

	chooseTexture() {
		if (this.onGround > 0) {
			//walking texture
			if (this.ax == 0) {
				//center
				this.texture_current = this.texture_walkF;
				return;
			}
			if (this.ax < 0) {
				//left
				this.texture_current = this.texture_walkL;
				return;
			}
			
			this.texture_current = this.texture_walkR;
			return;
		}

		//jumping texture
		if (this.ax == 0) {
			//center
			this.texture_current = this.texture_jumpF;
		} else if (this.ax < 0) {
			//left
			this.texture_current = this.texture_jumpL;
		} else {
			//right
			this.texture_current = this.texture_jumpR;
		}
		//reset ground animations when jumping
		this.texture_walkF.reset();
		this.texture_walkR.reset();
		this.texture_walkL.reset();

		//reset if moving upwards
		if (this.dy > 0) {
			this.texture_current.reset();
		}
	}

	setCameraPosition() {
		var vertOffset = polToCart(this.dir_down[0], (!data_persistent.settings.altCamera * this.dir_down[1]) + (data_persistent.settings.altCamera * (world_camera.rot + (Math.PI / 2))), 70);
		//target distance varies with forwards velocity to correct for camera lagging behind the player
		var horizOffset = polToCart(this.dir_front[0], this.dir_front[1], -95 + camera_zCorrection * this.dz);
		world_camera.targetX = this.x + vertOffset[0] + horizOffset[0];
		world_camera.targetY = this.y + vertOffset[1] + horizOffset[1];
		world_camera.targetZ = this.z + vertOffset[2] + horizOffset[2];
	}

	syncTextures() {
		//if on the ground, sync all walking animations
		if (this.onGround > 0) {
			//decrement current frame if not moving forwards
			if (Math.abs(this.dz) <= this.speed && Math.abs(this.ax) < 0.02) {
				this.texture_current.frame = 0;
			}
			this.textureRot = this.dir_down[1];
			this.texture_walkF.frame = this.texture_current.frame;
			this.texture_walkL.frame = this.texture_current.frame;
			this.texture_walkR.frame = this.texture_current.frame;
			return;
		}
		
		//syncing all jumping animations if not walking
		this.texture_jumpF.frame = this.texture_current.frame;
		this.texture_jumpL.frame = this.texture_current.frame;
		this.texture_jumpR.frame = this.texture_current.frame;
	}

	turnAround() {
		//switch direction and change down angle so the tiles are a w a r e
		this.backwards = !this.backwards;
		this.dir_down = [this.dir_down[0], this.dir_down[1] + 0.02];
	}

	handleSpace() {
		if (this.coyote == 0) {
			this.coyote = this.coyoteSet;
		}

		if (this.onGround > 0) {
			this.coyote = 0;
			this.dy = this.jumpStrength;
			this.jumpTime = physics_jumpTime;
			this.onGround = 0;
		}
	}
}

/*
spriteSheet - the image source of the texture
imageSize - how large each individual image is
coordinates - an array, the coordinates of each frame (EX: [[1, 1], [0, 1], [0, 0]])
*/
class Texture {
	constructor(spriteSheet, imageSize, drawsBeforeImageChange, loopBOOLEAN, invertDirectionBOOLEAN, coordinates) {
		this.looping = loopBOOLEAN;
		this.backwards = invertDirectionBOOLEAN;
		this.sheet = spriteSheet;
		this.size = imageSize;
		this.frames = coordinates;
		this.frame = 0;
		this.amount = 1 / drawsBeforeImageChange;
	}

	beDrawn(x, y, rotation, size) {
		//change current frame
		this.frame += (this.amount * (1 + data_persistent.settings.halfRender));
		if (this.frame > this.frames.length - 1) {
			this.frame = this.looping ? (this.frame % this.frames.length) : (this.frames.length - 1);
		}


		//actually draw self
		var xOff = size * 0.7071 * Math.cos(rotation - (Math.PI * 0.75));
		var yOff = size * 0.7071 * Math.sin(rotation - (Math.PI * 0.75));
		//transforming
		ctx.translate(x + xOff, y + yOff);
		ctx.rotate(rotation);
		if (this.backwards) {
			ctx.scale(-1, 1);
			ctx.drawImage(this.sheet, this.size * (this.frames[Math.floor(this.frame)][0] + 1), this.size * this.frames[Math.floor(this.frame)][1], -1 * this.size, this.size, 
							0, 0, -1 * size, size);
			ctx.scale(-1, 1);
			
		} else {
			try {
			ctx.drawImage(this.sheet, this.size * this.frames[Math.floor(this.frame)][0], this.size * this.frames[Math.floor(this.frame)][1], this.size, this.size, 
							0, 0, size, size);
			} catch (error) {
				console.log(error, `problem trying to draw frame ${Math.floor(this.frame)}, with frames ${JSON.stringify(this.frames)}`);
			}
		}
		ctx.rotate(-1 * rotation);
		ctx.translate(-1 * (x + xOff), -1 * (y + yOff));
	}

	reset() {
		this.frame = 0;
	}
}








//characters
//but why are you changing all these properties instead of having them be constructor arguments?
//well, my friendo, mainly readability and I'm lazy. I don't want to have 37 constructor arguments I have to keep track of, I want to know what each individual property is set to.
class Angel extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Angel`, 5, 5.25, 0.09, 0.13, 72, 108);
		this.fallMax = 3.6;
		this.dMaxTrue = 9.75;
		this.naturalFriction = 0.998;

		this.boost = true;
		this.boostStrength = 1.32;
		this.boostJumpMult = 0.75;
		this.glide = true;
		this.haltGlide = true;
		this.glideStrength = 0.2;
	}

	tick() {
		if (this.onGround > 0) {
			this.boost = true;
			this.glide = true;
			this.haltGlide = true;
		}

		//gliding
		if (this.glide && !this.boost && !this.haltGlide) {
			//trade forwards movement for upwards movements
			if (controls_spacePressed && this.dz > this.glideStrength * 10) {
				this.dz -= this.glideStrength * 0.5;
				this.az *= this.friction;
				this.dy += this.glideStrength;
				//make sure player isn't moving upwards with dy
				if (this.dy > 0) {
					this.dy = 0;
				}
			} else {
				this.glide = false;
			}
		}
		super.tick();
	}

	handleSpace() {
		if (this.onGround > 0) {
			super.handleSpace();
		} else if (this.boost == true) {
			this.boost = false;
			this.dy = this.jumpStrength * this.boostJumpMult;
			if (this.parent != undefined) {
				this.dz *= linterp(0.98, this.boostStrength, this.parent.power);
			} else {
				this.dz *= this.boostStrength;
			} 
			this.dz = clamp(this.dz, -1 * this.dMaxTrue, this.dMaxTrue);
			this.jumpTime = 0;
		} else {
			this.haltGlide = false;
		}
	}
}

class Bunny extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Bunny`, 10.75, 6.3, 0.13, 0.4, 60, 240);

		this.texture_walkF = undefined;
		this.texture_walkL = undefined;
		this.texture_walkR = undefined;

		this.jumpCooldown = 5;
		this.jumpCooldownMax = 7;
		this.boostFriction = 0.99;

		this.trueSpeed = 0.9;
		this.fallMax = 11.5;
		this.dMin = 3;
		
	}

	//bunny always jumps
	tick() {
		if (this.jumpCooldown < this.jumpCooldownMax) {
			this.jumpCooldown += 1;
		}
		if (this.onGround > 0) {
			this.handleSpace();
			if (this.jumpCooldown == this.jumpCooldownMax) {
				this.dz += this.trueSpeed;
				this.jumpCooldown = 0;
			}
			
			this.textureRot = this.dir_down[1];
		}

		//space being pressed slows down the bunny
		if (controls_spacePressed && this.dy > 0 && this.dz > this.dMin) {
			this.dz *= this.boostFriction;
			this.dy += 0.01;
		}

		if (this.dz > this.dMin) {
			this.dz -= this.speed * 0.75;
		}
		super.tick();
	}

	chooseTexture() {
		//jumping texture
		if (this.ax == 0) {
			//center
			this.texture_current = this.texture_jumpF;
		} else if (this.ax < 0) {
			//left
			this.texture_current = this.texture_jumpL;
		} else {
			//right
			this.texture_current = this.texture_jumpR;
		}

		//reset if moving upwards
		if (this.dy > 0) {
			this.texture_current.reset();
		}
	}

	syncTextures() {
		this.texture_jumpF.frame = this.texture_current.frame;
		this.texture_jumpL.frame = this.texture_current.frame;
		this.texture_jumpR.frame = this.texture_current.frame;
	}
}

class Chinchilla extends Bunny {
	constructor(x, y, z) {
		super(x, y, z);
		//slightly lower jump and speed, but maintains speed better
		this.calculateJumpParams(60, 200);

		this.boostFriction = 0.993;
		this.dMin = 4;
		this.dMax = 10.25;
		this.speed = 0.09;
	}
}

class Child extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Child`, 4.7, 3.15, 0.048, 0.06, 75, 157.5);
		
		var source = data_sprites.Child;
		this.texture_walkL = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, true, false, source.walkLeft);
		this.texture_walkR = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, true, false, source.walkRight);
		this.texture_jumpL = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, false, false, source.jumpLeft);
		this.texture_jumpR = new Texture(source.sheet, data_sprites.spriteSize, source.frameTime, false, false, source.jumpRight);

		this.ay *= 0.9;
		//Why is this not just fallMax? Because fallMax is used for collision - it's the largest value a character is expected to move within a frame.
		//wacky collision effects will occur since the child's value is super low
		this.trueFallMax = 1.15;

		this.jumpBuffer = 0;
		this.coyoteSet = 10;

		this.bunnyIncrease = 0.08;
		this.bunnyDecrease = 0.006;
		this.bunnyBoost = 1;
		this.bunnyBoostMax = 1.2;
		
	}

	//child has one buffer frame so crumbling tiles will fall
	tick() {
		if (this.jumpBuffer > 0) {
			this.handleSpace();
		}
		super.tick();
	}

	modifyDerivitives(activeGravity, activeFriction, naturalFriction, activeAX, activeAZ) {
		//decrease bunny boost
		if (this.bunnyBoost > 1 && this.onGround > 0) {
			this.bunnyBoost -= this.bunnyDecrease;
			if (this.bunnyBoost < 1) {
				this.bunnyBoost = 1;
			}
		}
		
		super.modifyDerivitives(activeGravity, activeFriction, naturalFriction, activeAX, activeAZ);

		//if falling down too fast, make that not happen
		if (this.dy < -this.trueFallMax) {
			this.dy = -this.trueFallMax;
		}
	}

	handleSpace() {
		if (this.jumpBuffer <= 0) {
			this.jumpBuffer = 2;
			return;
		}

		this.jumpBuffer -= 1;
		if (this.jumpBuffer == 0) {
			if (this.coyote == 0) {
				this.coyote = this.coyoteSet;
			}

			if (this.onGround > 0) {
				//regular jump effects
				this.coyote = 0;
				this.dy = this.jumpStrength * this.bunnyBoost;
				this.jumpTime = physics_jumpTime;
				this.onGround = 0;

				//jump boost for jumping soon after hitting the ground
				this.bunnyBoost = Math.min(this.bunnyBoost + this.bunnyIncrease, this.bunnyBoostMax);
			}
		}
	}
}


class Duplicator extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Duplicator`, 5, 5.75, 0.15, 0.13, 45, 120);

		this.duplicates = [];
		this.duplicatesMax = 10;
		this.duplicatesMaxDistance = 900;
		this.duplicateGenerationTime = 140;
		this.duplicateGenerationCountup = 0;
	}

	beDrawn() {
		super.beDrawn();
	}

	updateDuplicateDirs() {
		this.duplicates.forEach(d => {
			d.dir_down = this.dir_down;
			d.dir_side = this.dir_side;
			d.dir_front = this.dir_front;
		});
	}

	createDuplicate() {
		var friend = new DuplicatorDuplicate(this.x, this.y, this.z, this);
		//updating properties to function
		friend.parent = this.parent;
		friend.parentPrev = this.parentPrev;
		friend.backwards = this.backwards;
		friend.dx = this.dx + Math.sign(Math.random() - 0.5) * (randomBounded(0.1, 0.6) ** 0.5);
		friend.dy = this.dy + randomBounded(0.1, 0.7);
		friend.dz = this.dz + Math.sign(Math.random() - 0.5) * (randomBounded(0.1, 0.5) ** 0.5);

		friend.dir_down = this.dir_down;
		friend.dir_side = this.dir_side;
		friend.dir_front = this.dir_front;
		this.duplicates.push(friend);
	}

	collide() {
		var tempDir = this.dir_down;
		super.collide();
		if (this.dir_down != tempDir) {
			this.updateDuplicateDirs();
		}
	}

	//the duplicator has less of a window outside of the tunnel to work with
	isOutOfParent() {
		if (this.parent == undefined) {
			return true;
		}
		var par = this.parent;
		var newCoords = [this.x - par.x, this.y - par.y, this.z - par.z];
		[newCoords[0], newCoords[2]] = rotate(newCoords[0], newCoords[2], par.theta * -1);

		if (getDistance2d([newCoords[0], newCoords[1]], [0, 0]) < par.r + tunnel_voidWidth - this.r && 
		newCoords[2] > 0 && 
		newCoords[2] < (par.len * par.tileSize) + tunnel_transitionLength * 2) {
			return false;
		}
		return true;
	}

	tick() {
		super.tick();
		//only do tick if close enough
		if (this.cameraDist < 1500) {
			if (!editor_active) {
				this.duplicateGenerationCountup += 1;
			}	

			//if self has fallen out of the world, replace self with a duplicate
			if (this.isOutOfParent()) {
				var replacement = undefined;

				//for loop goes backwards so the closest one is chosen
				for (var g=this.duplicates.length-1; g>=0; g--) {
					if (this.duplicates[g].parent != undefined) {
						//swap player with new duplicate, then replace duplicate with real duplicator
						replacement = this.duplicates[g];
						player = replacement;
						replacePlayer(data_characters.map["Duplicator"]);
						player.ax = this.ax;
						//populate player's duplicate array with every duplicate except the one that's being killed (self) and the one being swapped to
						player.duplicates = [];
						this.duplicates.forEach(d => {
							if (d != this && d != replacement) {
								player.duplicates.push(d);
								d.trueDuplicator = player;
							}
						});
						return;
					}
				}
				//if none has been chosen, kill the player
				return;
			}

			//ordering duplicates
			if (world_time % 6 == 0) {
				this.duplicates = orderObjects(this.duplicates, 4);
			}

			//killing duplicates / ticking duplicates
			for (var d=0; d<this.duplicates.length; d++) {
				//kill a duplicate if they fall out of the world and self is also not out of the world
				if (this.duplicates[d].parent == undefined || getDistance(this.duplicates[d], this) > this.duplicatesMaxDistance) {
					this.duplicates.splice(d, 1);
					d -= 1;
				} else {
					//make sure duplicates have the same strafing as self and they're transferring tunnels as well
					if (this.parent != undefined) {
						this.duplicates[d].parent = this.parent;
					}
					this.duplicates[d].parentPrev = this.parentPrev;
					this.duplicates[d].ax = this.ax;
					this.duplicates[d].tick();
				}
			}

			
			//creating new duplicates
			if (this.duplicates.length < this.duplicatesMax && this.duplicateGenerationCountup % Math.floor(this.duplicateGenerationTime / this.parentPrev.power) == Math.floor(this.duplicateGenerationTime * 0.8)) {
				this.createDuplicate();
			}
		}
	}

	handleSpace() {
		//if a duplicate is close enough to self, change whether it can jump
		this.duplicates.forEach(d => {
			if (getDistance(this, d) < this.r * 2) {
				//if the duplicate is above self, give the duplicate jump ability. If not, give self the jump ability
				if (spaceToRelativeRotless([d.x, d.y, d.z], [this.x, this.y, this.z], this.dir_down)[2] > 0) {
					//the jump ability comes with a penalty to self
					d.onGround = 1;
					this.dy -= 0.4;
				} else {
					this.onGround = 1;
					d.dy -= 0.4;
				}
			}
		});
		super.handleSpace();
		this.duplicates.forEach(d => {
			d.handleSpace();
		})
	}
}

//no thoughts in this brian
class DuplicatorDuplicate extends Character {
	constructor(x, y, z, parentDuplicator) {
		super(x, y, z, `Duplicator`, 5.1, 5.77, 0.15, 0.15, 50, 130);
		this.trueDuplicator = parentDuplicator;
	}

	//lessen opacity depending on distance
	beDrawn() {
		ctx.globalAlpha = clamp(linterp(0.5, 0, (getDistance(this, this.trueDuplicator) / this.trueDuplicator.duplicatesMaxDistance) + 0.1), 0, 0.5);
		super.beDrawn();
		ctx.globalAlpha = 1;
	}

	collide() {
		var tempDir = this.dir_down;
		super.collide();
		if (this.dir_down != tempDir) {
			this.trueDuplicator.dir_down = this.dir_down;
			this.trueDuplicator.dir_side = this.dir_side;
			this.trueDuplicator.dir_front = this.dir_front;
			this.trueDuplicator.updateDuplicateDirs();
		}
	}

	setCameraPosition() {
	}
}


class Gentleman extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Gentleman`, 4.65, 5, 0.05, 0.12, 120, 165);

		this.texture_flyF = new Texture(data_sprites.Gentleman.sheet, data_sprites.spriteSize, 1e1001, false, false, data_sprites.Gentleman.flyForwards);
		this.texture_flyL = new Texture(data_sprites.Gentleman.sheet, data_sprites.spriteSize, 1e1001, false, false, data_sprites.Gentleman.flySideways);
		this.texture_flyR = new Texture(data_sprites.Gentleman.sheet, data_sprites.spriteSize, 1e1001, false, true, data_sprites.Gentleman.flySideways);

		this.dMaxTrue = 7.5;
		this.naturalFriction = 0.9994;

		this.attracting = undefined;
		this.attractionForce = undefined;
		this.airFriction = 0.46;
		this.abilityDistance = 500;
	}

	modifyDerivitives(activeGravity, activeFriction, naturalFriction, activeAX, activeAZ) {
		//do ability stuff
		if (this.attracting != undefined) {
			//go towards object
			var dist = getDistance(this, this.attracting);

			if (this.attractionForce != undefined) {
				//friction with air
				this.dx -= this.attractionForce[0] * this.airFriction;
				this.dy -= this.attractionForce[1] * this.airFriction;
				this.dz -= this.attractionForce[2] * this.airFriction;
			}

			//pull object slightly
			this.attracting.pushForce[0] = ((this.x - this.attracting.x) / dist) * (this.abilityDistance / dist) * this.airFriction;
			this.attracting.pushForce[1] = ((this.y - this.attracting.y) / dist) * (this.abilityDistance / dist) * this.airFriction;
			this.attracting.pushForce[2] = ((this.z - this.attracting.z) / dist) * (this.abilityDistance / dist) * this.airFriction;

			//getting attraction towards object in relative coordinates
			var offset = spaceToRelativeRotless([this.attracting.x, this.attracting.y, this.attracting.z], [this.x, this.y, this.z], this.dir_down);
			[offset[0], offset[1], offset[2]] = [offset[1], offset[2], offset[0]];
			this.attractionForce = [(offset[0] / dist) * (this.abilityDistance / Math.max(dist, this.abilityDistance / this.dMaxTrue)),
									(offset[1] / dist) * (this.abilityDistance / Math.max(dist, this.abilityDistance / this.dMaxTrue)),
									(offset[2] / dist) * (this.abilityDistance / Math.max(dist, this.abilityDistance / this.dMaxTrue))];

			this.dx += this.attractionForce[0] / 2;
			this.dy += this.attractionForce[1] / 1.5;
			this.dz += this.attractionForce[2] / 2;

			//make sure self's values aren't too great
			this.dx = clamp(this.dx, -this.dMaxTrue, this.dMaxTrue);
			this.dy = clamp(this.dy, -this.dMaxTrue, this.dMaxTrue);
			this.dz = clamp(this.dz, -1, this.dMaxTrue);

			

			//stop ability if not holding space
			if (!controls_spacePressed) {
				this.attracting = undefined;
				this.attractionForce = undefined;
			}
		}
		//don't accelerate forwards while attracting an object
		super.modifyDerivitives(activeGravity, activeFriction, naturalFriction, activeAX, activeAZ * (this.attracting == undefined));
	}

	handleSpace() {
		if (this.onGround < 1 && this.parent != undefined && this.attracting == undefined) {
			//use two tunnels: self's parent, and the tunnel that's closest (but not the parent)
			//closeArr is a list of the freeObjects in the closest tunnels
			var closeArr = this.parent.freeObjs;

			if (loading_state.nearObjs.length > 1) {
				//chose either the first or second close tunnel to tack on, depending on which one is the parent
				closeArr = [...closeArr, ...loading_state.nearObjs[loading_state.nearObjs.length - (1 + (loading_state.nearObjs[loading_state.nearObjs.length - 1] == this.parent))].freeObjs];
			}
			
			//get closest free object that's also in front of self AND IS A POWERCELL
			var closestObj = undefined;
			var closestObjDist = this.abilityDistance;
			for (var h=0; h<closeArr.length; h++) {
				if (closeArr[h].succ != undefined && spaceToRelativeRotless([closeArr[h].x, closeArr[h].y, closeArr[h].z], [this.x, this.y, this.z], [this.dir_down[0], -this.dir_down[1]])[0] > -20) {
					var tempDist = getDistance(this, closeArr[h]);
					if (tempDist < closestObjDist) {
						closestObj = closeArr[h];
						closestObjDist = getDistance(this, closeArr[h]);
					}
				}
			}
			this.attracting = closestObj;
		}
		super.handleSpace();
	}

	chooseTexture() {
		if (this.onGround > 0) {
			//walking texture
			if (this.ax == 0) {
				//center
				this.texture_current = this.texture_walkF;
			} else if (this.ax < 0) {
				//left
				this.texture_current = this.texture_walkL;
			} else {
				//right
				this.texture_current = this.texture_walkR;
			}
			return;
		} 

		//reset ground animations when not on ground
		this.texture_walkF.reset();
		this.texture_walkR.reset();
		this.texture_walkL.reset();
		
		//flying texture
		if (this.attracting != undefined) {
			//determine which frame of the flying animation to show
			var offset = spaceToRelativeRotless([this.attracting.x, this.attracting.y, this.attracting.z], [this.x, this.y, this.z], this.dir_down);
			[offset[0], offset[1], offset[2]] = [offset[1], offset[2], offset[0]];

			if (Math.abs(offset[0]) < this.r * 2) {
				this.texture_current = this.texture_flyF;
			} else {
				this.texture_current = (offset[0] > 0) ? this.texture_flyR : this.texture_flyL;
			}

			//use z / y offset to determine what frame to be on
			var rot = (Math.atan2(-offset[1], -(offset[2] * 0.8)) + (Math.PI / 2)) / (Math.PI * 2);
			rot = (rot + 2) % 1;
			rot = 1 - rot;

			this.texture_current.frame = Math.floor(rot * 7.99);
			
			//reset ground animations when jumping
			return;
		}


		//jumping texture
		if (this.ax == 0) {
			//center
			this.texture_current = this.texture_jumpF;
		} else if (this.ax < 0) {
			//left
			this.texture_current = this.texture_jumpL;
		} else {
			//right
			this.texture_current = this.texture_jumpR;
		}

		//reset if moving upwards
		if (this.dy > 0) {
			this.texture_current.reset();
		}
	}

	syncTextures() {
		//if on the ground, sync all walking animations
		if (this.onGround > 0) {
			//decrement current frame if not moving forwards
			if (Math.abs(this.dz) <= this.speed && Math.abs(this.ax) < 0.02) {
				this.texture_current.frame = 0;
			}
			this.textureRot = this.dir_down[1];
			this.texture_walkF.frame = this.texture_current.frame;
			this.texture_walkL.frame = this.texture_current.frame;
			this.texture_walkR.frame = this.texture_current.frame;
		} else if (this.attracting != undefined) {
			this.texture_flyF.frame = this.texture_current.frame;
			this.texture_flyL.frame = this.texture_current.frame;
			this.texture_flyR.frame = this.texture_current.frame;
		} else {
			//syncing all jumping animations
			this.texture_jumpF.frame = this.texture_current.frame;
			this.texture_jumpL.frame = this.texture_current.frame;
			this.texture_jumpR.frame = this.texture_current.frame;
		}
	}
}


class Lizard extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Lizard`, 4, 5.25, 0.09, 0.12, 120, 255);
	}
}

class Pastafarian extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Pastafarian`, 6, 5.25, 0.13, 0.13, 90, 139.5);

		this.texture_walkL = new Texture(data_sprites.Pastafarian.sheet, data_sprites.spriteSize, data_sprites.Pastafarian.frameTime, true, false, data_sprites.Pastafarian.walkLeft);
		this.texture_walkR = new Texture(data_sprites.Pastafarian.sheet, data_sprites.spriteSize, data_sprites.Pastafarian.frameTime, true, false, data_sprites.Pastafarian.walkRight);
		this.texture_jumpL = new Texture(data_sprites.Pastafarian.sheet, data_sprites.spriteSize, data_sprites.Pastafarian.frameTime, false, false, data_sprites.Pastafarian.jumpLeft);
		this.texture_jumpR = new Texture(data_sprites.Pastafarian.sheet, data_sprites.spriteSize, data_sprites.Pastafarian.frameTime, false, false, data_sprites.Pastafarian.jumpRight);
		this.fallMax *= 1.05;

		this.personalBridgeStrength = 1;
		this.bridgeMultiplier = 0.988;
		this.bridgeBoost = 0.6;
	}

	modifyDerivitives(activeGravity, activeFriction, naturalFriction, activeAX, activeAZ) {
		if (this.parent != undefined) {
			this.personalBridgeStrength *= this.bridgeMultiplier - ((1 - this.parent.power) * 0.002);
		} else {
			this.personalBridgeStrength *= this.bridgeMultiplier;
		}
		super.modifyDerivitives(activeGravity, activeFriction, naturalFriction, activeAX, activeAZ);
	}

	handleSpace() {
		if (this.onGround > 0) {
			var stCoords = stripTileCoordinates(this.x, this.y, this.z, this.parentPrev);
			//offset because stCoordinates are misaligned with tiles
			stCoords[1] = Math.floor(stCoords[1] - 0.5);
			
			if (this.parentPrev.tiles[stCoords[0]][stCoords[1]] != undefined) {
				var tile = this.parentPrev.tiles[stCoords[0]][stCoords[1]];
				var tileName = tile.constructor.name;
				//crumbling tiles can only be collided with under special conditions - I don't want the player to get trapped out of the tunnel
				var collide2 = (tileName == "Tile_Crumbling") && (spaceToRelativeRotless([this.x, this.y, this.z],tile.home, tile.normal)[2] > 0);
				if (tileName == "Tile_Plexiglass" || collide2) {
					//if on a bridge tile, boost the bridge strength
					this.personalBridgeStrength += this.bridgeBoost;
					if (this.personalBridgeStrength > 1) {
						this.personalBridgeStrength = 1;
					}
				}
			}
		}
		super.handleSpace();
	}
}


class Runner extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Runner`, 5.65, 6.75, 0.12, 0.16, 45, 135);
		//the runner can strafe faster on the ground
		this.strafeMaxes = [6.75, 6];
		this.friction = 0.92;
	}

	tick() {
		//strafe speed is greater on ground
		this.strafeMax = this.strafeMaxes[+(this.onGround < 0)];
		super.tick();
	}
}


class Skater extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Skater`, 9.8, 5.25, 0.07, 0.11, 45, 90);

		this.abilityTransformTime += 0.01;
		this.fallMax = this.r * 0.5;
	}
}

class Student extends Character {
	constructor(x, y, z) {
		super(x, y, z, `Student`, 4.75, 4.5, 0.1, 0.13, 60, 70);

		this.r -= 2;
		this.fallMax = 5.5;

		this.abilityTransformTime = 6;
		this.abilityTimeLimit = 50;
		this.currentAbilityTime = 0;
		this.doAbility = true;

		this.dir_trueDown = this.dir_down;
	}

	tick() {
		super.tick();
	}

	modifyDerivitives(activeGravity, activeFriction, naturalFriction, activeAX, activeAZ) {
		//reset ability variables
		if (this.onGround > 0) {
			this.currentAbilityTime = 0;
			this.doAbility = true;
			this.dir_trueDown = [this.dir_down[0], this.dir_down[1]];
		}

		//perform ability
		if (this.currentAbilityTime > 0) {
			//controlling ability timing
			if (controls_spacePressed && this.doAbility) {
				//increase time up to the maximum
				if (this.currentAbilityTime < this.abilityTimeLimit) {
					this.currentAbilityTime += 1;
				} else {
					//if held the ability for too long, force the player to commit to it
					this.currentAbilityTime = 0;
					this.doAbility = false;
					this.dir_trueDown = this.dir_down;
					this.dir_side[1] += Math.PI;


					//changing camera target rotation
					if (this.backwards) {
						world_camera.targetRot = ((Math.PI * 2.5) - this.dir_down[1]) % (Math.PI * 2);
					} else {
						world_camera.targetRot = (this.dir_down[1] + (Math.PI * 1.5)) % (Math.PI * 2);
					}
					
					//if the rotation difference is too great, fix that
					if (Math.abs(world_camera.rot - world_camera.targetRot) > Math.PI) {
						if (world_camera.rot > Math.PI) {
							world_camera.rot -= Math.PI * 2;
						} else {
							world_camera.rot += Math.PI * 2;
						}
					}
				}
			} else {
				if (this.doAbility && this.currentAbilityTime < this.abilityTimeLimit) {
					this.doAbility = false;
					this.currentAbilityTime = 0;
					this.dy *= -1;
				}
			}

			//controlling actual gravity
			this.dir_down = [this.dir_trueDown[0], this.dir_trueDown[1] + Math.PI + 0.01];

			//there's a little fade in to the start of the ability
			if (this.currentAbilityTime < this.abilityTransformTime) {
				this.dir_down[1] = linterp(this.dir_trueDown[1], this.dir_trueDown[1] + Math.PI + 0.01, this.currentAbilityTime / 7);
			}
		}
		super.modifyDerivitives(activeGravity, activeFriction, naturalFriction, activeAX, activeAZ);
	}

	setCameraPosition() {
		var vertOffset = polToCart(this.dir_trueDown[0], (!data_persistent.settings.altCamera * this.dir_trueDown[1]) + (data_persistent.settings.altCamera * (world_camera.rot + (Math.PI / 2))), 70);
		var horizOffset = polToCart(this.dir_front[0], this.dir_front[1], -95);
		world_camera.targetX = this.x + vertOffset[0] + horizOffset[0];
		world_camera.targetY = this.y + vertOffset[1] + horizOffset[1];
		world_camera.targetZ = this.z + vertOffset[2] + horizOffset[2];
	}

	handleSpace() {
		if (this.onGround > 0) {
			super.handleSpace();
			return;
		}

		if (this.doAbility && this.currentAbilityTime == 0) {
			this.currentAbilityTime = 1;
			this.dy *= -1;
		}
	}
}