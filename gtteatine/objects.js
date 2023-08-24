//im sorry

class Player {
	constructor(x, z, hotFeet) {
		this.x = x ?? 0;
		this.y = 0;
		this.z = z ?? 0;

		this.dx = 0;
		this.dy = 0;

		this.ax = 20;
		this.ay = 0.7;

		this.rx = 0.25;
		this.ry = 0.55;

		this.dir = 0;

		this.dims = [0.08, 0.1];
		this.strafe = 6.5;
		this.friction = 0.85;
		this.jump = 0.2;

		this.speedMin = 3;
		this.speedMax = 15;

		this.dead = false;
		this.hotFeet = hotFeet ?? 0;
		this.hotFeetMax = 50;
		this.hotFeetVisal = 0.5;
		this.lastDT = 0;
	}

	onGround() {
		var d = this.dims;
		return (tileAt(this.x + d[0], this.z) || tileAt(this.x - d[0], this.z) || tileAt(this.x, this.z + d[1]) || tileAt(this.x, this.z - d[1]));
	}

	tick(dt) {
		this.lastDT = dt;
		this.pickPowerups();
		var activeAY = this.ay * (gravTime ? 0.7 : 1);

		//velocity
		this.dx = clamp(this.dx + this.dir * this.ax * dt, -this.strafe, this.strafe);
		if (this.dir * this.dx <= 0) {
			this.dx *= this.friction;
		}

		this.dy -= activeAY * dt * 0.5;

		//coordinates
		var bridgeWidth = tileWidth * (sliceTiles - 0.25) * 0.5;
		
		this.y += this.dy * dt;
		//dy is split in half so it's more precisely integrated
		this.dy -= activeAY * dt * 0.5;
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
						localStorage_write();
					}
				}
			}
		}
	}

	heatWater() {
		var bc = spaceToBridge(this.x, this.z);
		bridge[bc[1]][bc[0]] = 10;
		this.hotFeet -= 1;
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
			this.hotFeet += 1;
			if (this.hotFeet > this.hotFeetMax) {
				this.hotFeet = this.hotFeetMax;
			}
		}

		//clear bridge
		if (t == 3) {
			for (var p=bc[1]; p<bridge.length; p++) {
				bridge[p] = bridge[p].map(a => Math.max(a, 1));
			}
		}

		//low-grav
		if (t == 4) {
			if (gravTime == 0) {
				gravTime = gravTimeMax;
			} else if (gravTime > gravTimeMax * 0.25 && gravTime < gravTimeMax * 0.75) {
				gravTime = gravTimeMax * 0.75;
			} else if (gravTime < gravTimeMax * 0.25) {
				gravTime = gravTimeMax - gravTime;
			}
		}

		//boat
		if (t == 5) {
			player = new Player_Boat(this.x, this.z, this.hotFeet);
			player.dx = this.dx;
			player.dir = this.dir;
		}

		//obsidian
		if (t == 10) {
			return;
		}

		//pick it up
		bridge[bc[1]][bc[0]] = 1;
	}

	draw() {
		var coordsLow = spaceToScreen(this.x, this.y + calcHeight(playerTrueZ), playerTrueZ);
		var coordsX = spaceToScreen(this.x + this.rx, this.y + calcHeight(playerTrueZ) + this.ry, playerTrueZ);
		var coords = spaceToScreen(this.x, this.y + calcHeight(playerTrueZ) + this.ry, playerTrueZ);
		var base = spaceToScreen(this.x, calcHeight(playerTrueZ), playerTrueZ)[1] - (canvas.height / 10);

		var ry = coordsLow[1] - coords[1];
		var rx = coordsX[0] - coords[0];
		var rm = rx * 0.3;
		var rs = canvas.height / 200;
		var a = randomBounded;

		//clipping is slow but also consider that I'm lazy
		if (this.dead) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, canvas.width, base + ry * 1.1);
			ctx.clip();
		}
		drawEllipse(coords[0], coords[1], rx, ry, color_player);

		if (this.hotFeet > 0) {
			var off = [];
			var numDots = Math.ceil(this.lastDT * 1.2 + (this.hotFeetVisal * this.hotFeet));
			for (var k=0; k<numDots; k++) {
				off = polToXY(0, 0, a(0, Math.PI * 2), a(0, rm));
				//1s orbital
				drawEllipse(coords[0] + off[0], coords[1] + ry + off[1] * 0.8, rs, rs, powerup_colors[2]);

				//1p orbital
				if (this.hotFeet > 1 && k % 2 == 0) {
					var the = a(rm * -2, rm * 2);
					drawEllipse(coords[0] + the, coords[1] + ry, rs, rs, powerup_colors[2]);
				}

				//2s orbital
				if (this.hotFeet > 2 && k % 3 == 0) {
					off = polToXY(0, 0, a(0, Math.PI * 2), a(1.25 * rm, 1.75 * rm));
					drawEllipse(coords[0] + off[0], coords[1] + ry + off[1] * 0.8, rs, rs, powerup_colors[2]);
				}
			}
		}

		if (this.dead) {
			ctx.restore();
		}
	}
}

