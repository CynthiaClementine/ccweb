function polToXY(startX, startY, angle, magnitude) {
	var xOff = magnitude * Math.cos(angle);
	var yOff = magnitude * Math.sin(angle);
	return [startX + xOff, startY + yOff];
}

function clamp(num, min, max) {
	return num <= min ? min : num >= max ? max : num;
}

function spaceToScreen(x, y) {
	return [
		(cW / 2) + (x - cameraX) * cameraScale,
		(cH / 2) + (y - cameraY) * cameraScale
	];
}

function rot(x, z, radians) {
	var sin = Math.sin(radians);
	var cos = Math.cos(radians);
	return [x * cos - z * sin, z * cos + x * sin];
}

function getPercentage(val1, val2, checkVal) {
	return (checkVal - val1) / (val2 - val1);
}

//performs a linear interpolation between 2 values
function linterp(a, b, percentage) {
	return a + (b - a) * percentage;
}














//takes in a body to orbit, the periapsis, and the apoapsis, and returns the velocity at apoapsis for that orbit
function calculateOrbitalVelocity(body, periapsis, apoapsis) {
	if (apoapsis == periapsis) {
		//special case for completely circular orbits
		return Math.sqrt(body.gm / apoapsis);
	} else {
		//in an elliptical orbit, the formula is more generalized to v = sqrt(GM(2/r - 1/a)) where
		//G is gravitational constant, M is mass of center obj, r is current distance, and a is the semi-major axis
		//periapsis and apoapsis are always opposite, so I can just add them to get semi-major axis
		return Math.sqrt(body.gm * ((2 / apoapsis) - (1 / (periapsis + apoapsis))));
	}
} 

//takes in parameters and turns them into x / y, dx / dy
function calculateOrbitalParameters(body, apo, peri, apoA, startA, counterClockwiseBOOLEAN) {
	//make sure periapsis isn't greater than apoapsis, that would be weird
	if (peri > apo) {
		[apo, peri] = [peri, apo];
		apoA += Math.PI;
		startA += Math.PI;
	}

	//get base orbit
	var baseParams = calculateOrbitalParametersSIMPLE(body, apo, peri, startA);

	//if it's counterclockwise simply flip the velocity
	if (counterClockwiseBOOLEAN) {
		baseParams[2] *= -1;
		baseParams[3] *= -1;
	}

	//rotate by apoapsis angle
	[baseParams[0], baseParams[1]] = rot(baseParams[0], baseParams[1], apoA);
	[baseParams[2], baseParams[3]] = rot(baseParams[2], baseParams[3], apoA);

	//add to parent and return
	return [baseParams[0] + body.x, baseParams[1] + body.y, baseParams[2] + dx, baseParams[3] + dy];

}

//a helper function, because something was wrong with rotating orbits but I couldn't figure out what it was.
//This function can calculate orbital parameters as long as they're not tilted, and so is called by the main function and the orbit is tilted later.
function calculateOrbitalParametersSIMPLE(body, apo, peri, startA) {
	//formula for instantaneous velocity is v = sqrt(GM(2/r - 1/a)) (vis-viva equation) where r is current distance and a is semi-major axis
	//position on ellipse is (length * cos(theta), length * sin(theta))
	//length = ab / (sqrt((b * cos(theta))^2 + (a * sin(theta))^2))
	//semi-minor axis is sqrt(periapsis * apoapsis)
	//semi-major axis is apoapsis + periapsis

	//major / minor axes for convienence
	var major = (apo + peri) / 2;
	var minor = Math.sqrt(apo * peri);

	//first calculate position

	//position of orbiting planet from center of ellipse
	var sCos = Math.cos(startA);
	var sSin = Math.sin(startA);
	var lengthToEdge = (major * minor) / (Math.sqrt((minor * sCos) ** 2 + (major * sSin) ** 2));
	var [orbitX, orbitY] = [lengthToEdge * sCos, lengthToEdge * sSin];

	//position of center of ellipse from parent
	var lengthToCenter = major - peri;
	orbitX += lengthToCenter;


	//calculate velocity
	var currentHeight = Math.sqrt((orbitX ** 2) + (orbitY ** 2));
	var velocity = Math.sqrt((body.m / gravityDampener) * ((2 / currentHeight) - (1 / major)));

	//angle of velocity is tricky because this is an ellipse, not a circle. There is a pure mathmatical way to do this, but I'm lazy
	//velocity is always tangent to the ellipse, so I get a point slightly ahead of the planet and use atan to figure out that angle. For large orbits it'll be slightly off, but hey, it works
	//calculus wants what I have
	var da = -0.01;
	var sCos2 = Math.cos(startA + da);
	var sSin2 = Math.sin(startA + da);
	var l2 = (major * minor) / (Math.sqrt((minor * sCos2) ** 2 + (major * sSin2) ** 2));
	var xy2 = [l2 * sCos2, l2 * sSin2];

	var diff = [xy2[0] - (orbitX - lengthToCenter), xy2[1] - orbitY];

	var velAngle = Math.atan2(diff[1], diff[0]);

	var [dx, dy] = [velocity * Math.cos(velAngle), velocity * Math.sin(velAngle)];
	return [orbitX, orbitY, dx, dy];
}

