

class Camera {
	constructor(world, pos) {
		this.world = world;
		this.pos = pos;
		this.theta = 0;
		this.phi = 0;
	}
	
	calcMatrix() {
		var cxDir = polToCart(this.theta + (Math.PI / 2), 0, 1);
		var cyDir = polToCart(this.theta, this.phi + (Math.PI / 2), 1);
		var czDir = polToCart(this.theta, this.phi, 1);
	
		return [
			cxDir[0], cxDir[1], cxDir[2],
			cyDir[0], cyDir[1], cyDir[2],
			czDir[0], czDir[1], czDir[2]
		];
	}
	
	tick() {
		camera.theta = this.theta;
		camera.phi = this.phi;
		
		//update GPU with current data
		gl.uniform3fv(uCamPos, Array.from(this.pos));
		gl.uniformMatrix3fv(uCamRot, false, this.calcMatrix());
		gl.uniform1i(uCamWorld, this.world.id);
	}
}

class Player {
	constructor(world, pos) {
		this.world = world;
		this.pos = pos;
		this.dPos = Pos(0, 0, 0);
		this.aPos = Pos(0, 0, 0);
		this.dMax = 1.5;
		this.dMin = 0.05;

		this.speed = 0.07;
		this.jumpSpeed = 6;
		this.dashBase = 3;
		this.dashMult = 1.5;
		this.frictionBrake = 0.8;
		this.frictionGround = 0.98;
		this.frictionAir = 0.995;

		this.gravity = 0.1;
		this.fallMax = 10;

		this.height = player_width;
		this.width = player_width;

		this.colPoints = 16;
		this.colPanicThreshold = 0.75;
		
		this.theta = 0;
		this.phi = 0;
	}

	tick() {
		this.updateMomentum();
		
		//take 2 half-steps
		this.dPos[0] /= 2;
		this.dPos[1] /= 2;
		this.dPos[2] /= 2;
		this.updatePosition();
		this.updatePosition();
		this.dPos[0] *= 2;
		this.dPos[1] *= 2;
		this.dPos[2] *= 2;
		
		
		camera.world = this.world;
		camera.pos = Pos(this.pos[0], this.pos[1] + this.height / 2, this.pos[2]);
		camera.theta = this.theta;
		camera.phi = this.phi;
	}

	updateMomentum() {
		//transform dPos to relative coordinates
		[this.dPos[0], this.dPos[2]] = rotate(this.dPos[0], this.dPos[2], this.theta);
		
		this.updateSubMomentum();
		
		//transform back to real coordinates
		[this.dPos[0], this.dPos[2]] = rotate(this.dPos[0], this.dPos[2], -this.theta);
	}
	
	updateSubMomentum() {
		//update each axis
		this.updateMomentumAxis(0);

		//gravity
		if (this.onGround()) {
			this.dPos[1] *= this.frictionBrake;
		} else {
			this.dPos[1] -= this.gravity;
		}
		this.dPos[1] = clamp(this.dPos[1], -this.fallMax, this.fallMax);
		this.dPos[1] *= this.frictionAir;
		
		this.updateMomentumAxis(2);
	}
	
	updateMomentumAxis(num) {
		const inRange = (Math.abs(this.dPos[num]) < this.dMax);
		const decelerating = (this.aPos[num] * this.dPos[num] <= 0);
		if (inRange) {
			this.dPos[num] += this.aPos[num];
		}
		if (decelerating) {
			this.dPos[num] *= this.frictionBrake;
		}
		if (!inRange && this.onGround()) {
			this.dPos[num] *= this.frictionGround;
		}
		if (!inRange) {
			this.dPos[num] *= this.frictionAir;
		}
	}
	
	//collides as a sphere with the terrain, modifies dPos, returns the number of places the sphere has collided
	sphereBounce(spherePos, dPos, div) {
		const pi = Math.PI;
		const twoPi = 2 * pi;
		const halfPi = pi / 2;
		const [max, abs] = [Math.max, Math.abs];
		const needsAdjustment = (max(abs(dPos[0]), abs(dPos[1]), abs(dPos[2])) > 0.0001) 
							 && (max(abs(dPos[0]), abs(dPos[1]), abs(dPos[2])) > 0.0001);
		
		var numCollisions = 0;
		var colVec = [0, 0, 0];
		//go through the surface of the sphere in equal-angle measurements
		//collide with each point to approximate colliding with the sphere
		for (var p=-div/4; p<=div/4; p++) {
			const phi = p * twoPi / div;
			const tSteps = (Math.abs(p) == div / 4) ? 1 : div;
			
			for (var t=0; t<tSteps; t++) {
				const theta = t * twoPi / div;
				const offsetVec = polToCart(theta, phi, 1);
				if (this.rayBounce(spherePos, [0, 0, 0], offsetVec)) {
					//if we've collided, bounce and change velocity
					numCollisions += 1;
					
					if (needsAdjustment) {
						colVec = normalize(colVec);
						var colProj = proj(dPos, offsetVec);
						dPos[0] -= colProj[0];
						dPos[1] -= colProj[1];
						dPos[2] -= colProj[2];
					}
				}
			}
		}
		
		return numCollisions;
	}
	
