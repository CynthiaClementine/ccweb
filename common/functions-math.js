/* INDEX

arrsAreSame(arr1, arr2);
boolToSigned(boolValue);
clamp(num, min, max);
distSquared(x, y);
floor(x);
getPercentage(val1, val2, checkVal);
linterp(a, b, percentage);
linterpMulti(a, b, percentage);
modulate(n, modulus);
modularDifference(a, b, modulo)
normalize(vector)
normal(x);
polyArea(polyPoints);
randomBounded(min, max);
rootsCubic(a, b, c, d);
rootsQuadratic(a, b, c);
rotate(x, z, radians);
sigmoid(input, outputLowerBound, outputUpperBound);
easerp(a, b, percentage);
Ξ(x); -takes the factorial of a number





A WARNING TO MY FUTURE SELF:
do not rename these functions. Just don't. It may seem like a good idea. It's not. 
There are projects that rely on these names that you have forgotten about. 
Save yourself the time!!

OTHER NOTES:
after years of importing this file and then copy/pasting the rotate code separately, I've finally bundled it here. 
It's technically a multi-dimensional math thing but it's useful enough in so many applications that I'm just going to have it here.
*/

//returns the value of a normal distribution at some distance from mean=0
function normal(x) {
	return (1 / Math.sqrt(2 * Math.PI)) * Math.E ** (-0.5 * x * x);
}

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

//floors a number by converting it to an integer. Will break if the number is beyond the 32-bit integer limit
function floor(x) {
	return x << 1 >> 1;
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

//warning: this area relies on a constant angular direction. If the polygon is self-intersecting, part of the polygon will count as negative area.
function polyArea(polyPoints) {
	var area = 0;
	var nextP;

	for(var i=0; i<polyPoints.length; i++) {
		nextP = polyPoints[(i + 1) % polyPoints.length];
		area += (polyPoints[i][0] + nextP[0]) * (polyPoints[i][1] - nextP[1]);
	}
	return Math.abs(area/2);
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
		var sqrtDisc = Math.sqrt(disc);
		return [
			(-b + sqrtDisc) / (2 * a),
			(-b - sqrtDisc) / (2 * a)
		];
	}
}

function rotate(x, z, radians) {
	var sin = Math.sin(radians);
	var cos = Math.cos(radians);
	return [x * cos - z * sin, z * cos + x * sin];
}

//approximate integral of sin(k)/k from 0 -> x
function si(x) {
	var sum = x;

	//if x is too great just default to the end values to avoid computation
	if (Math.abs(x) > 19.978) {
		return Math.sign(x) * Math.PI / 2;
	}
	//do taylor sum
	for (var n=5; n<50; n+=4) {
		sum += (x ** n) / (n * Ξ(n));
	}
	for (n=3; n<50; n+=4) {
		sum -= (x ** n) / (n * Ξ(n));
	}
	
	return sum;
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

//the opposite of easerp - starts and ends fast, but is slow in the middle
function waverp(a, b, percentage) {
	return linterp(a, b, 2 * percentage ** 3 - 3 * percentage ** 2 + 2 * percentage);
}

//factorial, named a greek letter so it's compact without taking up one of the english letters
function Ξ(x) {
	var max = 1;
	while (x > 1) {
		max *= x;
		x -= 1;
	}
	return max;
}