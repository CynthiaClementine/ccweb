
class Player {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.dx = 0;
		this.dy = 0;
		this.dz = 0;
		this.ax = 0;
		this.ay = -1;
		this.az = 0;

		this.thetaLast = 0;
		this.theta = 0;
		this.phi = 0;

		//constants
		this.speed = 4;
		this.accelPower = 10;
		this.height = 3;
	}

	tick(dt) {
		//theta is changed directly by mouse movements, so thetaLast gives approximate dTheta
		//use change in direction to change what our velocity should be
		var dTheta = this.theta - this.thetaLast;
		[this.dx, this.dz] = rotate(this.dx, this.dz, -dTheta);

		//add to speed via accel
		this.dx += this.ax * dt;
		//quick turnarounds
		if (this.dx * this.ax < 0) {
			this.dx *= -1;
		}
		if (this.dz * this.az < 0) {
			this.dz *= -1;
		}
		this.dz += this.az * dt;

		this.dy += this.ay * dt;

		this.x += this.dx * dt;
		this.y += this.dy * dt;
		this.z += this.dz * dt;

		//super simple ground collision check. Can't get away with this for anything more complicated than 2.5d but shhhhhh
		if (this.y <= this.height) {
			this.y = this.height;
			this.dy = 0;
		}

		this.thetaLast = this.theta;
	}
}