	rayBounce(spherePos, dPos, vec) {
		const w = this.width;
		var pos = Pos(spherePos[0] + vec[0]*w, spherePos[1] + vec[1]*w, spherePos[2] + vec[2]*w);
		var [dist, distObj] = this.world.tree.estimatePos(pos);
		distObj = this.world.objects[distObj];
		
		//hit
		if (dist < ray_minDist) {
			var saved = distObj.material;
			//weirdness because the actual pos being passed out is different from the test pos
			if (this.portalTest(distObj, pos)) {
				spherePos[0] += saved.offset[0];
				spherePos[1] += saved.offset[1];
				spherePos[2] += saved.offset[2];
				return 0;
			}
			
			//if the normal is pointing in roughly the right direction, push out slightly to prevent clipping into surfaces
			var normal = distObj.normalAt(pos);
			if (dot(normal, vec) < -0.5) {
				var e = 0.05;
				spherePos[0] += normal[0] * e;
				spherePos[1] += normal[1] * e;
				spherePos[2] += normal[2] * e;
			}
			
			dPos[0] -= vec[0];
			dPos[1] -= vec[1];
			dPos[2] -= vec[2];
			return 1;
		}
		return 0;
	}
	
	updatePosition() {
		/* movement follows a simple 3-part plan
		1. cast ray upwards from self's feet
		2. try to move ray in the movement directions, to whatever varying success
		3. move ray downwards
		
		This makes sure that the movement is always valid, because there has to be an unobstructed path 
		between the previous position and the new position.
		It also allows the player to step up slopes.
		
		The basic idea for every individual movement part is this:
			use a sphere to detect collisions. Any collisions will change momentum and prevent the sphere from moving,
			So there's this repeated pattern of
			move a tiny bit -> check if collision
			if no: cool
			if yes: move back that same tiny bit -> break
		 */

		//before any raycasts, housekeeping
		const zeroPos = Pos(0, 0, 0);
		//calculate number of collision points on the sphere. If we ever collide with too many, the sphere is being CRUSHED!
		const panicPoints = (this.colPoints * (this.colPoints / 2 - 1) + 2) * this.colPanicThreshold;
		var coords = Pos(this.pos[0], this.pos[1], this.pos[2]);
		var dChange = Pos(...this.dPos);
		var dHat = normalize(this.dPos);
		
		//don't even bother if dPos is too small
		var [max, abs] = [Math.max, Math.abs];
		if (max(abs(dChange[0]), abs(dChange[1]), abs(dChange[2])) < 0.0001) {
			this.dPos[0] = 0;
			this.dPos[1] = 0;
			this.dPos[2] = 0;
			return;
		}
		
		if (dChange[0] != 0 || dChange[1] != 0 || dChange[2] != 0) {
			var simp = (a) => {return a.map(b => b.toFixed(2));};
		}
		
		//sphereBounce at the start for portals!
		// this.sphereBounce(coords, [0, 0, 0], this.colPoints);
		
		//go up
		this.updateSubPosition(Pos(0, 1, 0), player_stepHeight, coords, Pos(0, 0, 0), panicPoints);
		
		//"sideways" (in reality can have a vertical component. This just means apply dPos)
		var speed = getDistancePos(this.dPos, zeroPos);
		if (speed > 30) {
			console.log(`too fast!`);
			speed = 30;
		}
		
		this.updateSubPosition(dHat, speed, coords, dChange, panicPoints);
		
		//go back down
		this.updateSubPosition(Pos(0, -1, 0), player_stepHeight + 1, coords, Pos(0, 0, 0), panicPoints);
		
		//never bounce back faster than we started
		
		//update real coordinates
		// var initialSpeed = getDistancePos(this.dPos, zeroPos);
		this.dPos[0] = dChange[0];
		this.dPos[1] = dChange[1];
		this.dPos[2] = dChange[2];
		// var finalSpeed = getDistancePos(this.dPos, zeroPos);
		// if (finalSpeed > initialSpeed) {
		// 	this.dPos[0] *= initialSpeed / finalSpeed;
		// 	this.dPos[1] *= initialSpeed / finalSpeed;
		// 	this.dPos[2] *= initialSpeed / finalSpeed;
		// }
		
		this.pos[0] = coords[0];
		this.pos[1] = coords[1];
		this.pos[2] = coords[2];
	}
	
