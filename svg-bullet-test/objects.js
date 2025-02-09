

class Base {
	constructor(x, y, spriteID) {
		this.x = x;
		this.y = y;
		this.sprite = φCreate("use", {
			'x': x,
			'y': y,
			'user-select': 'none',
			'href': `#${spriteID}`
		});
		workspace.appendChild(this.sprite);
	}

	delete() {
		workspace.removeChild(this.sprite);
	}
}




class Player extends Base {
	constructor(x, y) {
		super(x, y, "player");
		this.speed = 150;
	}

	tick(dt) {
		//move towards the mouse.
		var speed = this.speed * dt;

		var pos = [this.x, this.y];
		var cpos = [cursor_x, cursor_y];
		var cvec = d2_subtract(cpos, pos);

		if (distSquared(...cvec) < speed * speed) {
			return;
		}

		cvec = d2_scaleBy(d2_normalize(cvec), speed);

		this.x += cvec[0];
		this.y += cvec[1];

		φSet(this.sprite, {
			'x': this.x,
			'y': this.y,
		})
	}
}

class Bullet extends Base {
	constructor(x, y, dx, dy) {
		super(x, y);
		this.dx = dx;
		this.dy = dy;
	}
}