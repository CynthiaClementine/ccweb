
//these constants aren't accurate to real life, instead they're changed a bit to make floating point math easier
const lightSpeed = 300;
const gravStrength = 6;

var dt = 0.1;

var stars = [];
var starDists = [4000, 8000];
var starSizes = [1000, 4000];
var starNum = 600;

var cameraZPos = -1000;
var bhMass = 1E15;

//generate star sphere
var starCoords;
for (var s=0; s<starNum; s++) {
	var cosPhi = boolToSigned(Math.random() < 0.5) * Math.random() ** 2;
	starCoords = polToCart(randomBounded(0, Math.PI * 2), Math.acos(cosPhi) - (Math.PI / 2), randomBounded(starDists[0], starDists[1]));
	stars.push([starCoords[0], starCoords[1], starCoords[2], randomBounded(starSizes[0], starSizes[1])]);
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
*/


function bendPhoton(phoX, phoZ, phoTheta) {
	var dist = Math.sqrt(phoX * phoX, phoZ * phoZ);
	var angle = (Math.atan2(phoZ, phoX) + Math.PI * 2) % (Math.PI * 2);
	//weird relativity math
	var gTheta = gravStrength * bhMass / (dist * dist);
	gTheta = -gTheta * (dt / lightSpeed) * Math.sin(phoTheta - angle);
	gTheta /= Math.abs(1 - 2 * gravStrength * bhMass / (dist * lightSpeed * lightSpeed));

	return gTheta;
}

//simulates one photon's trajectory until it hits the screen
function screenXForPhoton(angle, screenZ) {
	//start the photon at the camera pos
	var phoX = 0;
	var phoZ = cameraZPos;

	//simulate the photon
	while (true) {
		

		angle += bendPhoton(phoX, phoZ, angle);

		//if the photon has passed the screen Z return its position
		if (phoZ > screenZ) {
			//first trace backwards to the screen, don't want to overestimate it
			// var xPerZ = 
		}
		//there are a few cases where the photon will never reach the screen - account for those

		//if the photon has passed the event horizon

		//if the photon has wrapped around and is too far backwards
		if (modularDifference(angle, b, Math.PI * 2) < Math.PI * 0.3) {
			return -1e1001;
		}
	}
}

//returns [x, y, z, angular radius] of a lensed star behind the black hole
function calculateApparentParameters(starX, starY, starZ, starRadius) {
	var angleTolerance = 0.01;
	//if the star is behind the camera don't attempt this method because it won't work
	if (starZ < 0) {
		return undefined;
	}

	var xyAngle = Math.atan2(starY, starX);
	
	//transform into triangle space (see the triangle drawing above)
	//make sure xPrime is at least 1 to avoid /0 errors
	var xPrime = Math.max(Math.sqrt(starX ** 2 + starY ** 2), 1);
	var zPrime = starZ;
	
	var unlensedAngle = Math.atan((zPrime - cameraZPos) / xPrime);

	//angular radius is the apparent radius (r / dist from camera) divided by the circumference of the circle at that anglular distance from the black hole.
	//I can just use the initial star, because angular radius doesn't change as the star is lensed
	//it would be 2*pi*apparentR / 2*pi*xPrime, but the 2pi cancels out so I don't bother putting it in
	var angularRadius = (starRadius / (starZ - cameraZPos)) / xPrime;

	//lensed angle will never be less than the unlensed angle, and I'm setting a hard limit of 95°
	var lightAMin = unlensedAngle;
	var lightAMax = 1.658;
}