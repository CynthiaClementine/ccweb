class Base {
	constructor(x, y, r, spriteID) {
		this.x = x;
		this.y = y;
		//this.r marks radius for collision, not necessarily for visuals. Sprite radius is different
		this.r = r;
		this.age = 0;
		this.spriteID = spriteID;
		this.sprite = φCreate("use", {
			x: x,
			y: y,
			"user-select": "none",
			href: `#${spriteID}`,
		});
		workspace.appendChild(this.sprite);
	}

	clampPos() {
		this.x = clamp(this.x, stage_boundaries[0][0], stage_boundaries[1][0]);
		this.y = clamp(this.y, stage_boundaries[0][1], stage_boundaries[1][1]);
	}

	delete() {
		workspace.removeChild(this.sprite);
	}

	moveTo(x, y, scale, rotation) {
		scale = scale ?? 1;
		rotation = rotation ?? 0;
		this.x = x;
		this.y = y;
		var effX = this.x / scale;
		var effY = this.y / scale;

		φSet(this.sprite, {
			x: effX,
			y: effY,
			transform: `rotate(${rotation} ${effX} ${effY}) scale(${scale})`,
		});
	}

	tick(dt) {
		this.age += dt;
	}
}

class Player extends Base {
	constructor(x, y) {
		super(x, y, 1, "player");
		this.speed = 150;
		this.maxHealth = 3;
		this.health = 3;
	}

	tick(dt) {
		super.tick(dt);
		//move towards the mouse.
		var speed = this.speed * dt;

		var pos = [this.x, this.y];
		var cpos = [cursor_x, cursor_y];
		var cvec = d2_subtract(cpos, pos);

		if (distSquared(...cvec) >= speed * speed) {
			cvec = d2_scaleBy(d2_normalize(cvec), speed);
		} else {
			cvec = [0, 0];
		}

		this.x += cvec[0];
		this.y += cvec[1];

		this.clampPos();

		this.moveTo(this.x + cvec[0], this.y + cvec[1], 1);
	}
}

class Enemy extends Base {
	constructor(x, y, spriteBaseID, homeX, homeY) {
		super(x, y, spriteBaseID);

		this.home = [homeX, homeY];
		this.start = [x, y];

		this.introTime = 1;
	}

	posIntro(t) {
		t = (1 - t) ** 2;

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
			this.die();
			return;
		}

		this.moveTo(...targetPos);
	}

	fire(dt) {
		if (hasTimeCycle(this.age, dt, 1, 0.5)) {
			cbFlower(this.x, this.y, 4, 5, Math.random(), )
		}
	}

	die() {
		console.log(`dying`);
		//remove self from the entities array
		entities.splice(entities.indexOf(this), 1);
	}

	tick(dt) {
		super.tick(dt);
		this.calculatePos();
		this.fire(dt);
	}
}

class Forest_Basic extends Enemy {
	constructor(startX, startY, homeX, homeY) {
		super(startX, startY, "forest_woody", homeX, homeY);
	}
}

// class Enemy

class Bullet extends Base {
	constructor(x, y, r, spriteType, dx, dy) {
		super(x, y, "bullet_" + spriteType);
		this.dx = dx;
		this.dy = dy;
		this.r = r;
		this.angle = Math.atan2(this.dy, this.dx);
	}

	collide() {
		var largeBox = this.r * 2;
		//check for proximity to player
		if (Math.abs(this.x - player.x) > largeBox || Math.abs(this.y - player.y) > largeBox) {
			return;
		}

		if (distSquared() < this.r * this.r) {
			//collision!
			player.beHit();
			//destroy self
		}
	}

	tick(dt) {
		//move by x, y
		this.moveTo(
			this.x + this.dx * dt,
			this.y + this.dy * dt,
			this.r,
			this.angle,
		);
		this.collide();
		console.log(`hi`);
	}
}

class Bullet_Complex extends Bullet {
	constructor(x, y, r, spriteType, pathFunc) {
		super(x, y, 0, 0);
	}
}
