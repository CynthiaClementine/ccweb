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
		this.a = 0;
	}

	draw() {
		//draw all children
		this.children.forEach(c => {
			c.draw();
		});

		var drawPos = spaceToScreen(this.x, this.y);

		//draw orbit ring
		if (this.parent) {
			if (this.parent.constructor.name == "Planet") {
				var parPos = spaceToScreen(this.parent.x, this.parent.y);

				//I do not understand why trying to use processing commands here causes the screen to flicker.
				// var r = dist(...drawPos, ...parPos);
				// ctx.beginPath();
				// ctx.lineWidth = cW / 100
				// ctx.arc(...parPos, r, 0, Math.PI * 2);
				// ctx.stroke();
				var r = dist(...drawPos, ...parPos);

				noFill();
				stroke(255, 255, 255, clamp(100 * (1 - (r / 12000)), 0, 100));
				circle(...parPos, 2 * dist(...drawPos, ...parPos));
				noStroke();
			}
		}

		//draw self
		fill(this.c);
		circle(...drawPos, Math.max(6, 2 * this.r * cameraScale));
	}

	tick(dt) {
		if (this.parent) {
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
		//tick all children, also pull them along
		this.children.forEach(c => {
			if (c.constructor.name == "Satellite") {
				c.x += this.dx;
				c.y += this.dy;
			}
			c.tick(dt);
		});
	}

	calculatePos() {
		this.a = this.calculateAngleAt(time);
		return polToXY(this.parent.x, this.parent.y, this.a, this.peri);
	}

	calculateAngleAt(t) {
		return this.aStart + t * this.da;
	}

	giveROI() {
		//technically only supposed to be m / M but the Gs cancel out so it's fine
		return (this.peri * (this.gm / this.parent.gm) ** 0.4);
	}
}

//a satellite orbits some body, and can change its orbit over time. It has no gravity.
class Satellite {
	constructor(id, ownedBy, orbitParams, blorbo) {
		this.id = id;
		// this.timeStart = launchDate;
		this.ownedBy = ownedBy;
		this.text = blorbo;

		this.moveDat = orbitParams;
		this.moveDatFull = [];
		
		this.dx = 0;
		this.dy = 0;
		this.x = 0;
		this.y = 0;

		this.state = -1;
		//TODO: this is a temp variable, change how orbits work later
		this.theta = Math.PI;
		this.da = 0;

		this.parseOrbitParams();
	}

	tick(dt) {
		this.dt = dt;
		//do we need to move state forwards?
		if (this.state < this.moveDatFull.length - 1) {
			if (this.moveDatFull[this.state+1][0] < time) {
				this.increaseState(dt);
			}
		}

		//check for activity
		if (this.state < 0) {
			return;
		}

		var stDat = this.moveDatFull[this.state][1];

		//landed
		if (stDat.peri == 0) {
			return;
		}

		//set up orbit to start
		this.updatePos();

		//lagrange
		if (stDat.body2 != undefined) {
			this.theta += dt * (Math.PI * 2 / stDat.period) * stDat.parity;
			return;
		}

		//regular elliptical orbit
		var a = (stDat.peri + stDat.apo) / 2;
		var b = bFromApoA(stDat.apo, a);
		var velocity = this.calcV(stDat);

		this.da = calculateDeltaTheta(a, b, this.theta, velocity * dt * stDat.parity);
		this.theta += this.da;
	}

	calcV(stDat) {
		var h = dist(stDat.body.x, stDat.body.y, this.x, this.y);
		var v = Math.sqrt(2 * stDat.energy + (2 * stDat.body.gm) / h);
		if (Number.isNaN(v)) {
			console.error(`bad velocity for satellite ${this.id} in stage ${this.state}!`);
			return 0;
		}
		//v is initially in km/d (why km? Why not m? whatever)
		//so multiply by 1000 to get to m/d, then multiply by d/s to get to m/s
		return 1000 * v * daysToSeconds;
	}

