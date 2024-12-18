/*general math / void functions for utility

INDEX



*/

function getDistance(x1, y1, z1, x2, y2, z2) {
	return Math.sqrt(((x1 - x2) * (x1 - x2)) + ((y1 - y2) * (y1 - y2)) + ((z1 - z2) * (z1 - z2)));
}

//does square root, but faster
var sqrtTable = [];
for (var a=9999; a>-1; a--) {
	sqrtTable[a] = Math.sqrt(a);
}

//bit magic to get the bits out of a float
function doubleToIEEE(f) {
	var buf = new ArrayBuffer(8);
	(new Float64Array(buf))[0] = f;
	return [(new Uint32Array(buf))[0], (new Uint32Array(buf))[1]];
}

//warning - this function is slower somehow
function fastSqrt(x) {
	//if x is less than 10, just use the square root - the precision is important for small numbers
	if (x <= 10 || x > ray_maxDist) {
		return Math.sqrt(x);
	}

	//bitshifting is faster than Math.floor
	return sqrtTable[x << 1 >> 1];
}

function performanceTest() {
	var perf = [performance.now(), 0];
	var storage = 0;

	for (var x=0; x<100000000; x++) {
		storage += Math.sqrt(x % 10000) * (2 * (x % 1) - 1);
	}

	perf[1] = performance.now();
	console.log(storage, perf[1] - perf[0]);
	return;
}

function performanceTest2() {
	var perf = [performance.now(), 0];
	var storage = 0;

	for (var x=0; x<100000000; x++) {
		storage += fastSqrt(x % 10000) * (2 * (x % 1) - 1);
	}

	perf[1] = performance.now();
	console.log(storage, perf[1] - perf[0]);
	return;
}


//for quaternion functions, quaternions are expected to be an array of length 4, with the structure [w, x, y, z].
function quatNormalize(quat) {
	var magnitude = Math.sqrt(quat[0] * quat[0] + quat[1] * quat[1] + quat[2] * quat[2] + quat[3] * quat[3]);
	return [quat[0] / magnitude, quat[1] / magnitude, quat[2] / magnitude, quat[3] / magnitude];
}

//ack this is a mess
function quatMultiply(quat1, quat2) {
	return [
		quat1[0] * quat2[0] - quat1[1] * quat2[1] - quat1[2] * quat2[2] - quat1[3] * quat2[3],
		quat1[0] * quat2[1] + quat1[1] * quat2[0] + quat1[2] * quat2[3] - quat1[3] * quat2[2],
		quat1[0] * quat2[2] - quat1[1] * quat2[3] + quat1[2] * quat2[0] + quat1[3] * quat2[1],
		quat1[0] * quat2[3] + quat1[1] * quat2[2] - quat1[2] * quat2[1] + quat1[3] * quat2[0]
	]
}

//converts [w, x, y, z] to [x, y, z, theta]
function quatToAxisAngle(quat) {

}

function quatToCart(quat) {

}

//functions that apply to vectors
function vAdd(vec1, vec2) {
	var newVec = [];
	//go backwards so the array only needs to be lengthened once
	for (var n=vec1.length-1; n>-1; n--) {
		newVec[n] = vec1[n] + vec2[n];
	}
	return newVec;
}

//returns the dot product of two matching vectors
function vDot(vec1, vec2) {
	var sum = 0;
	for (var n=0; n<vec1.length; n++) {
		sum += vec1[n] * vec2[n];
	}
	return sum;
}

//returns the length of a vector
function vLen(vector) {
	var midPoint = 0;
	vector.forEach(v => {
		midPoint += v * v;
	});
	return Math.sqrt(midPoint);
}

function vSub(vec1, vec2) {
	var newVec = [];
	for (var n=vec1.length-1; n>-1; n--) {
		newVec[n] = vec1[n] - vec2[n];
	}
	return newVec;
}