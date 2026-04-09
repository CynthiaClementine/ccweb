

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
		this.grounded = 0;
		this.maxGroundDot = 0.1;

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
		if (getDistancePos(camera.pos, this.pos) < 10) {
			camera.pos = Pos(...linterpMulti(camera.pos, Pos(this.pos[0], this.pos[1] + this.height / 2, this.pos[2]), 0.6));
		} else {
			camera.pos = Pos(this.pos[0], this.pos[1] + this.height / 2, this.pos[2]);
		
		}
		camera.theta = this.theta;
		camera.phi = this.phi;
	}

	updateMomentum() {
		//transform dPos to relative coordinates
		[this.dPos[0], this.dPos[2]] = rotate(this.dPos[0], this.dPos[2], this.theta);
		
		this.updateSubMomentum();
		
		//transform back to real coordinates
		[this.dPos[0], this.dPos[2]] = rotate(this.dPos[0], this.dPos[2], -this.theta);

		//update grounding
		this.grounded = clamp(this.grounded - 1, 0, player_coyote);
	}
	
	updateSubMomentum() {
		//update each axis
		this.updateMomentumAxis(0);

		//gravity
		this.onGround();
		if (this.grounded > 0) {
			if (this.dPos[1] < 0) {
				this.dPos[1] *= this.frictionBrake;
				console.log(`braking`);
			}
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
	sphereBounce(spherePos, div, vHat) {
		const pi = Math.PI;
		const twoPi = 2 * pi;
		const halfPi = pi / 2;
		
		var numCollisions = 0;
		var normals = [];
		//go through the surface of the sphere in equal-angle measurements
		//collide with each point to approximate colliding with the sphere
		for (var p=-div/4; p<=div/4; p++) {
			const phi = p * twoPi / div;
			const tSteps = (Math.abs(p) == div / 4) ? 1 : div;
			
			for (var t=0; t<tSteps; t++) {
				const theta = t * twoPi / div;
				const offsetVec = polToCart(theta, phi, 1);
				const bounceResult = this.rayBounce(spherePos, [0, 0, 0], offsetVec);
				if (bounceResult) {
					//if we've collided, bounce and change velocity
					numCollisions += 1;
					if (p < 0 && this.grounded < player_coyote) {
						this.grounded += 1;
					}
					
					if (dot(vHat, offsetVec) > 0.001) {
						normals.push([-offsetVec[0], -offsetVec[1], -offsetVec[2], bounceResult.bounciness]);
					}
				}
			}
		}
		normals.length = numCollisions;
		return normals;
	}
	
	//slightly simpler sphere calculation that just says if the sphere collides. Returns after the first collision.
	sphereBounceTest(spherePos, div, vHat) {
		const pi = Math.PI;
		const twoPi = 2 * pi;
		const halfPi = pi / 2;

		for (var p=-div/4; p<=div/4; p++) {
			const phi = p * twoPi / div;
			const tSteps = (Math.abs(p) == div / 4) ? 1 : div;
			
			for (var t=0; t<tSteps; t++) {
				const theta = t * twoPi / div;
				const offsetVec = polToCart(theta, phi, 1);
				if (this.rayBounce(spherePos, [0, 0, 0], offsetVec) && dot(vHat, offsetVec) > 0.001) {
					return true;
				}
			}
		}
		normals.length = numCollisions;
		return false;
	}
	
	rayBounce(spherePos, dPos, vec) {
		const w = this.width;
		var pos = Pos(spherePos[0] + vec[0]*w, spherePos[1] + vec[1]*w, spherePos[2] + vec[2]*w);
		var [dist, distObj] = this.world.tree.estimatePos(pos);
		distObj = this.world.expObjs[distObj];
		
		//hit
		if (dist < ray_minDist) {
			var saved = distObj.material;
			//weirdness because the actual pos being passed out is different from the test pos
			if (this.portalTest(distObj, pos)) {
				spherePos[0] += saved.offset[0];
				spherePos[1] += saved.offset[1];
				spherePos[2] += saved.offset[2];
				return null;
			}
			return saved;
		}
		return null;
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
			if yes: move back that same tiny bit -> try again
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
		var safeSpeed = speed;
		// console.log(`starting at ${printPos(coords)}`);
		//take tiny steps - max dist of 2 for each step
		const maxTickDist = 2;
		var k = 0;
		while (speed > 0.01) {
			k += 1;
			if (k > 30) {
				console.error(`too many iterations!`);
				return;
			}
			var tickDist = Math.min(maxTickDist, speed);
			var normalsList;
			
			var p0 = coords;
			var pX = coords;
			var pY = [
				coords[0] + vHat[0] * tickDist, 
				coords[1] + vHat[1] * tickDist, 
				coords[2] + vHat[2] * tickDist
			];
			var pM = linterpMulti(pX, pY, 0.5);
			// console.log(`iter=${k}: at ${printPos(p0)} w/ completion=${tickDist}/${speed} towards ${printPos(vHat)}`);
			
			//test if there's a collision
			normalsList = this.sphereBounce(pY, this.colPoints, vHat);
			// console.log(`testing ${printPos(pY)}. collides: ${(normalsList[0] != undefined)}`);
			speed -= tickDist;
			if (normalsList[0] == undefined) {
				// console.log(`good! Moving to ${printPos(pY)}`);
				//that's good! Just move there
				coords[0] = pY[0];
				coords[1] = pY[1];
				coords[2] = pY[2];
				// if (Math.random() < 0.001) {console.log(`moving full distance`);}
				continue;
			}
			
			//figure out how far it's possible to go without colliding
			//p0 - initial pos
			//pX - last pos at which no collisions happen
			//pM - middle test point
			//pY - first pos at which collisions are happening
			var stepDist = tickDist / 2;
			tickDist = 0;
			var bufferList = this.sphereBounce(pM, this.colPoints, vHat);
			//use binary search, etc
			for (var i=0; i<8; i++) {
				if (bufferList[0]) {
					pY = pM;
				} else {
					pX = pM;
					tickDist += stepDist;
				}
				
				pM = linterpMulti(pX, pY, 0.5);
				stepDist /= 2;
			
				bufferList = this.sphereBounce(pM, this.colPoints, vHat);
			}
			
			//sphere collision at pY gives list of normals we're colliding against
			normalsList = bufferList;
			// if (Math.random() < 0.01) {console.log(normalsList);}
			
			// console.log(`first: ${printPos(pX)}    last: ${printPos(pY)}`);
			coords[0] = pX[0];
			coords[1] = pX[1];
			coords[2] = pX[2];
			
			//special case: if the number of normals > panicPoints, make the player FASTER and move them upwards
			if (normalsList.length > panicPoints) {
				console.log(`panic!`);
				coords[1] += 1.5;
				vChange[0] += this.dPos[0] * 0.1;
				vChange[1] += this.dPos[1] * 0.1;
				vChange[2] += this.dPos[2] * 0.1;
				speed = 0;
				continue;
			}
			
			
			//apply collide-and-slide with the normals, in no particular order
			if (Math.random() < 0.01) {
				// console.log(normalsList);
			}
			var n = 0;
			const e = 0.01;
			while (normalsList[n]) {
				var colProj = proj(vHat, normalsList[n]);
				var amt = (1 + normalsList[n][3]);
				vHat[0] -= colProj[0] * amt;
				vHat[1] -= colProj[1] * amt;
				vHat[2] -= colProj[2] * amt;
				// coords[0] -= normalsList[n][0] * e;
				// coords[1] -= normalsList[n][1] * e;
				// coords[2] -= normalsList[n][2] * e;
				
				//speed should be affected, but vHat needs to be a unit vector. So that's this
				var newLen = getDistancePos(vHat, Pos(0, 0, 0));
				speed *= newLen;
				vHat = normalize(vHat);

				vChange[0] -= colProj[0] * safeSpeed;
				vChange[1] -= colProj[1] * safeSpeed;
				vChange[2] -= colProj[2] * safeSpeed;
				safeSpeed *= newLen;
				n += 1;
			}
			// console.log(`collided with ${n} normals`);
		}
		// console.log(`ending at ${printPos(coords)}\n\n`);
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
		if (lookRay.object != null) {
			this.grounded = player_coyote;
		}
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
		if (this.grounded > 0) {
			this.dPos[1] = this.jumpSpeed;
			this.grounded = 0;
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