	updatePos() {
		var stDat = this.moveDatFull[this.state][1];

		//lagrange case
		if (stDat.body2 != undefined) {
			var centerPos = polToXY(stDat.body.x, stDat.body.y, stDat.body2.a, calculateL2Dist(stDat.body, stDat.body2));
			[this.x, this.y] = polToXY(...centerPos, stDat.body2.a + Math.PI / 2, stDat.peri * Math.sin(this.theta));
			return;
		}

		//regular case
		var a = (stDat.peri + stDat.apo) / 2;
		var b = bFromApoA(stDat.apo, a);
		var c = a - stDat.peri;

		var selfPos = ellipsePos(a, b, this.theta);
		selfPos[0] += c;
		selfPos = rot(...selfPos, stDat.a);

		this.x = selfPos[0] + stDat.body.x;
		this.y = selfPos[1] + stDat.body.y;
	}

	draw() {
		if (this.state < 0) {
			return;
		}

		if (this.moveDatFull[this.state][1].peri == 0) {
			return;
		}

		//draw self
		this.drawOrbit(this.moveDatFull[this.state][1]);

		
		//draw future orbit if there is one
		if (this.state < this.moveDatFull.length - 1) {
			if (this.moveDatFull[this.state+1][0] < time) {
				this.increaseState(this.dt, true);
				try {
					this.drawOrbit(this.moveDatFull[this.state+1][1], true);
				} catch (e) {}
			}
		}
 
		//draw self on orbit
		fill(255, 255, 255);
		rect(...spaceToScreen(this.x, this.y), 3, 3);
	}

	drawOrbit(stDat, highlight) {
		var a = (stDat.peri + stDat.apo) / 2;
		var b = bFromApoA(stDat.apo, a);
		var c = a - stDat.peri;
		var drawA = a * cameraScale;
		var drawB = b * cameraScale;
		var drawC = c * cameraScale;

		var [x, y] = spaceToScreen(stDat.body.x, stDat.body.y);

		noFill();
		stroke(128 + 127 * (highlight || false), 128, 128);

		if (stDat.body2 != undefined) {
			//lagrange orbit
			var trueR = calculateL2Dist(stDat.body, stDat.body2);
			var L2Coords = polToXY(stDat.body.x, stDat.body.y, stDat.body2.a, trueR);
			L2Coords = spaceToScreen(...L2Coords);
			var offset = polToXY(0, 0, stDat.body2.a + Math.PI / 2, drawA);
			line(L2Coords[0] - offset[0], L2Coords[1] - offset[1], L2Coords[0] + offset[0], L2Coords[1] + offset[1]);
			noStroke();
			return;
		}

		drawEllipseBody(x, y, drawA, drawB, drawC, stDat.a);
		noStroke();
	}

	increaseState(dt, debug) {
		var stDat = this.moveDatFull[this.state+1][1];

		//first step case
		if (this.state == -1) {
			this.state += 1;
			stDat.body.children.push(this);
			return;
		}

		var oldStDat = this.moveDatFull[this.state][1];

		//make sure it's reasonable to switch orbits
		var pos = [this.x, this.y];
		var maxDelta = this.calcV(oldStDat) * dt;
		var newTheta;

		//calculate new orbit parameters
		if (stDat.body2 != undefined) {
			//lagrange case
			var newCenter = polToXY(stDat.body.x, stDat.body.y, stDat.body2.a, calculateL2Dist(stDat.body, stDat.body2));

			//transform to new orbit
			pos[0] -= newCenter[0];
			pos[1] -= newCenter[1];

			pos = rot(...pos, -stDat.body2.a);

			//in transformed coordinates, the lagrange orbit is a straight line centered at (0, 0) that goes up and down
			var newPos = [0, clamp(pos[1], -stDat.peri, stDat.peri)];
			var dispPos = rot(...newPos, stDat.body2.a);

			if (debug) {
				fill(255, 0, 0);
				stroke(255, 0, 0);
				line(...spaceToScreen(...newCenter), ...spaceToScreen(dispPos[0] + newCenter[0], dispPos[1] + newCenter[1]));
				circle(...spaceToScreen(dispPos[0] + newCenter[0], dispPos[1] + newCenter[1]), 4);
			}

			//calculate distance
			if (dist(...pos, ...newPos) > maxDelta) {
				return;
			}

			//if we're actually switching, we should figure out orbit timings
			newTheta = Math.asin(newPos[1] / stDat.peri);
			//assume initial movement towards the center
			stDat.parity = (newTheta < 0) ? 1 : -1;

		} else {
			var newA = (stDat.apo + stDat.peri) / 2;
			var newB = bFromApoA(stDat.apo, newA);
			var newRot = stDat.a;
			
			//transforming to new orbit
			var newCenter = ellipseCenter(stDat.apo, stDat.peri, stDat.a, stDat.body);
			pos[0] -= newCenter[0];
			pos[1] -= newCenter[1];
			pos = rot(...pos, -newRot);
			var newTheta = Math.atan2(pos[1] / newB, pos[0] / newA);
			newTheta = (newTheta + PI * 2) % (PI * 2);

			//calculate the closest position on the new orbit (also in transformed coordinates)
			var newPos = ellipsePos(newA, newB, newTheta);
			var dispPos = rot(...newPos, newRot);

			if (debug) {
				fill(255, 0, 0);
				stroke(255, 0, 0);
				// console.log(newPos, stDat.body.x, stDat.body.y);
				line(...spaceToScreen(...newCenter), ...spaceToScreen(dispPos[0] + newCenter[0], dispPos[1] + newCenter[1]));
				circle(...spaceToScreen(dispPos[0] + newCenter[0], dispPos[1] + newCenter[1]), 4);
			}
			
			//finally compare them
			if (dist(...pos, ...newPos) > maxDelta) {
				//too far, try again later
				return;
			}
		}

		//we're all good!
		console.log(`switching to stage ${this.state}`);
		//update body ownership
		if (oldStDat.body.children.includes(this)) {
			oldStDat.body.children.splice(oldStDat.body.children.indexOf(this), 1);
		}
		stDat.body.children.push(this);

		//update actual state
		this.state += 1;
		
		// var absT = this.theta + oldStDat.a;
		// this.theta = absT - stDat.a;
		this.theta = newTheta;

		this.updatePos();
	}

