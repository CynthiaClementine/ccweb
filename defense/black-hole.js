

var randSeed = 1.23567;
function randomSeeded(min, max) {
	randSeed = randSeed * randSeed;
	while (randSeed > 100) {
		randSeed -= 90;
	}

	return min + (randSeed % 1) * (max - min);
}

var graphStorage = [];


//these constants aren't accurate to real life, instead they're changed a bit to make floating point math easier
const lightSpeed = 300;

var dt = 0.1;

var stars = [];
var starDists = [5000, 8000];
var starSizes = [1000, 4000];
var starNum = 100;

//this table stores [angle, screenX, derivative of screenX]
//tableData is an array of these mappings, starting at the minimum starDist and going to some maximum (maximum starDist + minimum starDist)
var tableData = {};
var tableZJump = 100;
var tableAJump = 0.0025;
var tableASpan = [-Math.PI / 2, Math.PI / 2];

var cameraZPos = -4000;
var cameraScale = 300;
var bhMass = 3E6;//2392500;
var bhEventSquared = (2 * bhMass / (lightSpeed ** 2)) ** 2;

function changeBHMass(newMass) {
	bhMass = newMass;
	bhEventSquared = (2 * bhMass / (lightSpeed ** 2)) ** 2;
}

//generate star sphere
var starCoords;
for (var s=0; s<starNum; s++) {
	var cosPhi = boolToSigned(randomSeeded(0, 1) < 0.5) * randomSeeded(0, 1) ** 2;
	starCoords = polToCart(randomSeeded(0, Math.PI * 2), Math.acos(cosPhi) - (Math.PI / 2), randomSeeded(starDists[0], starDists[1]));
	stars.push([starCoords[0], starCoords[1], starCoords[2], randomSeeded(starSizes[0], starSizes[1])]);
}

/*
NOTES


https://www.youtube.com/watch?v=Iaz9TqYWUmA most of this video doesn't particularly help, but maybe check the references?
the goal is to take a bunch of stars, the Z position of the black hole, and the mass of the black hole, and use that to calculate where all the stars are and what color they should be 
accretion disk??

notable radii:
	Event horizon = 2GM / c^2
	photon sphere -> 1.5 * event horizon
	accretion disk -> 3 * event horizon





PROCESS
the black hole can always be treated as directly in front of the camera - if the camera is given a -Z position and the black hole is given Z=0, then the star field can even rotate around the black hole
that would probably look cool

so camera - (0, 0, -num)
bh - (0,0,0)
stars - a field, centered around (0,0,0)

every star calculation can be simplified to 2d, just by rotating around the Z axis


+Z
|--------s
|       /
|      /
|     /
|    /
bh--/-----+X
|  /
| /
|/
c

once this triangle is calculated, rays can be fired at various theta and simulated (start from 0, go to 90° max)
simulate the path of the photon as it travels, stop its path once it gets to the same Z as the star
once it's there, measure its X position. If the X position is too small, increase theta; if x position is too great, decrease theta  -- newton-raphson method?
once a suitable theta is found transform back to 3d coordinates and draw the star at that theta using simple perspective

this approach has issues though
	1. too small theta results in a trapped photon, unable to reach the barrier
		put in an exit condition and count this as "too small x"

	2. for stars close to X=0, negative theta is also a solution
		can simulate two beams of light? One as discussed above and one where the space is flipped (so star X counts as negative)
		
	3. stars should smear out around the black hole, not remain points
		since the actual angular diameter doesn't change, this can easily be calculated using perspective projection + the star's radius



other optimizations:
	G - the gravitational constant - never appears without being multiplied by the mass of the object. Since this is code, I can simply multiply the mass of the object beforehand, ignoring G



ANOTHER NOTE:
	looking straight at a black hole and shooting photons at a screen behind the black hole, the curve you get either exactly is, or quite closely resembles,
	X = tan((2 / pi) * θ) + (H / θ)
	where X is the distance from the center of the screen, H is an unknown constant that changes with mass / screen Z, and θ is angle in degrees off of the black hole.
	See the above diagram for depiction of the screen / camera angles involved. This equation is currently unused because I went for a lookup table (I didn't want to calculate H) but this could be
	super useful.
	Changing the camera Z also just seems to zoom the graph in / out, rather than actually changing its parameters.
	
	None of this is super formal mathematical proof, it's just the results of running a simulation and looking at the output 



Ok here's the final solution:
	tracing photon paths is expensive. So we pre-trace a bunch of photon paths and then use that to calculate any future photon paths
*/


