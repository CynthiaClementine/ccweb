
//player class
class Player {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.health = 3;
		this.maxHealth = 3;

		this.angle = 0;
		this.angleQueue = [0];
		this.queuePos = 0;
		this.queueProgressSpeed = 5;

		this.cooldown = 0;
		this.shieldOffset = 15;
		this.shieldSize = 10;
		this.shieldCoverAngle = this.shieldSize / (this.shieldOffset * Math.PI);

		this.totalBlocks = 0;
	}

	tick() {
		//move arm
		if (this.angleQueue.length > 1) {
			//fix distances
			if (Math.abs(this.angleQueue[0] - this.angleQueue[1]) > Math.PI) {
				if (this.angleQueue[0] == 0) {
					this.angleQueue[0] = Math.PI * 2;
				} else if (this.angleQueue[1] == 0) {
					this.angleQueue[0] = Math.PI / -2;
				}
			}


			this.queuePos += 1 / this.queueProgressSpeed;
			this.angle = linterp(this.angleQueue[0], this.angleQueue[1], this.queuePos);
			if (this.queuePos > 0.999) {
				this.queuePos = 0;
				this.angleQueue.splice(0, 1);
			}
		}

		//decrease cooldown
		this.cooldown *= 0.85;
	}

	beDrawn() {
		//actual self
		ctx.beginPath();
		ctx.fillStyle = color_player;
		ctx.lineWidth = 2;
		ctx.ellipse(this.x, this.y, this.shieldOffset / 2, this.shieldOffset / 2, 0, Math.PI / this.maxHealth, (Math.PI / this.maxHealth) + ((Math.PI * 2) / this.maxHealth) * this.health);
		ctx.fill();
		//offset of arm from center of screen
		var cOffset = [this.shieldOffset * Math.cos(this.angle), this.shieldOffset * Math.sin(this.angle)];
		var aOffset = [this.shieldSize * Math.cos(this.angle + Math.PI / 2), this.shieldSize * Math.sin(this.angle + Math.PI / 2)];

		ctx.beginPath();
		ctx.strokeStyle = cLinterp(color_shield, color_shield_bright, this.cooldown);
		ctx.moveTo(this.x + cOffset[0] + aOffset[0], this.y + cOffset[1] + aOffset[1]);
		ctx.lineTo(this.x + cOffset[0] - aOffset[0], this.y + cOffset[1] - aOffset[1]);
		ctx.stroke();
	}
}


//a GameSet is the thing that houses all of the gameplay
class GameSet {
	constructor(player, doOffsets) {
		this.player = player;
		this.isOffset = doOffsets ?? false;

		this.ticksPerBeat = 50;
		this.orangeSeparation = 10;
		this.baseSpinChance = 0.1;

		this.oranges = [];

		this.time = 0;
		this.levelSpecs;
	}

	startLevel(levelID) {
		this.time = 0;
		this.levelSpecs = level_specifications[levelID];
	}

	beDrawn() {
		//draw the center bit
		this.player.beDrawn();


		//draw all the projectiles
		this.oranges.forEach(o => {
			o.beDrawn();
		});
	}

	createObject() {
		//only create in the game state
		if (state % 1 != 0) {
			return;
		}

		//only create while it's time
		//using this -1 expression so fractional times work
		var modularTime = (game_time + this.isOffset * (this.levelSpecs.ticksPerBeat / 2));
		if ((modularTime % this.levelSpecs.ticksPerBeat) - 1 >= 0) {
			return;
		}

		var dir = floor(randomBounded(0, 4));
		var spin = this.orangeShouldSpin();

		this.oranges.push(new bulletClasses[+spin](dir, this.player, this.levelSpecs.maxDist, this.levelSpecs.bulletSpeed));
	}

	orangeShouldSpin() {
		var index = this.oranges.length + this.player.totalBlocks;
		if (this.levelSpecs.spinProfile) {
			//read from the binary spin 
			console.log(index, this.levelSpecs.spinProfile.toString(2).padStart(16, 0));
			return this.levelSpecs.spinProfile.toString(2).padStart(16, 0)[index] == '1';
		}

		//use probability
		return (Math.random() < this.levelSpecs.spinChance);
	}