	parseOrbitParams() {
		this.moveDatFull = [];
		this.moveDat.forEach(d => {
			var spl = d.split(" ");
			var datum = [];
			var bod = solarBodies[spl[2]];
			datum[0] = dateToTime(spl[0]);

			switch (spl[1]) {
				case "orbit":
					var peri = +spl[3];
					
					if (spl.length == 4) {
						//circular gives 1 argument
						datum[1] = {
							body: bod,
							peri: peri,
							apo: peri,
							a: 0,
							//we can shortcut energy for circular orbits
							energy: -bod.gm / (2 * peri),	//calculateEnergy(bod, peri, calculateOrbitalVelocity(bod, peri, peri))
							parity: 1
						};
					} else if (spl.length == 5) {
						var superSpl = spl[2].split("-");
						//lagrange orbit
						datum[1] = {
							body: solarBodies[superSpl[0]],
							body2: solarBodies[superSpl[1]],
							peri: peri,
							apo: peri,
							a: 0,
							period: +spl[4],
							parity: 0
						}
					} else if (spl.length == 6 || spl.length == 7) {
						//elliptical gives 3 arguments
						datum[1] = {
							body: bod,
							peri: peri,
							apo: +spl[4],
							a: +spl[5],
							energy: calculateEnergy(bod, +spl[4], calculateOrbitalVelocity(bod, peri, +spl[4])),
							parity: (spl[6] == "CW") ? -1 : 1
						};
					} else {
						console.error(`invalid command: ${d}`);
					}
					break;
				case "land":
					datum[1] = {
						body: bod,
						peri: 0,
						apo: 0,
					}
					break;
				case "escape":
					break;
			}

			this.moveDatFull.push(datum);
		});
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
					"sun", -2.526406, 30688, 2867E9),
	'neptune':	new Planet("neptune", 68351E5, 24622E3, "#6BF",
					"sun", -1.026245, 59800, 4515E9),
};
var solarKeys = Object.keys(solarBodies);

solarBodies["sun"].children = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"].map(p => solarBodies[p]);
solarBodies["earth"].children = ["moon"].map(p => solarBodies[p]);



