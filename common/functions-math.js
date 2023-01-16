/* INDEX

arrsAreSame(arr1, arr2);
boolToSigned(boolValue);
clamp(num, min, max);
distSquared(x, y);
getPercentage(val1, val2, checkVal);
linterp(a, b, percentage);
linterpMulti(a, b, percentage);
modulate(n, modulus);
randomBounded(min, max);
rootsCubic(a, b, c, d);
rootsQuadratic(a, b, c);
sigmoid(input, outputLowerBound, outputUpperBound);
easerp(a, b, percentage);





A WARNING TO MY FUTURE SELF:
do not rename these functions. Just don't. It may seem like a good idea. It's not. 
There are projects that rely on these names that you have forgotten about. 
Save yourself the time!!
*/

//returns a boolean stating whether the two arrays have the same values
//does not work for 2d arrays
function arrsAreSame(arr1, arr2) {
	//make sure they have the same length
	if (arr1.length != arr2.length) {
		return false;
	}

	//make sure all elements are the same
	for (var b=arr1.length-1; b>=0; b--) {
		if (arr1[b] != arr2[b]) {
			return false;
		}
	}
	return true;
}

//converts true to 1, and false to -1
function boolToSigned(boolValue) {
	return boolValue * 2 - 1;
}

function clamp(num, min, max) {
	return num <= min ? min : num >= max ? max : num;
}

function distSquared(x, y) {
	return x * x + y * y;
}

//returns the percentage from val1 to val2 that the checkVal is in
//example: 0, 10, 5, returns 0.5)
function getPercentage(val1, val2, checkVal) {
	return (checkVal - val1) / (val2 - val1);
}

//performs a linear interpolation between 2 values
function linterp(a, b, percentage) {
	return a + (b - a) * percentage;
}

/**
 * Performs a linear interpolation between all elements of two arrays
 * @param {Number[]} a 
 * @param {Number[]} b 
 * @param {Number} percentage 
 */
function linterpMulti(a, b, percentage) {
	var returning = [];
	for (var q=a.length-1; q>=0; q--) {
		returning[q] = linterp(a[q], b[q], percentage);
	}
	return returning;
}

//like the modulo operator, but keeps the number in bounds both ways
function modulate(n, modulus) {
	return (n > 0) ? (n % modulus) : (modulus + (n % modulus)) % modulus;
}

function modularDifference(a, b, modulo) {
	//first make sure they're both positive
	a = modulate(a, modulo);
	b = modulate(b, modulo);

	//check both sides
	return Math.min(Math.abs(a - b), Math.abs((a + modulo) - b), Math.abs((a - modulo) - b));
}

//returns a vector with the same direction but magnitude 1
function normalize(vector) {
	var running = 0;
	for (var f=0; f<vector.length; f++) {
		running += vector[f] * vector[f];
	}
	var len = Math.sqrt(running);
	
	var newVec = [];
	for (f=vector.length-1; f>=0; f--) {
		newVec[f] = vector[f] / len;
	}
	return newVec;
}

//returns a random value between the min value and max values, using the default javascript randomizer
function randomBounded(min, max) {
	return (Math.random() * (max - min)) + min;
}

function isNormal(x) {
	return x >= 0 && x <= 1;
}

function rootsCubic(a, b, c, d, tolerance, rangeMin, rangeMax) {
	//if it's infinite range
	if ((rangeMin || rangeMax) == undefined) {
		//first find where the slopes are 0
		var oSlopes = rootsQuadratic(3*a, 2*b, c);

		//if y-offset is 0 of course it's at 0
		if (d == 0) {
			return [0];
		}

		//if there are no 0 slopes, there can only ever be one intersect
		var slopeDist = 4 * Math.abs(d / (0.5*c));
		if (oSlopes.length == 0) {
			console.log(slopeDist);
			return rootsCubic(a, b, c, d, tolerance, -slopeDist, slopeDist);
		}

		//split at all the oSlopes and get intersections from there
		var vals = [];
		oSlopes.splice(0, 0, -slopeDist);
		oSlopes.push(slopeDist);
		oSlopes.sort((a, b) => a - b);
		for (var j=0; j<oSlopes.length-1; j++) {
			console.log(oSlopes[j], oSlopes[j+1])
			vals.concat(rootsCubic(a, b, c, d, tolerance, oSlopes[j], oSlopes[j+1]));
		}
		return vals;
	}
	
	//compute the start and end points
	var start = a*rangeMin*rangeMin*rangeMin + b*rangeMin*rangeMin + c*rangeMin + d;
	var end = a*rangeMax*rangeMax*rangeMax + b*rangeMax*rangeMax + c*rangeMax + d;
	var middleX = rangeMin + (rangeMax - rangeMin) / 2;
	
	//if they're on the same side of the line, no zero.
	if (start * end > 0) {
		return [];
	}
	if (rangeMax - rangeMin < tolerance) {
		return [(rangeMax + rangeMin) / 2];
	}
	
	//if they're on opposite sides of the line, there's certainly a zero in between somewhere
	console.log(rangeMin, middleX, rangeMax);
	return [].concat(rootsCubic(a, b, c, d, tolerance, rangeMin, middleX), rootsCubic(a, b, c, d, tolerance, middleX, rangeMax));
}



//gives the roots of a quadratic equation. Will return either 0, 1, or 2 roots inside a list
function rootsQuadratic(a, b, c) {
	//the discriminant tells the number of roots
	var disc = b * b - 4 * a * c;
	if (disc < 0) {
		return [];
	}

	if (disc == 0) {
		return [-b / (2 * a)];
	}

	if (disc > 0) {
		return [
			(-b + Math.sqrt(disc)) / (2 * a),
			(-b - Math.sqrt(disc)) / (2 * a)
		];
	}


}

function sigmoid(input, outputLowerBound, outputUpperBound) {
	//haha good luck reading this ;)
	return (1 / (1 + (Math.E ** input))) * (outputLowerBound - outputUpperBound) + outputUpperBound;
}

//an interpolation, but with an ease in + out
function easerp(a, b, percentage) {
	if (percentage < 0.5) {
		return a + (b - a) * 2 * percentage * percentage;
	}
	return a + (b - a) * (1 - 2 * (percentage - 1) * (percentage - 1));
}