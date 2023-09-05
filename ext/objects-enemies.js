

//standard enemy class
class Enemy extends Orb {
	constructor(x, y, idleTexture, maxHealth, knockbackMultiplier) {
		super(x, y, 1, idleTexture);
		this.dies = true;
		this.deathTimer = 0;
		this.deathFriction = 0.95;

		this.iframes = 0;
		this.iframesMax = 30;

		this.knockback = knockbackMultiplier;
		this.maxHealth = maxHealth;
		this.health = maxHealth;
		this.state = "idle";
		this.color = "#000000";
	}

	draw() {
		//lower opacity when dead or injured
		if (this.health <= 0 || this.iframes) {
			ctx.globalAlpha = 0.6;
		}
		super.draw();
		ctx.globalAlpha = 1;
	}

	beDamaged(amount) {
		if (this.iframes != 0) {
			return;
		}
		this.iframes = this.iframesMax;
		this.health -= amount;
		if (this.health <= 0) {
			if (this.dies) {
				this.attacking = false;
				this.deathTimer += 1;
			}
		}
	}

	tick() {
		if (this.health > 0) {
			if (this.iframes > 0) {
				this.iframes -= 1;
			}
		} else if (this.dies) {
			this.dx *= this.deathFriction;
			this.dy *= this.deathFriction;
		}
		super.tick();
	}
}

class EnemySimple extends Enemy {
	constructor(x, y, attackTexture, maxHealth, knockbackMultiplier) {
		super(x, y, attackTexture, maxHealth, knockbackMultiplier);
		this.damageFrame = 5;
		this.attacking = false;
		this.friction = 0.85;

		//0 is the random square
		this.acceptableTargets = [0, 1, 2, 3, 4];
		this.target = [x, y];
		this.dTargets = [0, 0];
	}

	attack_start() {
		//face the player and start the attacking animation
		this.a = Math.atan2(player.y - this.y, player.x - this.x);
		this.attacking = true;
	}

	attack_damage() {
		//hit the player if they're close enough
		var relPos = rotate(player.x - this.x, player.y - this.y, -this.a);
		if (Math.abs(relPos[1]) < player.r && relPos[0] > 0 && relPos[0] < 1.5 && player.iframes == 0) {
			player.beDamaged(1);
		} else {
			audio_sfxChannel.play("fxMiss");
		}
	}

	draw() {
		var attackFrame = this.textureActive.frame;
		super.draw();
		if (Math.floor(attackFrame) != this.damageFrame && Math.floor(this.textureActive.frame) == this.damageFrame) {
			this.attack_damage();
		}
	}

	retarget() {
		var targets = [];
		
		//random target
		targets.push([Math.floor(randomBounded(fight_boundsUL[0], fight_boundsDR[0])) + 0.5, Math.floor(randomBounded(fight_boundsUL[1], fight_boundsDR[1])) + 0.5]);

		//directional targets
		for (var a=0; a<Math.PI-0.1; a+=Math.PI/4) {
			var baseVec = polToXY(0, 0, a, 1);

			//knowing the point (the player) and the direction (baseVec) find where it's closest to the self
			var t = ((this.x - player.x) * baseVec[0] + (this.y - player.y) * baseVec[1]) / (baseVec[0] * baseVec[0] + baseVec[1] * baseVec[1]);
			var targetLocale = [
				linterp(player.x, player.x + baseVec[0], t),
				linterp(player.y, player.y + baseVec[1], t),
			];

			//if the target is too close, push the target closer to the player
			if (Math.abs(targetLocale[0] - this.x) < 1 && Math.abs(targetLocale[1] - this.y) < 2.25) {
				var signData = Math.sign(t);
				t = signData * clamp(Math.abs(t) - 2, 0.9, 1e1001);
				targetLocale = [
					linterp(player.x, player.x + baseVec[0], t),
					linterp(player.y, player.y + baseVec[1], t),
				];
			}

			targets.push(targetLocale);
		}

		//select all acceptable targets
		var targetsPruned = [];
		this.acceptableTargets.forEach(t => {
			targetsPruned.push(targets[t]);
			if (editor_active) {
				drawCircle(...spaceToScreen(...targets[t]), 20, "#FF8888");
			}
		});
		

		//select the closest target
		targetsPruned.sort((a, b) => (distSquared(a[0] - this.x, a[1] - this.y) - distSquared(b[0] - this.x, b[1] - this.y)));
		this.target = targetsPruned[0];
	}