	/**
	* Updates the current position based on a vector.
	* @param {Pos} vHat vector to move in the direction of. Is modified by the function.
	* @param {Number} speed the speed at which to move in said direction
	* @param {Pos} coords the current player position. Is modified by the function.
	* @param {Pos} vChange buffer to store how the dPos should be changed. Is modified by the function.
	* @param {Number} panicPoints number of collision points to panic at
	 */
	updateSubPosition(vHat, speed, coords, vChange, panicPoints) {
		//take tiny steps - max dist of 1 for each step
		for (0; speed>0; speed-=1) {
			var tickDist = Math.min(1, speed);
			var frameOffset = [vHat[0] * tickDist, vHat[1] * tickDist, vHat[2] * tickDist];
			
			coords[0] += frameOffset[0];
			coords[1] += frameOffset[1];
			coords[2] += frameOffset[2];
			var colNum = this.sphereBounce(coords, vChange, this.colPoints);
			
			//if we've collided
			if (colNum > 0) {
				coords[0] -= frameOffset[0];
				coords[1] -= frameOffset[1];
				coords[2] -= frameOffset[2];
			
				if (colNum < panicPoints) {
					speed *= 0.7;
					//counteract the -1 from looping if we are moving
					if (speed > 0.01) {
						speed += 1;
					}
				} else {
					//panic collision
					console.log(`panic!`);
					coords[1] += 1.5;
					vChange[0] *= 1.1;
					vChange[1] *= 1.1;
					vChange[2] *= 1.1;
					speed = 0;
				}
			}
		}
	}
	
	portalTest(obj, coords) {
		var mat = obj.material;
		if (obj.distanceToPos(coords) < ray_nearDist && mat.constructor.name == "M_Portal") {
			if (mat.newWorld) {
				this.world = mat.newWorld;
				coords[0] += mat.offset[0];
				coords[1] += mat.offset[1];
				coords[2] += mat.offset[2];
				return true;
			}
		}
		return false;
	}
	
	tryMovementOnAxis(pos, axisVec, distance) {
		if (distance < 0) {
			axisVec = [-axisVec[0], -axisVec[1], -axisVec[2]];
			distance = -distance;
		}
		if (true || distance > this.dMin) {
			//cast ray sideways
			var lookRay = new Ray_Tracking(this.world, pos, axisVec, this.width + distance + 1);
			lookRay.iterate(0);
			//if the ray's gone far enough, then move there
			if (lookRay.distance > this.width + distance) {
				return undefined;
			} else {
				return lookRay.object;
			}
		}
	}
	
	onGround() {
		var lookRay = new Ray_Tracking(this.world, this.pos, Pos(0, -1, 0), this.width + player_stepHeight);
		lookRay.iterate(0);
		return (lookRay.object != null);
	}
	
	dash() {
		var speed = getDistancePos(this.dPos, Pos(0, 0, 0));
		if (speed > this.speed && speed < this.dashBase) {
			this.dPos = normalize(this.dPos);
			this.dPos[0] *= this.dashBase;
			this.dPos[1] *= this.dashBase;
			this.dPos[2] *= this.dashBase;
		}
		this.dPos[0] *= this.dashMult;
		this.dPos[1] *= this.dashMult;
		this.dPos[2] *= this.dashMult;
	}

	jump() {
		//if the ray's hit an object then the player is on the ground
		if (this.onGround()) {
			this.dPos[1] = this.jumpSpeed;
		}
	}
}

class Player_Debug extends Player {
	constructor(world, pos) {
		super(world, pos);
		this.dMax = 6;
		this.speed = 0.4;
	}
	
	updateSubMomentum() {
		this.updateMomentumAxis(0);
		//player will fall slowly due to stepping if they're not rising constantly
		this.dPos[1] -= 2;
		this.updateMomentumAxis(1);
		this.dPos[1] += 2;
		this.updateMomentumAxis(2);
	}
}

class Player_Noclip extends Player {
	constructor(world, pos) {
		super(world, pos);
		this.dMax = 6;
		this.speed = 0.4;
	}
	
	updateSubMomentum() {
		this.updateMomentumAxis(0);
		this.updateMomentumAxis(1);
		this.updateMomentumAxis(2);
	}
	
	updatePosition() {
		const dPos = this.dPos;
		this.pos[0] += dPos[0];
		this.pos[1] += dPos[1];
		this.pos[2] += dPos[2];
	}
}