function bendPhoton(phoX, phoZ, phoTheta) {
	var dist = Math.sqrt(phoX * phoX + phoZ * phoZ);
	var angle = (Math.atan2(phoZ, phoX) + Math.PI * 2) % (Math.PI * 2);
	//weird relativity math
	var gTheta = bhMass / (dist * dist);
	gTheta = -gTheta * (dt / lightSpeed) * Math.sin(phoTheta - angle);
	gTheta /= Math.abs(1 - 2 * bhMass / (dist * lightSpeed * lightSpeed));

	return gTheta;
}

function einsteinRingTheta(starZPos) {
	return Math.sqrt((4 * bhMass * -cameraZPos) / (lightSpeed * lightSpeed * starZPos * (starZPos - cameraZPos)));
}

//simulates one photon's trajectory until it hits the screen
function screenXForPhoton(angle, screenZ) {
	//if the angle's 0 it's not going through the black hole - account for that special case here
	if (Math.abs(angle) < tableAJump) {
		return -1e1001;
	}
	var globalScaling = 0.094;
	//transform to world theta
	angle = (Math.PI / 2) - angle;
	//start the photon at the camera pos
	var phoX = 0;
	var phoZ = cameraZPos;
	var a = 0;

	// ctx.strokeStyle = "#FFF";
	// ctx.beginPath();
	// ctx.moveTo(phoX * globalScaling, phoZ * globalScaling);
	//simulate the photon
	while (true) {
		a++;
		angle -= bendPhoton(phoX, phoZ, angle);

		//if the photon has passed the screen Z return its position
		if (phoZ > screenZ) {
			//first trace backwards to the screen, don't want to overestimate it
			var movementVec = polToXY(0, 0, angle, lightSpeed * dt);
			phoX -= movementVec[0] * ((phoZ - screenZ) / movementVec[1]);

			// ctx.stroke();
			return phoX;
		}
		//there are a few cases where the photon will never reach the screen - account for those

		//if the photon has passed the photon sphere it won't come back
		//we still have to care about it if the camera is inside the photon sphere but when the camera is outside it it's fine
		if (phoX * phoX + phoZ * phoZ < bhEventSquared * 2.25) {
			// ctx.stroke();
			return -1e1001;
		}

		//if the photon has wrapped around and is too far backwards
		if (modularDifference(angle, Math.PI / -2, Math.PI * 2) < Math.PI * 0.5 && phoX * phoX + phoZ * phoZ > bhEventSquared * bhEventSquared) {
			// ctx.stroke();
			return -1e1001;
		}
		[phoX, phoZ] = polToXY(phoX, phoZ, angle, lightSpeed * dt);
		// ctx.lineTo(phoX * globalScaling, -phoZ * globalScaling);
		// console.log(phoX * globalScaling, phoZ * globalScaling);
	}
}

//returns the angle lsight has to be fired at to reach a specified screenX
function angleForScreenX(screenX, screenZ) {
	var xTolerance = 50;

	//if the X is too great don't even bother because it'll be off the screen
	if (Math.abs(screenX) > screenZ * 4) {
		return Math.PI * 0.5 * boolToSigned(screenX > 0);
	}

	//start with an initial guess
	// console.log(0, screenX, screenZ);
	var initialAGuess = Math.atan(screenX / screenZ);

	//check the true screen X
	// console.log(1, initialAGuess, tableAJump);
	var xResult = screenXForPhoton(initialAGuess, screenZ);
	var xDeltaResult = screenXForPhoton(initialAGuess + tableAJump, screenZ);
	var slope = (xDeltaResult - xResult) / tableAJump;

	//if the x result is close enough, return
	if (Math.abs(screenX - xResult) < xTolerance) {
		return initialAGuess;
	}
	
	//first make sure the slope matches with the correct area - otherwise we might be in the Forbidden Zone
	var u = 0;
	while (slope * initialAGuess < 0) {
		//multiply to get out of the Forbidden Zone
		initialAGuess = Math.min(initialAGuess * 2, Math.PI * 0.49);
		xResult = screenXForPhoton(initialAGuess, screenZ);
		xDeltaResult = screenXForPhoton(initialAGuess + tableAJump, screenZ);
		slope = (xDeltaResult - xResult) / tableAJump;
		// console.log(1.5, xResult, xDeltaResult);
		// console.log(2, initialAGuess, slope, screenZ);
		u += 1;
	}

	if (Number.isNaN(slope)) {
		return initialAGuess;
	}

	//now that we're in the safe region (bent tangent-like curve) recurse:
	u = 100;
	while (u > 0) {
		//if x is good enough, return
		if (Math.abs(screenX - xResult) < xTolerance) {
			return initialAGuess;
		}

		//if it's not good enough, move the aGuess based on slope
		//slope is Δx / Δa
		initialAGuess += 0.5 * (screenX - xResult) / slope;
		// console.log(3, initialAGuess);

		//if the target A has become NaN give up
		if (Number.isNaN(initialAGuess)) {
			return undefined;
		}
		xResult = screenXForPhoton(initialAGuess, screenZ);
		xDeltaResult = screenXForPhoton(initialAGuess + tableAJump, screenZ);
		slope = (xDeltaResult - xResult) / tableAJump;

		//if we've arrived in the forbidden zone again it's because that X simply can't be displayed
		if (initialAGuess * slope < 0) {
			return undefined;
		}

		u -= 1;
	}


	//check thte t
	return initialAGuess;
}