	shouldEndLevel() {
		if (this.levelSpecs.music != undefined) {
			return (this.player.totalBlocks > 1 && audio_musics[this.levelSpecs.music].paused);
		}

		//if player's hit too many blocks, end it
		return (this.player.totalBlocks >= this.levelSpecs.length);
	}

	tick() {
		//tick player
		this.player.tick();

		//create object if it's time
		this.createObject();

		//run through all objects and tick
		this.oranges.forEach(o => {
			o.tick();
		});
		this.oranges = this.oranges.filter(o => !o.destroy);

		//if the player's blocked too much move to the next level
		if (this.shouldEndLevel()) {
			state = 2;
		}

		//if the player's health is too low end the game
		if (this.player.health <= 0) {
			console.log(`health is too low`, this.levelSpecs);
			//don't bother displaying if the score isn't at least 1
			if (score > 0) {
				state = 4;
			} else {
				endGame();
			}
		}
	}
}

//projectile class
class Projectile {
	constructor(direction, target, maxDist, speed) {
		this.target = target;
		this.angle = direction * Math.PI * 0.5;
		this.speed = speed;
		this.dist = maxDist;
		this.maxDist = maxDist;
		this.r = 5;

		this.spent = false;
		this.destroy = false;
	}

	calculateAngle() {

	}

	hitPlayerEffects() {
		//if it's a music level potentially start the music
		if (level_specifications[level].music != undefined && this.target.totalBlocks == 0) {
			var audFile = audio_musics[level_specifications[level].music];
			audFile.currentTime = 0;
			audFile.play();
		}
		this.target.totalBlocks += 1;
		this.spent = true;
		
	}

	tick() {
		//if already spent get rid of self (being spent is just for animation purposes)
		if (this.spent) {
			this.destroy = true;
			return;
		}

		var speed = (this.speed / msFrame) * msDelta;
		var tar = this.target;
		this.dist -= speed;
		this.calculateAngle();

		//if too far away delete self
		if (this.dist > this.maxDist) {
			this.destroy = true;
			return;
		}

		//if too close hurt the player
		if (this.dist < (this.r / 2)) {
			this.hitPlayerEffects();
			tar.health -= 1;
			audio_damage.play();
			console.log(this.angle, this.dist);
			return;
		}

		//collide with shield if close enough
		if (Math.abs(this.dist - this.r - tar.shieldOffset) < Math.max(speed, this.r / 7) && modularDifference(this.angle, tar.angle, Math.PI * 2) < tar.shieldCoverAngle) {
			//collision case
			this.hitPlayerEffects();
			tar.cooldown = 1;
			score += 1;
			audio_block.currentTime = 0;
			audio_block.play();
		}
	}

	beDrawn() {
		var opacityDist = level_specifications[level].bulletSpeed * 20;
		var drawX = this.target.x + (this.dist * Math.cos(this.angle));
		var drawY = this.target.y + (this.dist * Math.sin(this.angle));


		if (this.dist + opacityDist >= this.maxDist) {
			ctx.globalAlpha = (this.maxDist - this.dist) / opacityDist;
		}
		ctx.fillStyle = color_projectile;
		ctx.beginPath();
		if (!this.spent) {
			ctx.arc(drawX, drawY, this.r, 0, Math.PI * 2);
		} else {
			ctx.ellipse(drawX, drawY, this.r / 2, this.r, this.angle, 0, Math.PI * 2);
		}
		ctx.fill();
		ctx.globalAlpha = 1;
	}
}

//modified projectiles
class Projectile_Spinning extends Projectile {
	constructor(direction, target, maxDist, speed, flipSpinDir) {
		super(direction, target, maxDist, speed);
		this.hitAngle = this.angle;
		this.aDifference = Math.PI;
		this.flipSpinDir = flipSpinDir ?? false;
	}

	calculateAngle() {
		var diMin = this.target.shieldOffset;
		var diMax = this.maxDist;

		var progress = getPercentage(diMin, diMax, this.dist);
		var absProgress = Math.abs(progress);
		var angularProgress = linterp(Math.abs(absProgress) ** 1.5, Math.abs(absProgress) ** 2.5, Math.abs(absProgress));
		if (progress < 0) {
			angularProgress *= -1;
		}
		this.angle = this.hitAngle + this.aDifference * angularProgress;
	}
}