//im sorry

class Player {
	constructor(x, z, hasHotFeet) {
		this.x = x ?? 0;
		this.y = 0;
		this.z = z ?? 0;

		this.dx = 0;
		this.dy = 0;

		this.ax = 30;
		this.ay = 0.7;

		this.dir = 0;

		this.dims = [0.08, 0.1];
		this.strafe = 6.5;
		this.friction = 0.85;
		this.jump = 0.2;

		this.speedMin = 3;
		this.speedMax = 15;

		this.dead = false;
		this.hotFeet = hasHotFeet ?? false;
	}

	onGround() {
		var d = this.dims;
		return (tileAt(this.x + d[0], this.z) || tileAt(this.x - d[0], this.z) || tileAt(this.x, this.z + d[1]) || tileAt(this.x, this.z - d[1]));
	}

	tick(dt) {
		this.pickPowerups();

		//velocity
		this.dx = clamp(this.dx + this.dir * this.ax * dt, -this.strafe, this.strafe);
		if (this.dir * this.dx <= 0) {
			this.dx *= this.friction;
		}

		this.dy -= this.ay * dt * 0.5;

		//coordinates
		var bridgeWidth = tileWidth * (sliceTiles - 0.25) * 0.5;
		
		this.y += this.dy;
		//dy is split in half so it's more precisely integrated
		this.dy -= this.ay * dt * 0.5;
		if (!this.dead) {
			this.x = clamp(this.x + this.dx * dt, -bridgeWidth, bridgeWidth);
			this.z += calcZSpeed(this.z) * dt;
			if (this.dy < 0 && this.y < 0) {
				if (this.onGround()) {
					this.dy = 0;
					this.y = 0;
				} else {
					if (this.hotFeet) {
						this.heatWater();
						return;
					}
					if (this.y < killPlane) {
						this.dead = true;
					}
				}
			}
		}
	}

	heatWater() {
		var bc = spaceToBridge(this.x, this.z);
		bridge[bc[1]][bc[0]] = 10;
		console.log(bc[1], bc[0]);
		this.hotFeet = false;
	}

	pickPowerups() {
		//don't pick it if not on the ground
		if (this.y > 0) {
			return;
		}

		var bc = spaceToBridge(this.x, this.z);
		var t = bridge[bc[1]][bc[0]];
		if (t <= 1) {
			return;
		}

		//hot feet
		if (t == 2) {
			this.hotFeet = true;
		}

		//clear bridge
		if (t == 3) {
			for (var p=bc[1]; p<bridge.length; p++) {
				bridge[p] = bridge[p].map(a => Math.max(a, 1));
			}
		}

		//low-grav
		if (t == 4) {

		}

		//boat
		if (t == 5) {

		}

		//obsidian
		if (t == 10) {
			return;
		}

		//pick it up
		bridge[bc[1]][bc[0]] = 1;

	}

	draw() {
		var coords = spaceToScreen(this.x, this.y + calcHeight(playerTrueZ), playerTrueZ);
		coords[1] -= canvas.height / 10;
		var base = spaceToScreen(this.x, calcHeight(playerTrueZ), playerTrueZ)[1] - (canvas.height / 10);

		var ry = canvas.height / 10;
		var rx = canvas.height / 15;
		var rs = canvas.height / 100;

		//clipping is slow but also consider that I'm lazy
		if (this.dead) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, canvas.width, base + ry * 1.1);
			ctx.clip();
		}
		ctx.fillStyle = "#F8F";
		drawEllipse(coords[0], coords[1], rx, ry, "#F8F");

		if (this.hotFeet) {
			for (var k=0; k<10; k++) {
				drawEllipse(...polToXY(coords[0], coords[1] + ry, randomBounded(0, Math.PI * 2), randomBounded(0, rx / 3)), rs, rs, powerup_colors[2]);
			}
		}

		if (this.dead) {
			ctx.restore();
		}
	}
}

class Player_Boat extends Player {
	constructor(x, z, hasHotFeet) {
		super(x, z, hasHotFeet);

		this.sinkAmount = 0.15;
		this.boostWater = 1.2;
		this.boostLand = 0.5;
	}

	draw() {
		var coords = spaceToScreen(this.x, calcHeight(playerTrueZ) - this.sinkAmount * (this.onGround() > 0), playerTrueZ);

	}
}