	setOptimalDashing() {
		//dashes are ordered so dashing diagonally will happen less
		var self = this;
		var dashOptions = [[2, 0], [0, -2], [-2, 0], [0, 2], [2, 2], [2, -2], [-2, -2], [-2, 2]].filter((a) => {
			//eliminate dash options that are too close to the player
			if (distSquared(self.x + a[0] - player.x, self.y + a[1] - player.y) < 1) {
				return false;
			}

			//eliminate dash options that go outside of the world
			if (self.x + a[0] < fight_boundsUL[0] || self.x + a[0] > fight_boundsDR[0] || self.y + a[1] < fight_boundsUL[1] || self.y + a[1] > fight_boundsUL[1]) {
				return false;
			}

			return true;
		});

		if (dashOptions[0] == undefined) {
			return -1;
		}
		//set the first dash option that works
		this.dx = this.dMax * dashOptions[0][0];
		this.dy = this.dMax * dashOptions[0][1];
	}

	tick() {
		//repel all other entities
		world_entities.forEach(e => {
			if (e != this) {
				if (e != player) {
					circleRepel(e, this.x, this.y, this.r);
				} else {
					circleRepel(e, this.x, this.y, this.r / 2);
				}
			}
		});
		//simple enemies only have an attacking animation so they must be reset constantly when not attacking
		if (this.attacking) {
			if (this.textureActive.frame >= this.textureActive.frames.length - 1) {
				this.attacking = false;
			}
			//attacking friction
			this.dx *= this.friction;
			this.dy *= this.friction;
		} else {
			this.textureActive.reset();
			
			if (this.health > 0) {
				//make sure self is moving towards the target
				this.dTargets = polToXY(0, 0, Math.atan2(this.target[1] - this.y, this.target[0] - this.x), this.dMax);
	
				this.dx = linterp(this.dx, this.dTargets[0], 0.2);
				this.dy = linterp(this.dy, this.dTargets[1], 0.2);
	
				//changing direction during the first few iframes causes directional weirdness
				this.a = Math.atan2(this.dy, this.dx);
			}
		}

		super.tick();
	}
}





class Enemy_Lord extends EnemySimple {
	constructor(x, y) {
		super(x, y, new Texture(data_textures.Lord.sheet, data_textures.tileSize, ...data_textures.Lord.attack, false), 10, 0.2);
		this.color = "#FF8800";
		this.dMax = 0.06;
		this.acceptableTargets = [1, 3];
		this.thinkTime = 5;
		this.thinking = 0;

		this.damageFrame = 7;
		this.knockback = 3;

		this.dashChance = 0.2;
		this.dashTime = 0;
		this.dashTimeMax = 10;
		this.dashGhostsMax = 4;
		this.dashGhosts = [];
		this.dashSpeedMult = 2;
		this.dashCooldown = 0;
		this.dashCooldownMax = 40;
	}

	dash() {
		this.dashTime = this.dashTimeMax;
		this.dashGhosts = [];
		this.dashCooldown = this.dashCooldownMax;
	}

	draw() {
		//draw ghosts if dashing
		if (this.dashTime > 0) {
			var ghostCoords;

			for (var ng=0; ng<this.dashGhosts.length; ng++) {
				ctx.globalAlpha = ng / this.dashGhosts.length;
				ghostCoords = spaceToScreen(this.dashGhosts[ng][0], this.dashGhosts[ng][1]);
				this.textureActive.draw(ghostCoords[0], ghostCoords[1], this.a, this.r * camera.scale);
				this.textureActive.frame = 0;
			}
			this.dashGhosts.push([this.x, this.y]);
			if (this.dashGhosts.length > this.dashGhostsMax) {
				this.dashGhosts.splice(0, 1);
			}
		}
		ctx.globalAlpha = 1;
		super.draw();
	}