//pretending all satellite masses = 1
function calculateEnergy(body, height, v) {
	//E = U + K
	//E = -GmM/r + 1/2mv^2
	return (0.5 * v * v) - (body.gm / height);
}

//just an approximation, but a pretty good one. Thanks ramanujan!
function ellipsePerim(a, b) {
	return (PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))));
}

function ellipseCenter(apo, peri, angle, body) {
	var a = (peri + apo) / 2;
	var c = a - peri;
	return polToXY(body.x, body.y, angle, c);
}

function ellipsePos(a, b, theta) {
	return [a * Math.cos(theta), b * Math.sin(theta)];
}

function bFromApoA(apo, a) {
	//apo = a + c
	//peri = a - c
	var c = apo - a;
	//c^2 = a^2 - b^2
	//b^2 = a^2 - c^2
	return Math.sqrt(a * a - c * c);
}

function orbitPerim(apo, peri) {
	var a = (apo + peri) / 2;
	return ellipsePerim(a, bFromApoA(apo, a));
}

function calculateDeltaTheta(a, b, theta0, arclen) {
	var tol = 100;
	var maxArclen = ellipsePerim(a, b);
	var delta = 0;
	while (arclen > maxArclen && tol > 0) {
		delta += PI * 2;
		arclen -= maxArclen;
	}

	//actual calculation
	var jumpTheta = 0.125;
	var jumpThetaMin = 0.125 / (2 ** 5);
	var p1 = ellipsePos(a, b, theta0);
	var p2, jumpDist;
	while (jumpTheta > jumpThetaMin / 2 && tol > 0) {
		delta += jumpTheta;
		//walk along the ellipse, adding the distance between each walk
		p2 = ellipsePos(a, b, theta0 + delta);
		jumpDist = dist(p1[0], p1[1], p2[0], p2[1]);
		arclen -= jumpDist;

		// console.log(jumpTheta, delta, p1, p2, jumpDist);

		//if we've overshot, fix it
		if (arclen < 0) {
			//if we're at the minimum jump distance, interpolate and return the delta
			if (jumpTheta <= jumpThetaMin) {
				// console.log(`found it`, jumpTheta, jumpThetaMin);
				return linterp(delta - jumpTheta, delta, getPercentage(arclen + jumpDist, arclen, 0));
			}

			//if not, walk back and shorten the jump distance
			arclen += jumpDist;
			delta -= jumpTheta;
			jumpTheta /= 2;
			p2 = p1;
		}

		p1 = p2;
		tol -= 1;
	}

	if (tol < 1) {
		console.log(`problem again!`);
	}

	//hopefully nothing broke
	return delta;
}

//if the small body is quite small compared to the large body, then we don't have to solve a quintic equation
function calculateL2Dist(largeBody, smallBody) {
	var mu = smallBody.gm / (smallBody.gm + largeBody.gm);
	var R = dist(largeBody.x, largeBody.y, smallBody.x, smallBody.y);
	var hillR = R * Math.cbrt(mu / 3);
	return R + hillR;
}