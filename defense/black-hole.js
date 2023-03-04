const lightSpeed = 299792458;
const gravStrength = 6.67E-11;

var dt = 0.1;

var stars = [];

var bhZpos;
var bhMass;

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
|-------s
|     /
|     /
|    /
|   /
bh  / 
|  /
| /
|/
c ------ +X

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

	4. MAKE SURE WHEN GENERATING THE PHOTONS the angle range is the same as atan2 - I don't want sine freaking out because -pi -> pi is different from 0 -> 2pi
*/


function bendPhoton(phoX, phoZ, phoTheta) {
	var dist = Math.sqrt(phoX * phoX, phoZ * phoZ);
	var angle = Math.atan2(phoZ, phoX);
	//weird relativity math
	var gTheta = gravStrength * bhMass / (dist * dist);
	gTheta = -gTheta * (dt / lightSpeed) * Math.sin(phoTheta - angle);
}