	tick() {
		this.thinking += 1;
		if (this.dashCooldown > 0) {
			this.dashCooldown -= 1;
		}

		//if it's a decision point do some extra actions
		if (this.thinking % this.thinkTime == 0) {
			//decide where to target
			this.retarget();

			//if close to the player and able, attack them
			if (this.dashTime == 0 && !this.attacking && distSquared(this.x - player.x, this.y - player.y) <= 1) {
				this.attack_start();
			}

			//if able to dash
			if (!this.attacking && this.dashCooldown == 0 && Math.random() < this.dashChance) {
				//if the player's about to attack dash away
				if (player.textureActive == player.textureAttack && player.textureActive.frame > 0 && player.textureActive.frame < 2) {
					if (this.setOptimalDashing() != -1) {
						this.dash();
					}
				} else if (distSquared(this.x - player.x, this.y - player.y) > 16) {
					//if too far away from the player dash towards them
					this.dash();
				}
			}
		}
		
		super.tick();
		if (this.dashTime > 0) {
			this.dashTime -= 1;
			this.x += this.dx;
			this.y += this.dy;
		}
	}
}

class Enemy_Knight extends EnemySimple {
	constructor(x, y) {
		super(x, y, new Texture(data_textures.Guard.sheet, data_textures.tileSize, ...data_textures.Guard.attackKnight, false), 30, 0.05);
		this.color = "#EEEEFF";

		this.thinkTime = 5;
		this.thinking = 0;
	}

	tick() {
		circleRepelPlayer(this.x, this.y, 0.6);

		this.thinking += 1;

		//if it's a decision point do some extra actions
		if (this.health > 0 && this.thinking % this.thinkTime == 0) {
			this.retarget();

			//if close enough to the player, attack
			if (distSquared(this.x - player.x, this.y - player.y) < 1) {
				this.attack_start();
			}
		}
		super.tick();
	}
}

class Enemy_Guard extends Enemy_Knight {
	constructor(x, y) {
		super(x, y);
		this.health = 10;
		this.maxHealth = 10;
		this.textureAttack = new Texture(data_textures.Guard.sheet, data_textures.tileSize, ...data_textures.Guard.attack, false);
		this.textureActive = this.textureAttack;
		this.knockback = 1.2;
		this.dMax = 0.075;
		this.color = color_castleEntities;
	}
}


class Enemy_Angel extends Enemy {
	constructor(x, y) {
		super(x, y, new Texture(data_textures.Queen.sheet, data_textures.tileSize, ...data_textures.Queen.idle, true), 200, 0);
		this.r = 1.5;
		this.dMax = 0.3;
		this.color = "#00FFFF";
		this.maxHealth = this.health;
		this.states = ["magic","curl","cower", "fly"];
		//states last different periods of time. That length data is stored here
		//magic and cower data is in frames, while curl and fly data is in number of locations
		this.stateLengths = {
			"magic": [600, 840],
			"curl": [8, 20],
			"fly": [10, 18],
			"cower": [200, 510]
		};
		this.state = this.states[0];
		this.goalState;
		this.bannedStates = {};

		this.centerPos = [141.5, 16];

		this.iframes = 0;
		this.iframesMax = 30;

		
		//buffer T is for a state timer, buffer L is for length, and then buffers 1 2 and 3 are for misc variables a state may use
		this.stateBufferT = 0;
		this.stateBufferL;
		this.stateBuffer1;
		this.stateBuffer2;
		this.stateBuffer3;
		
		this.magic_largeNum = 5;
		this.magic_largePeriod = 30;
		this.magic_smallNum = 10;
		this.magic_smallPeriod = 15;
		this.magic_orbitSpeed = 0.01;

		this.curl_dropPeriod = 2;
		this.curl_dropTime = 150;

		this.fly_orbChance = 0.1;
		this.fly_orbSpread = 0.5;
		this.fly_heightStrength = 0.01;
		this.fly_widthStrength = 0.05;
		this.fly_speed = 0.15;

		this.cower_pulses = [3, 5, 7];
		this.cower_count = 42;




		var d = data_textures;
		var dQ = data_textures.Queen;
		this.textureMagic = new Texture(dQ.sheet, d.tileSize, ...dQ.magicUse, false);
		this.textureCurl = new Texture(dQ.sheet, d.tileSize, ...dQ.curl, false);
		this.textureFlyLeft = new Texture(dQ.sheet, d.tileSize, ...dQ.flyLeft, false);
		this.textureFlyRight = new Texture(dQ.sheet, d.tileSize, ...dQ.flyRight, false);
		this.textureCower = new Texture(dQ.sheet, d.tileSize, ...dQ.cowerStart, false);
		this.textureCowerLoop = new Texture(dQ.sheet, d.tileSize, ...dQ.cowerLoop, true);

		this.state_start();
	}