class Player_Boat extends Player {
	constructor(x, z, hotFeet) {
		super(x, z, hotFeet);

		this.ax = 30;
		this.strafe = 6.5;

		this.speedStoreL = this.speedMax;
		this.speedStoreS = this.speedMin;

		this.sinkAmount = 0.15;
		this.boostWater = 1.2;
		this.boostLand = 0.7;

		this.rx = 0.2;
		this.ry = 0.5;

		this.healthMax = 2.8;
		this.health = 2.8;
		this.gravLeniency = 0.1;
	}

	tick(dt) {
		this.speedMax = this.speedStoreL * (this.onGround() ? this.boostLand : this.boostWater);
		this.speedMin = this.speedStoreS * (this.onGround() ? this.boostLand : this.boostWater);


		super.tick(dt);
		if (this.dead) {
			this.dead = false;
		}
		if (this.y < -this.sinkAmount) {
			this.y = -this.sinkAmount;
			this.dy = 0;
		}
		if (this.onGround()) {
			this.health -= dt * (1 - (gravTime > 0) * this.gravLeniency);
			if (this.health < 0) {
				player = new Player(this.x, this.z, this.hotFeet);
				player.y = this.y;
				player.dy = this.dy;
				player.dx = this.dx;
				player.dir = this.dir;
			}
		}
	}

	draw() {
		var centerPos = [this.x, calcHeight(playerTrueZ) + this.sinkAmount * (this.onGround() > 0), playerTrueZ];

		this.drawFace(boat_faces[0], centerPos, color_boat);
		if (this.x <= 0) {
			this.drawFace(boat_faces[1], centerPos, color_boatLight);
		}
		if (this.x >= 0) {
			this.drawFace(boat_faces[2], centerPos, color_boatLight);
		}
		this.drawFace(boat_faces[3], centerPos, color_boatLight);
		this.drawFace(boat_faces[4], centerPos, color_boatLight);

		//player
		super.draw();

		if (this.x > 0) {
			this.drawFace(boat_faces[1], centerPos, color_boatLight);
		}
		if (this.x < 0) {
			this.drawFace(boat_faces[2], centerPos, color_boatLight);
		}
		this.drawFace(boat_faces[5], centerPos, color_boatLight);
		this.drawFace(boat_faces[6], centerPos, color_boatLight);

		//draw health bar
		var perc = this.health / this.healthMax;
		var barInd = perc * color_bar.length;
		centerPos[1] += this.ry * 2.2;
		var barPos = spaceToScreen(...centerPos);
		barPos[0] -= canvas.width * boat_barWidth * perc * 0.5;
		barPos[1] -= canvas.height * (boat_barHeight * 0.5);

		ctx.fillStyle = color_bar[Math.floor(barInd)];
		ctx.fillRect(barPos[0], barPos[1], canvas.width * boat_barWidth * perc, canvas.height * boat_barHeight);
		ctx.globalAlpha = barInd % 1;
		ctx.fillStyle = color_bar[Math.ceil(barInd)];
		ctx.fillRect(barPos[0], barPos[1], canvas.width * boat_barWidth * perc, canvas.height * boat_barHeight);
		ctx.globalAlpha = 1;
	}

	drawFace(faceArr, centerPos, color) {
		var ptsArr = faceArr.map(a => [...boat_verts[a]]);
		for (var p=0; p<ptsArr.length; p++) {
			[ptsArr[p][0], ptsArr[p][2]] = rotate(ptsArr[p][0], ptsArr[p][2], -0.4 * this.dx / this.strafe);
		}
		ptsArr = ptsArr.map(p => [p[0] * boat_scaling + centerPos[0], p[1] * boat_scaling + centerPos[1], p[2] * boat_scaling + centerPos[2]])
					.map(c => spaceToScreen(c[0], c[1], c[2]));
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(ptsArr[0][0], ptsArr[0][1]);
		for (var x=1; x<ptsArr.length; x++) {
			ctx.lineTo(ptsArr[x][0], ptsArr[x][1]);
		}
		ctx.fill();
		ctx.stroke();
	}

	heatWater() {

	}
}