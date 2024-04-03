//did you ever hear the tragedy of darth object the wise? It's not a story the OOPers would tell you.



//a Planet is a body in space that has gravity. Planets can orbit other planets.
//This means the sun and moon are technically planets, because in this simulation they don't need to act any differently
class Planet {
	//all solar bodies have body parameters and orbital parameters.
	//all units here are in meters / kg
	//except for GM which is a mess of units but should still use meters/kg under the hood
	//and period is in days. sorry
	constructor(id, GM, radius, color, orbitingID, startAngle, period, periapsis) {
		this.id = id;
		this.gm = GM;
		this.r = radius;
		this.c = color;

		this.parent;
		this.children = [];
		
		if (orbitingID) {
			this.parent = orbitingID;
			this.peri = periapsis;
			this.da = Math.PI * 2 / period;
			this.aStart = startAngle;
		}

		this.dx = 0;
		this.dy = 0;

		this.x = 0;
		this.y = 0;
	}

	draw() {
		//draw all children
		this.children.forEach(c => {
			c.draw();
		});

		//draw self

	}

	tick() {
		if (this.parent != undefined) {
			//update reference to parent
			if (this.parent.constructor.name == "String") {
				this.parent = solarBodies[this.parent];
			}

			//move
			var tPos = this.calculatePos();
			//don't update dx from the first frame, because all planets start at 0, 0 and there would be wacky acceleration
			if (time != 0) {
				this.dx = tPos[0] - this.x;
				this.dy = tPos[1] - this.y;
			}

			[this.x, this.y] = tPos;
		}
		//tick all children
		this.children.forEach(c => {
			c.tick();
		});
	}

	calculatePos() {
		var targetA = this.aStart + time * this.da;
		return polToXY(this.parent.x, this.parent.y, targetA, this.peri);
	}
}

//a satellite orbits some body, and can change its orbit over time. It has no gravity.
class Satellite {
	constructor(id, launchDate, ownedBy, missionParams, blorbo) {
		this.id = id;
		this.timeStart = launchDate;
		this.ownedBy = ownedBy;
		this.moveDat = missionParams;
		this.text = blorbo;
	}

	tick() {

	}

	draw() {

	}
}





var solarBodies = {
	'sun':		new Planet("sun", 132712E9, 6957E5, "#FA0", undefined),
	'mercury':	new Planet("mercury", 22032E3, 2439.7E3, "#888", 
					"sun", 2.466852, 88, 57.9E9),
	'venus':	new Planet("mercury", 32486E4, 6052E3, "#FFC",
					"sun", -0.868539, 224.7, 108.2E9),
	'earth':	new Planet("earth", 39860E4, 6371E3, "#8F0",
					"sun", -2.954613, 365.25, 149.6E9),
	'moon':		new Planet("moon", 490E4, 1738.1E3, "#CCC",
					"earth", 0.186980, 27.3, 0.384E9),
	'mars':		new Planet("mars", 42828E3, 3390E3, "#C85",
					"sun", 2.547118, 687, 228E9),
	'jupiter': 	new Planet("jupiter", 126687E6, 69911E3, "#FD8",
					"sun", -1.714055, 4331, 778.5E9),
	'saturn':	new Planet("saturn", 37931E6, 58232E3, "#FE5", 
					"sun", -0.396354, 10747, 1432E9, 
					true),
	'uranus':	new Planet("uranus", 57940E5, 25362E3, "#8FF", 
					"sun", -2.526406, 30589, 2867E9),
	'neptune':	new Planet("neptune", 68351E5, 24622E3, "#6BF",
					"sun", -1.026245, 59800, 4515E9),
};
var solarKeys = Object.keys(solarBodies);

solarBodies["sun"].children = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"].map(p => solarBodies[p]);
solarBodies["earth"].children = ["moon"].map(p => solarBodies[p]);

var satData = [
	[]
];