/*satellites have commands in their orbit data. Orbit data takes the form
[date] [command type] [arguments]

the date is the time at which the satellite should attempt to execute the command
the command type and arguments specify what the satellite is actually doing.
Here is the list of all commands:
	orbit [body] [height]						orbits a specific body in a circular orbit at the height specified 
	orbit [body] [periaps] [apoaps] [angle]		orbits a specific body in an elliptical orbit with these arguments
	land [body]									parks the satellite at the body's position
	escape [speed]								starts the satellite on a straight line escape trajectory from the solar system. 
												The satellite will travel in a straight line, starting at the specified speed and slowing down according to gravity.

*/
var satData = [
	/*
	new Satellite(`test`, `NASA`, [

		`Jan-1-1957 orbit earth 1000E4`,
		`Jan-15-1957 orbit earth 1000E4 8000E4 3.3`,
		`Feb-1-1957 orbit earth 1000E4 4000E5 3.3`,
		// `Feb-5-1957 orbit earth 4000E5`,
		// `Feb-6-1957 orbit moon 500E5`,
		// `Mar-20-1958 land moon`

	], `a satellite used for testing. Will orbit the earth for exactly one year.`),*/

	// new Satellite(`test2`, `NASA`, [`Jan-1-1957 orbit earth 3.84E8`], `a`),
	// new Satellite(`test3`, `NASA`, [`Jan-1-1957 orbit earth 3E8`], `a`),
	

	// new Satellite(`Voyager I`, `NASA`, [
	// 	`Sept-5-1977 orbit earth 1E7`,
	// 	`Sept-10-1977 orbit sun 149E9 780E9 4.5`,
	// 	// `Mar-5-1979 orbit sun 149E9 780E9 1.3`,
	// 	`Jan-1-2000 escape`,
		
	// ], `OwO`),
	
	
	//ANNOYING!

	// new Satellite(`test`, `China`, [
	// 	`Mar-28-2023 orbit earth 1.6E8 4.5E8 3.05`,
	// 	`Mar-27-2023 orbit earth-moon 0.4E8 20`,
	// ], `Equuleus is a nanosatellite launched by Japan to orbit around Earth's moon and Lagrange point 2 on November 16, 2022. Its purpose was to measure the distribution of plasma around the Earth.`),

	


	
	
	//completed data
	new Satellite(`IM-1`, `US`, [
		`Feb-16-2024 orbit earth 6E6 3.85E8 1.62`,
		`Feb-18-2024 orbit moon 1.84E6 1E8 3.2`,
		`Feb-21-2024 orbit moon 1.84E6`,
		`Feb-24-2024 land moon`,
	], `IM-1 is a lunar mission satellite created by a U.S. company called Intutitive Machines. It was the first liquid methane and methalox-powered spacecraft to travel beyond low-earth orbit.`),

	new Satellite(`JWST`, `US/EU/Canada`, [
		`March-15-2022 orbit earth 0.1E8 1.52E9 -1.28 CW`,
		`April-5-2022 orbit sun-earth 2.5E8 90`,
	], `The James Webb Telescope was launched from French Guiana by collaborating countries from Europe along with the United States and Canada. 
	It was designed to construct infrared astronomy, and it orbits around the Sun-Earth Lagrange point 2 to maintain stability without expending fuel.`),

	new Satellite(`EQUULEUS`, `Japan`, [
		`Nov-16-2022 orbit earth 1E7 3.85E8 3.1`,
		`Nov-21-2022 orbit earth 0.5E8 4.5E8 2.4`,
		`Dec-25-2022 orbit earth 0.4E8 4.5E8 2.35`,
		`Dec-27-2022 orbit earth 0.4E8 4.05E8 2.55`,
		`Jan-8-2023 orbit earth 0.4E8 4.1E8 2.55`,
		`Jan-27-2023 orbit earth 0.4E8 4.1E8 2.6`,
		`Feb-6-2023 orbit earth 0.45E8 4.1E8 2.5`,
		`Feb-15-2023 orbit earth 0.45E8 4.1E8 2.2`,
		`Mar-30-2023 orbit earth 1.6E8 7E8 3.055`,
		//super scuffed, only gets to L2 on the third wrap-around
		//but I blame this on wikipedia for not giving me a full orbit diagram
		`Mar-31-2023 orbit earth-moon 0.4E8 20`,
	], `Equuleus is a nanosatellite launched by Japan to orbit around the Earth-Moon Lagrange point 2. Its purpose was to measure the distribution of plasma around the Earth.`),

	new Satellite(`Queqiao-2`, `China`, [
		`Mar-20-2024 orbit earth 7E6 0.3E8 2.8`,
		`Mar-21-2024 orbit earth 7E6 3.87E8 2.75`,
		`Mar-23-2024 orbit moon 2.1E6 2.5E7 -1.6 CW`,
		`Mar-25-2024 orbit moon 2.1E6 1.6E7 -1.6 CW`,
	], `Queqiao-2 is a relay satellite launched from China to a highly eccentric lunar orbit. Its purpose was to support communications from the far side of the moon and Lunar south pole.`),

	new Satellite(`IXPE`, `USA/Italy`, [
		`Dec-9-2021 orbit earth 6.91E6`,
	], `The IXPE is a space observatory satellite with 3 telescopes, designed to last for at least 2 years. Its purpose is to measure the polarization of various cosmic X-rays. `),

	new Satellite(`TURKSAT-5B`, `Turkey`, [
		`Dec-19-2021 orbit earth 7E6 4.22E7 2`,
		`Dec-20-2021 orbit earth 4.22E7`,
	], `TURKSAT-5B is a geostationary high-throughput communications satellite launched by Turkey to a geosynchronous orbit on December 19, 2021. It was developed for military and commercial purposes.`),

	new Satellite(`Artemis 1`, `USA`, [
		`Nov-19-2022 orbit earth 2.1E6 3.87E8 3.65`,
		`Nov-21-2022 orbit moon 2.2E6 5E7 -0.5 CW`,
		`Nov-22-2022 orbit moon 4.9E7 5E7 -0.5 CW`,
		`Nov-25-2022 orbit moon 2.1E6 4.9E7 3.3 CW`,
		`Nov-8-2022 orbit moon 2.1E6 1E8 -2.2 CW`,
		`Nov-30-2022 orbit earth 2.1E6 3.84E8 -0.63 CW`,
		`Dec-5-2022 land earth`,
	], `Artemis-1 is an uncrewed lunar orbit mission launched by the US on November 16, 2022. Its purpose was to test the Orion spacecraft's durability for future Artemis missions.`),

	new Satellite(`Chandrayaan-3`, `India`, [
		`Jul-14-2023 orbit earth 8E6 0.63E8 -0.33`,
		`Jul-15-2023 orbit earth 8E6 0.66E8 -0.33`,
		`Jul-17-2023 orbit earth 8E6 0.7E8 -0.33`,
		`Jul-20-2023 orbit earth 8E6 0.76E8 -0.33`,
		`Jul-22-2023 orbit earth 8E6 0.9E8 -0.32`,
		`Jul-27-2023 orbit earth 8E6 1.8E8 -0.3`,
		`Aug-1-2023 orbit earth 8E6 3.86E8 -0.3`,

		`Aug-4-2023 orbit moon 9E6 8E7 2.9`,
		`Aug-9-2023 orbit moon 9E6 3E7 2.9`,
		`Aug-15-2023 orbit moon 9E6 1E7 2.9`,
	], `Chandrayaan-3 is the third lunar exploration mission launched by India in the Chandrayaan program to a lunar orbit on July 14, 2023. 
	Its purpose was to demonstrate soft landing on a lunar surface.`),

	new Satellite(`lunIR`, `USA`, [
		`Nov-24-2022 orbit moon 2.0E6`
	], `The LunIR is a nanosatellite launched alongside the Artemis 1 mission to a lunar orbit. Its purpose is to observe the moon's spectroscopy and thermography.`),

	new Satellite(`SLIM`, `Japan`, [
		`Sept-6-2023 orbit earth 8E6 1.28E8 0.1`,
		`Sept-24-2023 orbit earth 8E6 2.56E8 0.1`,
		`Sept-25-2023 orbit earth 8E6 3.85E8 0.1`,
		`Sept-30-2023 orbit earth 1.75E8 11.95E8 1.42`,
		`Nov-1-2023 orbit moon 1E7 9E7 2.4`,
		`Nov-7-2023 orbit moon 1E7 5E7 2.4`,
		`Nov-8-2023 orbit moon 1E7 1E7 2.4`
	], `SLIM is a lunar lander satellite launched by Japan to a lunar orbit on September 6, 2023. The satellite was set to launch in 2021 but was postponed due to delays from its rideshare XRISM.`),
	
];