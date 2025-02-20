
//a series of bullet creation functions. They all start with cb (for Create Bullet)


/**
 * Creates a set of equally-spaced bullets in a circular pattern.
 * @param {Number} x center X pos of the flower
 * @param {Number} y center Y pos of the flower
 * @param {Number} r radius of each bullet
 * @param {Number} num the number of bullets per flower
 * @param {Number} radialOff how far from the center the bullets should start
 * @param {Number} angularOff amount of rotation to apply to the flower, in radians
 * @param {Number} speed the speed in units / second for each bullet
 * @param {String} bulletType the sprite ID for each bullet
 */
function cbFlower(x, y, r, num, radialOff, angularOff, speed, bulletType) {
	var angle;
	var aSlice = Math.PI * 2 / num;
	for (var a=0; a<num; a++) {
		angle = a * aSlice + aSlice * angularOff;
		cbSingle(...polToXY(x, y, angle, radialOff), r, angle, speed, bulletType);
	}
}

/**
 * Creates a single bullet that travels at a certain angle
 * @param {Number} x X pos of the bullet
 * @param {Number} y Y post of the bullet
 * @param {Number} r radius of the bullet
 * @param {Number} a travel angle of the bullet, in radians
 * @param {Number} speed 
 * @param {String} bulletType the sprite ID for the bullet
 */
function cbSingle(x, y, r, a, speed, bulletType) {
	//all bullets will start at high priority
	bullets_high.push(new Bullet(x, y, r, bulletType, ...polToXY(0, 0, a, speed)));
}

/**
 * Creates a cluster of bullets spread spread around a specific angle
 * @param {Number} x center X position of the cluster
 * @param {Number} y center Y position of the cluster
 * @param {Number} r the radius of each bullet
 * @param {Number} num the number of bullets to create
 * @param {Number} a the angle of the cluster's center
 * @param {Number} aSpread how far angularly in either direction to spread the cluster, in radians
 * @param {Number} speed how fast each bullet should move
 * @param {String} bulletType the sprite ID for each bullet
 */
function cbSpread(x, y, r, num, a, aSpread, speed, bulletType) {
	var angle;
	var aSlice = aSpread / num;
	for (var b=0; b<num; b++) {
		angle = a + (b - (num - 1) * 0.5) * aSlice;
		cbSingle(...polToXY(x, y, angle, radialOff), r, angle, speed, bulletType);
	}
}

/**
* Given a time t, and a delta dt, determines whether the target time has ocurred within that time period
* @param {Number} t the current time
* @param {Number} dt the delta elapsed from the past time
* @param {Number} target the target time
*/
function hasTime(t, dt, target) {
	return (t - dt <= target && t >= target);
}

/**
* Like hasTime, but operates on modular time. 
* @param {Number} t the current time
* @param {Number} dt the delta elapsed from the past time
* @param {Number} cycleLength how long the cycle should be
* @param {Number} targetTime the target time in every cycle. Should be between [0, cycleLength)
*/
function hasTimeCycle(t, dt, cycleLength, targetTime) {
	return ((t % cycleLength) - dt <= targetTime && (t % cycleLength) >= targetTime)
			|| ((t % cycleLength) - dt <= targetTime - cycleLength && (t % cycleLength) >= targetTime - cycleLength);
}

function start() {
	pram_mode = "stage";
	stage_current = stages["test"];
	time_offset = time_last;

	φSet(menu_main, {"display": "none"});
}