function drawStarsSimple() {
	//loop through all stars
	ctx.fillStyle = color_star;
	stars.forEach(s => {
		if (s[2] - cameraZPos < 0) {
			return;
		}
		//divide by z, multiply by scale, draw
		var sx = cameraScale * s[0] / (s[2] - cameraZPos);
		var sy = cameraScale * s[1] / (s[2] - cameraZPos);
		var sr = 1;//s[3] / (s[2] - cameraZPos);

		ctx.beginPath();
		ctx.arc(sx, sy, sr, 0, Math.PI * 2);
		ctx.fill();
	});
}

function graph() {
	ctx.fillStyle = color_star;
	//go from -45° to 45°
	var unit = 0.0025;
	var screenDist = 10000;
	var maxX = 1.5 * screenDist;
	var minX = -0.25 * screenDist;
	var minTheta = Math.PI * -0.25;
	var maxTheta = Math.PI * 0.25;

	graphStorage = [];

	var resultX;
	for (var d=maxTheta; d>minTheta; d-=unit) {
		//figure out x for this direction
		resultX = screenXForPhoton(d, screenDist);
		graphStorage.push([d, resultX]);

		//graph it
		ctx.beginPath();
		ctx.arc(linterp(-300, 300, getPercentage(minTheta, maxTheta, d)), (resultX / maxX) * -240, 2, 0, Math.PI * 2);
		ctx.fill();

		//as soon as there's an undefined result skip to the other side
	}
}

function drawStarsIntermediate() {
	//loop through all stars
	ctx.fillStyle = color_star;
	stars.forEach(s => {
		if (s[2] - cameraZPos < 0) {
			return;
		}

		//figure out xy angle
		var rot = Math.atan2(s[1], s[0]);
		var dist = Math.sqrt(s[1] ** 2 + s[0] ** 2);

		//figure out xz angle
		var theta = angleForScreenX(dist, s[2] - cameraZPos);

		if (theta == undefined) {
			return;
		}

		//transform to view coordinates
		var r = cameraScale * Math.tan(theta);
		var [sx, sy] = rotate(r, 0, rot);
		var sr = 1;//s[3] / (s[2] - cameraZPos);

		ctx.beginPath();
		ctx.arc(sx, sy, sr, 0, Math.PI * 2);
		ctx.fill();
	});
}

function drawStars() {
	ctx.beginPath();
	//loop through all stars
	ctx.strokeStyle = color_star;
	stars.forEach(s => {
		if (s[2] - cameraZPos < 0) {
			return;
		}

		//figure out xy angle
		var rot = Math.atan2(s[1], s[0]);
		var dist = Math.sqrt(s[1] ** 2 + s[0] ** 2);
		var angularRadius = 2 / (cameraScale * (dist / (s[2] - cameraZPos)))

		//figure out xz angle
		var theta = angleForScreenX(dist, s[2] - cameraZPos);

		if (theta == undefined) {
			return;
		}

		//transform to view coordinates
		var r = cameraScale * Math.tan(theta);
		var [sx, sy] = rotate(r, 0, rot);
		var sr = 2;//s[3] / (s[2] - cameraZPos);

		ctx.beginPath();
		// ctx.arc(sx, sy, sr, 0, Math.PI * 2);
		ctx.lineWidth = sr;
		ctx.arc(0, 0, r, rot - angularRadius, rot + angularRadius);
		ctx.stroke();
	});

	//draw shadow
	//figure out angular radius of the black hole
	var minR = 0;
	var maxR = Math.PI / 2;
	var buffer1;
	for (var f=0; f<12; f++) {
		buffer1 = (minR + maxR) / 2;

		if (screenXForPhoton(buffer1, 1000) == -1e1001) {
			//if that point falls into the black hole
			minR = buffer1;
		} else {
			maxR = buffer1;
		}
	}

	r = cameraScale * Math.tan((minR + maxR) / 2);

	ctx.fillStyle = "#000";
	ctx.beginPath();
	ctx.arc(0, 0, r, 0, Math.PI * 2);
	ctx.fill();
}