	beDamaged(amount) {
		var multiplier = 1 - (this.iframes / this.iframesMax);
		this.health -= amount * multiplier;
		this.iframes += Math.ceil(this.iframesMax / 4);
		this.iframes = Math.min(this.iframesMax, this.iframes);
		if (this.health <= 0) {
			this.state = "death";
		}
	}

	draw() {
		super.draw();

		if (editor_active) {
			ctx.fillStyle = color_textBackground;
			ctx.font = `${canvas.height / 40}px Playfair Display`
			ctx.fillText(this.stateBufferT, 50, canvas.height * 0.9);
			ctx.fillText(this.stateBufferL, 50, canvas.height * 0.95);
		}
	}

	state_start() {
		this.stateBufferL = Math.floor(randomBounded(this.stateLengths[this.state][0], this.stateLengths[this.state][1]));
		this.stateBufferT = 0;
		switch (this.state) {
			case 'magic':
				this.textureActive = this.textureMagic;
				break;
			case 'curl':
				this.textureActive = this.textureCurl;
				this.textureCurl.reset();

				this.stateBuffer3 = 0;
				if (this.stateBuffer1 == undefined) {
					var angle = randomBounded(0, Math.PI * 2);
					while (modularDifference(angle, 0, Math.PI / 2) < 0.15) {
						angle = randomBounded(0, Math.PI * 2);
					}
					this.stateBuffer1 = polToXY(0, 0, angle, this.dMax / 10);
				}
				break;
			case 'fly':
				//use buffer 1 as a position target, and buffer 2 as a previous position target
				if (this.stateBuffer1 == undefined) {
					this.stateBuffer1 = this.fly_choosePos();
					this.stateBuffer2 = [this.x, this.y];
					this.dx = 0.01;
					this.dy = 0.01;
				}
				this.textureActive = this.textureFlyLeft;
				break;
			case 'cower':
				this.textureActive = this.textureCower;
				this.textureCower.reset();

				//choose the times at which the pulses will happen
				var healthSegment = (this.cower_pulses.length - 1) - Math.floor(this.health / this.maxHealth * (this.cower_pulses.length - 0.01));
				this.stateBuffer1 = [];
				for (var a=0; a<this.cower_pulses[healthSegment]; a++) {
					this.stateBuffer1.push(Math.floor(randomBounded(1, this.stateBufferL - 4)));
					this.stateBuffer1.sort((a, b) => a - b);
				}
				break;
		}
		this.textureActive.reset();
	}

	state_end() {
		switch (this.state) {
			case "magic":
			case "cower":
				//just end the state
				this.state_endOfficial();
				break;
			case "curl":
				//switching to fly is a little difficult
				if (this.goalState == "fly") {
					var goLeft = this.dx < 0;
					//set both targets
					this.stateBufferT = -goLeft;
					this.stateBuffer1 = [this.x + this.dx * 2, this.y + this.dy * 2];
					this.stateBuffer2 = [this.x - this.dx * 3, this.y - this.dy * 3];
					this.stateBuffer3 = undefined;

					this.state = this.goalState;
					this.goalState = undefined;
					this.state_start();
					return;
				}

				//if switching to magic / cower, make sure to be at the center
				if (Math.hypot(this.x - this.centerPos[0], this.y - this.centerPos[1]) < this.dMax * 3) {
					[this.x, this.y] = this.centerPos;
					this.dx = 0;
					this.dy = 0;
					this.state_endOfficial();
				}
				break;
			case "fly":
				//for magic or cower target the center
				if (this.goalState == "magic" || this.goalState == "cower") {
					if (this.stateBuffer1 != this.centerPos) {
						this.stateBuffer2 = this.stateBuffer1;
						this.stateBuffer1 = this.centerPos;
					}


					//if at the center split
					if (distSquared(this.centerPos[0] - this.x, this.centerPos[1] - this.y) < this.fly_speed) {
						this.x = this.centerPos[0];
						this.y = this.centerPos[1];
						this.dx = 0;
						this.dy = 0;
						this.state_endOfficial();
					}
					return;
				}
				//switching to curl is special because it's easy
				this.stateBuffer1 = polToXY(0, 0, Math.atan2(this.dy, this.dx), this.dMax / 10);
				this.stateBuffer2 = undefined;
				this.stateBuffer3 = undefined;
				this.state = this.goalState;
				this.goalState = undefined;
				this.state_start();
				break;
		}
	}

