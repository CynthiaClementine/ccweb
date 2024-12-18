class Player {
	constructor(x, y, z, xRot, yRot) {
		this.friction = 0.85;
		this.gravity = -0.15;

		this.height = 4.9;
		this.onGround = false;
		this.posBuffer = [];

		this.scalePerPixel = 0.5;
		this.scale = 240;
		this.sens = 0.04;
		this.speed = 0.05;


		this.x = x;
		this.y = y;
		this.z = z;

		this.dx = 0;
		this.dy = 0;
		this.dz = 0;
		this.dMax = 1;
		this.fallMax = this.dMax * 1.98;

		this.ax = 0;
		this.ay = 0;
		this.az = 0;


		this.theta = yRot;
		this.phi = xRot;
		this.normalsBuffer = [
			polToCart(this.theta + Math.PI / 2, 0, 1),
			polToCart(this.theta, this.phi + Math.PI / 2, 1),
			polToCart(this.theta, this.phi, 1)
		];

		this.dt = 0;
		this.dp = 0;
	}

	fixPosBuffer() {
		this.posBuffer.forEach(p => {
			this.x += p[0];
			this.y += p[1];
			this.z += p[2];
		});
		this.posBuffer = [];
	}

	tick() {
		//handling velocity

		//adding
		this.dx += this.ax;

		//binding max
		if (Math.abs(this.dx) > this.dMax) {
			this.dx *= 0.95;
		}

		//friction
		if (this.ax == 0) {
			this.dx *= this.friction;
		}

		this.dz += this.az;
		if (Math.abs(this.dz) > this.dMax) {
			this.dz *= 0.95;
		}
		if (this.az == 0) {
			this.dz *= this.friction;
		}

		//gravity
		this.dy += this.gravity;
		if (Math.abs(this.dy) > this.fallMax) {
			this.dy *= 0.95;
		}

		//handling position
		if (!noclip_active) {
			this.x += this.dz * Math.sin(this.theta);
			this.z += this.dz * Math.cos(this.theta);

			this.x += this.dx * Math.sin(this.theta + (Math.PI/2));
			this.z += this.dx * Math.cos(this.theta + (Math.PI/2));
			
			this.y += this.dy;
		} else {
			var moveCoords = [0, 0, 0];
			if (Math.abs(this.dz) > 0.1) {
				var toAdd = polToCart(this.theta, this.phi, this.dz * player_noclipMultiplier);
				moveCoords = [moveCoords[0] + toAdd[0], moveCoords[1] + toAdd[1], moveCoords[2] + toAdd[2]];
				
			}
			if (Math.abs(this.dx) > 0.1) {
				var toAdd = polToCart(this.theta + (Math.PI / 2), 0, this.dx * player_noclipMultiplier);
				moveCoords = [moveCoords[0] + toAdd[0], moveCoords[1] + toAdd[1], moveCoords[2] + toAdd[2]];
			}
			this.x += moveCoords[0];
			this.y += moveCoords[1];
			this.z += moveCoords[2];
		}


		//camera velocity
		this.theta += this.dt;
		this.phi += this.dp;

		//special case for vertical camera orientation
		if (Math.abs(this.phi) >= Math.PI * 0.5) {
			//if the camera angle is less than 0, set it to -1/2 pi. Otherwise, set it to 1/2 pi
			this.phi = Math.PI * (-0.5 + (this.phi > 0));
		}
		this.normalsBuffer = [
			polToCart(this.theta + Math.PI / 2, 0, 1),
			polToCart(this.theta, this.phi + Math.PI / 2, 1),
			polToCart(this.theta, this.phi, 1)
		];
	}
}


class NPC {
	constructor(x, y, z, r, name, sheet) {
		this.home = [x, y, z];
		this.x = x;
		this.y = y;
		this.z = z;

		this.r = r;

		this.name = name;

		this.sheet = sheet;

		this.inList;
	}

	beDrawn() {
		var pDist = Math.hypot(this.x - player.x, this.y - player.y, this.z - player.z);
		var coords = spaceToScreen([this.x, this.y, this.z]);

		var r = (this.r / pDist) * player.scale;
		ctx.drawImage(this.sheet, coords[0] - r, coords[1] - r, r * 2, r * 2);
	}

	tick() {
		//remove self from current bin, move, then put self back into bins
	}

	giveStringData() {
		return `NPC~${this.home[0]}~${this.home[1]}~${this.home[2]}~${this.r}~${this.name}`;
	}
}