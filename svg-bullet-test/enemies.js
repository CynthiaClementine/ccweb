
//the enemy template
class Enemy extends Base {
	constructor(x, y, spriteBaseID, homeX, homeY) {
		super(x, y, 7.5, spriteBaseID);
		this.spriteScale = 1.5;

		this.home = [homeX, homeY];
		this.start = [x, y];

		this.introTime = 1;
		this.cycles = [
			[1, 0.5, cbFlower],
		];	
	}

	bulletArgsDefault() {
		return [this.x, this.y, bullet_r, speed_med, "circle_g"];
	}

	//template for bullet cycle arguments
	bulletArgs(cycleNum) {
		return this.bulletArgsDefault();
	}

	posIntro(t) {
		t = (1 - (t / this.introTime)) ** 2;

		return linterpMulti(this.home, this.start, t);
	}

	//pos
	posMain(t) {
		return this.home;
	}

	calculatePos() {
		var targetPos;
		if (this.age < this.introTime) {
			targetPos = this.posIntro(this.age);
		} else {
			targetPos = this.posMain(this.age - this.introTime);
		}

		//if the position is undefined in any way, it's probably time to die
		if (!targetPos || !targetPos[0]) {
			this.delete();
			return;
		}

		this.moveTo(...targetPos);
	}

	determineSprite() {
		if (this.spriteDat.constructor.name == "String") {
			return;
		}

		//if it's animation data, we follow that
		var spd = this.spriteDat;
		var loopTime = (spd.frames.length / spd.fps);
		var activeTime = this.age;
		if (!spd.loop) {
			activeTime = Math.min(activeTime, loopTime - 0.01);
		}
		activeTime %= loopTime;
		//frame = activeTime * frames / loopTime, but loopTime = frames / fps
		//so frame = activeTime * fps
		console.log(spd);
		φSet(this.sprite, {"href": `#${spd.name}-${1 + Math.floor(activeTime * spd.fps)}`});
	}

	fire(dt) {
		//single cycle case
		if (this.cycles[0].constructor.name == "Number") {
			this.fire_cycle(this.cycles, dt, 0);
			return;
		}

		for (var c=0; c<this.cycles.length; c++) {
			this.fire_cycle(this.cycles[c], dt, c);
		}
	}

	fire_cycle(cycleDat, dt, index) {
		if (hasTimeCycle(this.age, dt, cycleDat[0], cycleDat[1], "enemy_fire")) {
			var func = cycleDat[2];
			var args = this.bulletArgs(index);
			//error checking. take this out later
			if (args.length != func.length) {
				console.error(`could not call ${func.name}! Was given ${args.length} args but needs ${func.length}`);
				return;
			}
			if (args.includes(undefined)) {
				console.error(`could not call ${func.name}! With args ${JSON.stringify(args)}`);
			}
			func(...args);

		}
	}

	delete() {
		super.delete();
		//remove self from the entities array
		entities.splice(entities.indexOf(this), 1);
	}

	determineSprite() {
		return;
	}

	tick(dt) {
		super.tick(dt);
		this.calculatePos();
		this.determineSprite();
		try {
			this.fire(dt);
		} catch (er) {
			console.error(`could not fire ${this.constructor.name}`, er);
		}
	}
}

class Woody extends Enemy {
	constructor(startX, startY, homeX, homeY) {
		super(startX, startY, "forest_woody", homeX, homeY);
		this.r += 2;

		this.cycles = [
			[1, 0.5, cbFlower],
			[2, 1, cbSingle],
		];
	}

	bulletArgs(cycleNum) {
		var basic = this.bulletArgsDefault();
		switch (cycleNum) {
			case 0:
				//num, radial, angular
				basic[5] = 4;
				basic[6] = 10;
				basic[7] = Math.random();
				return basic;
			case 1:
				basic[4] = "circle_y";
				basic[5] = angleToPlayer(this.x, this.y);
				return basic;
		}
	}
}

class Frog extends Enemy {
	constructor(startX, startY, midX, midY) {
		super(startX, startY, animations["frog"], midX, midY);

		this.cycles = [
			[5, 0.9, cbSingle],
			[5, 1.0, cbSingle],
			[5, 1.1, cbSingle]
		];
	}

	bulletArgs(cycleNum) {
		var basic = this.bulletArgsDefault();
		switch (cycleNum) {
			case 10:
				basic[5] = 8;
				basic[6] = 10;
				return basic;
			default: //this is kind of a workaround, we should get a better system
				basic[3] = speed_slow;
				// basic[5] = 3;
				basic[5] = angleToPlayer(this.x, this.y);
				// basic[7] = 0.3;
				return basic;
		}
	}

	posMain(t) {
		if (t > this.introTime) {
			return;
		}
		return this.posIntro(this.introTime - t);
	}
}

class FrogMage extends Enemy {
	constructor(startX, startY, endX, endY) {
		super(startX, startY, animations["mage_throw"], endX, endY);
		this.introTime = 0;
		this.mainTime = 10;

		this.cycles = [
			[0.1, 0, cbComplex],
			[animations["mage_throw"].len, 0.2, cbSpread],
			[animations["mage_throw"].len, 0.25, cbSpread],
			[animations["mage_throw"].len, 0.3, cbSpread]
		];
	}

	bulletArgs(cycleNum) {
		var basic = this.bulletArgsDefault();
		switch (cycleNum) {
			case 0:
				//it's important to do two separate rand calls for the correct distribution
				basic[0] += 0.5 * this.r * (rand(-1, 1) + rand(-1, 1));
				basic[1] += 0.5 * this.r * (rand(-1, 1) + rand(-1, 1));
				basic[3] = 0;
				basic[4] = "circle_y";
				basic[5] = 0;
				basic[6] = 10;
				return basic;
			default:
				basic[3] = speed_slow;
				basic[5] = 3;
				basic[6] = angleToPlayer(this.x, this.y);
				basic[7] = 0.3;
				return basic;
		}
	}

	posMain(t) {
		if (t > this.mainTime) {
			return;
		}
		console.log(t, this.mainTime, this.start, this.home);
		return linterpMulti(this.start, this.home, t / this.mainTime);
	}
}

class SpiderCat extends Enemy {

}











//boss template
class BossEnemy extends Enemy {

}