	state_endOfficial() {
		this.stateBufferT = 0;
		this.stateBufferL = 0;
		this.stateBuffer1 = undefined;
		this.stateBuffer2 = undefined;
		this.stateBuffer3 = undefined;

		this.state = this.goalState;
		this.goalState = undefined;
		this.state_start();
	}

	chooseNewState() {
		var state = this.states[Math.floor(randomBounded(0, this.states.length))];
		while (state == this.state) {
			state = this.states[Math.floor(randomBounded(0, this.states.length))];
		}
		return state;
	}

	tick() {
		//make sure to always have the next potential state lined up
		if (this.goalState == undefined) {
			this.goalState = this.chooseNewState();
		}

		if (this.iframes > 0) {
			this.iframes -= 1;
		}

		//repel the player and damage them
		if (distSquared(player.x - this.x, player.y - this.y) < 1) {
			circleRepelPlayer(this.x, this.y, 1);
			player.health -= 0.1;
			audio_sfxChannel.play('fxContact');
		}

		switch (this.state) {
			case 'magic':
				this.tick_magic();
				break;
			case 'curl':
				this.tick_curl();
				break;
			case 'fly':
				this.tick_fly();
				break;
			case 'cower':
				this.tick_cower();
				break;
			case 'death':
				this.dx *= this.deathFriction;
				this.dy *= this.deathFriction;
				this.x += this.dx;
				this.y += this.dy;
				break;
		}
	}

	tick_cower() {
		//warm up
		if (this.textureActive == this.textureCower) {
			if (this.textureActive.frame >= this.textureActive.frames.length - 1) {
				this.textureCowerLoop.reset();
				this.textureActive = this.textureCowerLoop;
			}
			return;
		}
		//time
		this.stateBufferT += 1;

		//if it's a pulse time, send out the pulses
		if (this.stateBufferT == this.stateBuffer1[0]) {
			this.stateBuffer1.splice(0, 1);

			for (var a=0; a<this.cower_count; a++) {
				world_entities.splice(1, 0, new MagicSphere_Enemy(this.x, this.y, "#AAFFFF", "#FFFFFF", Math.PI * 2 * (a / this.cower_count), false));
			}
			audio_sfxChannel.play('fxOrbS');
		}

		if (this.stateBufferT > this.stateBufferL) {
			this.state_end();
		}
	}

	tick_curl() {
		//accelerate
		this.dx += this.stateBuffer1[0];
		this.dy += this.stateBuffer1[1];
		var len = Math.hypot(this.dx, this.dy);
		if (len > this.dMax) {
			this.dx = this.dx / len * this.dMax;
			this.dy = this.dy / len * this.dMax;
			this.stateBuffer1 = [0, 0];
		}

		//collision detection
		var bounced = false;
		if (this.x + this.dx < fight_boundsUL[0] || this.x + this.dx > fight_boundsDR[0]) {
			this.dx *= -1;
			bounced = true;
		}
		if (this.y + this.dy < fight_boundsUL[1] || this.y + this.dy > fight_boundsDR[1]) {
			this.dy *= -1;
			bounced = true;
		}
		
		if (bounced) {
			this.stateBufferT += 1;
		}

		this.x += this.dx;
		this.y += this.dy;

		//small orbs every few temporal periods
		this.stateBuffer3 += 1;
		if (this.stateBuffer3 % this.curl_dropPeriod == 0) {
			var b = new MagicSphere_Enemy(this.x, this.y,  "#fffddd", "#FFFFFF", 0, false, this.curl_dropTime);
			b.dx = 0;
			b.dy = 0;
			world_entities.splice(1, 0, b);
		}

		if (this.stateBufferT > this.stateBufferL) {
			//adjust velocity towards the center maybe
			if (this.goalState == "magic" || this.goalState == "cower") {
				[this.dx, this.dy] = polToXY(0, 0, Math.atan2(this.centerPos[1] - this.y, this.centerPos[0] - this.x), this.dMax);
			}
			this.state_end();
		}
	}

