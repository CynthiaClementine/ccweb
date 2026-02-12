class Base {
	constructor(x, y, r, spriteDat) {
		this.x = x;
		this.y = y;
		//this.r marks radius for collision, not necessarily for visuals. Sprite radius is different
		this.r = r;
		this.age = 0;
		this.spriteDat = spriteDat;
		this.sprite = φCreate("use", {
			x: x,
			y: y,
			href: (spriteDat.constructor.name == "String") ? `#${spriteDat}` : `#${spriteDat.name}-1`,
			"user-select": "none",
		});
		this.spriteScale = 1;
		this.spriteRot = 0;
		workspace.appendChild(this.sprite);
	}

	clampPos() {
		this.x = clamp(this.x, stage_boundaries[0][0], stage_boundaries[1][0]);
		this.y = clamp(this.y, stage_boundaries[0][1], stage_boundaries[1][1]);
	}

	delete() {
		this.sprite.remove();
	}

	moveTo(x, y, scale, rotation) {
		if (scale != undefined) {
			this.spriteScale = scale;
		}
		if (rotation != undefined) {
			this.spriteRot = rotation;
		}
		this.x = x;
		this.y = y;
		var effX = this.x / this.spriteScale;
		var effY = this.y / this.spriteScale;

		φSet(this.sprite, {
			x: effX,
			y: effY,
			transform: `rotate(${this.spriteRot} ${this.x} ${this.y}) scale(${this.spriteScale})`,
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
		this.iTime = 2.5;
		this.iFlashRate = 0.15;
		this.iCounter = 0;
	}

	beHit() {
		if (this.iCounter > 0) {
			return;
		}

		this.health -= 1;
		this.iCounter = this.iTime;
		readout_health.innerHTML = this.health;
	}

	tick(dt) {
		super.tick(dt);
		this.move(dt);

		//invincibility time
		if (this.iCounter > 0) {
			this.iCounter -= dt;
			φSet(this.sprite, {opacity: (this.iCounter % (this.iFlashRate * 2) < this.iFlashRate) ? 0.9 : 0.5});

			if (this.iCounter <= 0) {
				this.iCounter = 0;
				φSet(this.sprite, {opacity: 1});
			}
		}
	}

	move(dt) {
		//move towards the mouse.
		var speed = this.speed * dt;

		var pos = [this.x, this.y];
		var cpos = [cursor_x, cursor_y];
		var cvec = d2_subtract(cpos, pos);

		if (distSquared(...cvec) >= speed * speed) {
			cvec = d2_scaleBy(d2_normalize(cvec), speed);
		} else {
			this.moveTo(...cpos);
			this.clampPos();
			return;
		}

		this.x += cvec[0];
		this.y += cvec[1];

		this.clampPos();

		this.moveTo(this.x + cvec[0], this.y + cvec[1]);
	}
}




class Bullet extends Base {
	constructor(x, y, r, spriteType, dx, dy) {
		super(x, y, 1, "bullet_" + spriteType);
		this.dx = dx;
		this.dy = dy;
		this.r = r;
		this.angle = Math.atan2(this.dy, this.dx);
		this.spriteScale = this.r - 1;
		this.spriteRot = this.angle;
	}

	collide() {
		var largeBox = this.r * 2;
		//check for proximity to player
		if (Math.abs(this.x - player.x) > largeBox || Math.abs(this.y - player.y) > largeBox) {
			//collision with the walls now
			//young bullets have immunity so they can spawn outside the stage
			if (this.age < 0.1) {
				return;
			}

			//stage boundary check
			if (this.x + this.r < stage_boundaries[0][0] || this.x - this.r > stage_boundaries[1][0]) {
				this.delete();
				return;
			}
			if (this.y + this.r < stage_boundaries[0][1] || this.y - this.r > stage_boundaries[1][1]) {
				this.delete();
				return;
			}
		}

		if (distSquared(this.x - player.x, this.y - player.y) < this.r * this.r) {
			//collision!
			player.beHit();
			//destroy self
			this.delete();
			return;
		}
	}

	delete() {
		super.delete();
		this.sprite = undefined;
		//actual deletion will be done by the main bullet processing function
		//this is done for slight performance improvements when deleting many bullets on the same frame
		bullets_despawnable.push(this);
	}

	tick(dt) {
		super.tick(dt);
		//move by x, y
		this.moveTo(this.x + this.dx * dt, this.y + this.dy * dt);
			// this.determineSprite();
		this.collide();
	}
}

class Bullet_Aging extends Bullet {
	constructor(x, y, r, spriteType, dx, dy, maxAge) {
		super(x, y, r, spriteType, dx, dy);
		this.ageMax = maxAge;
	}

	tick(dt) {
		//if we're too old, get smaller
		if (this.age > this.ageMax) {
			var pastT = (this.age - this.ageMax) / 0.9;
			this.spriteScale = 1 * (1 - pastT ** 4);
			if (this.spriteScale <= 0) {
				this.delete();
				return;
			}
		}
		super.tick(dt);
	}
}

class Laser {
	constructor(x1, y1, x2, y2, width, color) {
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
		
		
		this.sprite = φCreate("g");

		this.sprite.appendChild(φCreate("line", {
			x1: x1,
			y1: y1,
			x2: x2,
			y2: y2,
			stroke: color,
			"stroke-width": (width + 1) * 1.5,
			"stroke-linecap": "round",
			"stroke-opacity": 0.7
		}));
		this.sprite.appendChild(φCreate("line", {
			x1: x1,
			y1: y1,
			x2: x2,
			y2: y2,
			stroke: color,
			"stroke-width": width + 1,
			"stroke-linecap": "round",
		}));


		workspace.appendChild(this.sprite);
	}

	delete() {
		this.sprite.remove();
	}

	tick(dt) {
		this.collide();
	}
}

class Bullet_Complex extends Bullet {
	constructor(x, y, r, spriteType, pathFunc) {
		super(x, y, 0, 0);
	}
}