	tick_fly() {
		if (editor_active) {
			drawCircle(...spaceToScreen(...this.stateBuffer1), canvas.height / 40, "#0F0");
			drawCircle(...spaceToScreen(...this.stateBuffer2), canvas.height / 40, "#F00");
		}

		//move
		var t = (this.x - this.stateBuffer2[0]) / (this.stateBuffer1[0] - this.stateBuffer2[0]);
		this.dx += clamp((this.stateBuffer1[0] - this.x), -this.fly_widthStrength, this.fly_widthStrength);
		this.dx = clamp(this.dx, -this.fly_speed, this.fly_speed);
		this.dy += clamp((this.stateBuffer1[1] - this.y), -this.fly_heightStrength, this.fly_heightStrength);
		this.dy = clamp(this.dy, -this.fly_speed, this.fly_speed);
		this.x += this.dx;
		this.y += this.dy;

		//change animation
		var previousTexture = this.textureActive;
		this.textureActive = (this.dx > 0) ? this.textureFlyRight : this.textureFlyLeft;
		//if switching make sure to reset
		if (this.textureActive != previousTexture) {
			this.textureActive.reset();
		}

		//if close to destination slow and reach for a new destination
		if (distSquared(this.x - this.stateBuffer1[0], this.y - this.stateBuffer1[1]) < this.dMax * this.dMax) {
			this.stateBufferT += 1;
			this.stateBuffer2 = this.stateBuffer1;
			this.stateBuffer1 = this.fly_choosePos();

			if (this.stateBufferT > this.stateBufferL) {
				this.state_end();
			}
		}
		//spray a few orbs
	}

	fly_choosePos() {
		var mult = boolToSigned(this.stateBufferT % 2 == 0);
		var initial = [Math.floor(player.x) + 0.5 + mult * Math.floor(randomBounded(1, 6)), Math.floor(player.y) + 0.5 + Math.floor(randomBounded(-1, 5))];
		//make sure this is inside the boundary
		initial[0] = clamp(initial[0], fight_boundsUL[0] + 1, fight_boundsDR[0] - 1);
		initial[1] = clamp(initial[1], fight_boundsUL[1] + 1, fight_boundsDR[1] - 1);
		return initial;
	}

	tick_magic() {
		this.stateBufferT += 1;
		//spray out magic orbs

		//large patterned orbs
		if (this.stateBufferT % this.magic_largePeriod == 0) {
			for (var f=0; f<this.magic_largeNum; f++) {
				world_entities.splice(world_entities.length-2, 0, new MagicSphere_Enemy(this.x, this.y, "#FFFF00", "#FFFF88", 
					//the angle the sphere goes out at is important and has lots of lengthily named variables in it
					this.stateBufferT * this.magic_orbitSpeed + Math.PI * 2 * (f / this.magic_largeNum), true));
			}
			audio_sfxChannel.play('fxOrbL');
		}
		
		//small, more random ones in phase 2
		if (this.health < this.maxHealth / 2 && this.stateBufferT % this.magic_smallPeriod == 0) {
			for (var f=0; f<this.magic_smallNum; f++) {
				world_entities.splice(1, 0, new MagicSphere_Enemy(this.x, this.y, "#AAAAFF", "#FFFFFF", randomBounded(0, Math.PI * 2), false));
			}
			audio_sfxChannel.play('fxOrbS');
		}

		//end state if out of time
		if (this.stateBufferT > this.stateBufferL) {
			this.state_end();
		}
	}

	state_magic() {
		//make sure self stays at the center and create orbs
		this.dx = 0;
		this.dy = 0;
	}

	state_curl() {

	}

	state_fly() {
	}

	state_cower() {

	}
}