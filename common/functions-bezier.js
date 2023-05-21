
/*
standard is using p0, c0, c1, p1 to represent a cubic bezier curve 

requires: 
	functions-math.js


bezierBezierIntersect(b1p0, b1c0, b1c1, b1p1, b2p0, b2c0, b2c1, b2p1, tolerance)
lineBezierIntersect(linp1, linp2, bezp0, bezc0, bezc1, bezp1)
pointBezierIntersect(p1, bezp0, bezc0, bezc1, bezp1, halfTolerance)
inCurvedPoly(xyPoint, polyLines)
bezierBounds(p0, c0, c1, p1)
bezierPointFromT(p0, c0, c1, p1, t)
quadraticPointFromT(p0, c, p1, t)
bezierSplit(p0, c0, c1, p1, percentage)


*/

function bezierBezierIntersect(b1p0, b1c0, b1c1, b1p1, b2p0, b2c0, b2c1, b2p1, tolerance) {
	var bounds1 = bezierBounds(b1p0, b1c0, b1c1, b1p1);
	var bounds2 = bezierBounds(b2p0, b2c0, b2c1, b2p1);

	//if the bounds don't intersect, the curves can't intersect
	if (bounds1[0] > bounds2[2] + tolerance || bounds1[1] > bounds2[3] + tolerance || bounds1[2] < bounds2[0] - tolerance || bounds1[3] < bounds2[1] - tolerance) {
		return [];
	}
	
	//if the boxes are too small, count the curves as intersecting
	var small1 = (bounds1[2] - bounds1[0] < tolerance && bounds1[3] - bounds1[1] < tolerance);
	var small2 = (bounds2[2] - bounds2[0] < tolerance && bounds2[3] - bounds2[1] < tolerance);
	
	//both of them are small enough to count as touching
	if (small1 && small2) {
		//get the overlapping area and take the midpoint
		bounds1 = [Math.max(bounds1[0], bounds2[0]), Math.max(bounds1[1], bounds2[1]), Math.min(bounds1[2], bounds2[2]), Math.min(bounds1[3], bounds2[3])];
		return [[(bounds1[0] + bounds1[2]) / 2, (bounds1[1] + bounds1[3]) / 2]];
	}
	

	//it's actually very difficult to tell if these curves intersect so we're gonna split at the center and try this again
	var children1;
	var children2;
	if (!small1 && !small2) {
		children1 = bezierSplit(b1p0, b1c0, b1c1, b1p1, 0.5);
		children2 = bezierSplit(b2p0, b2c0, b2c1, b2p1, 0.5);

		//check all combinations of intersecting children
		return (bezierBezierIntersect(...children1[0], ...children2[0], tolerance).concat(
			bezierBezierIntersect(...children1[0], ...children2[1], tolerance),
			bezierBezierIntersect(...children1[1], ...children2[0], tolerance),
			bezierBezierIntersect(...children1[1], ...children2[1], tolerance)
		));
	}

	//don't split a curve that's already small enough
	if (small1) {
		children2 = bezierSplit(b2p0, b2c0, b2c1, b2p1, 0.5);
		return (bezierBezierIntersect(b1p0, b1c0, b1c1, b1p1, ...children2[0], tolerance).concat(bezierBezierIntersect(b1p0, b1c0, b1c1, b1p1, ...children2[1], tolerance)));
	}

	//only 2 is small
	children1 = bezierSplit(b1p0, b1c0, b1c1, b1p1, 0.5);
	return (bezierBezierIntersect(...children1[0], b2p0, b2c0, b2c1, b2p1, tolerance).concat(bezierBezierIntersect(...children1[1], b2p0, b2c0, b2c1, b2p1, tolerance)));
}



//Says whether a line segment and a bezier curve intersect
function lineBezierIntersect(linp1, linp2, bezp0, bezc0, bezc1, bezp1, tolerance) {
	tolerance = tolerance ?? 0.04;
	//rotate the line and curve together so the line is always directly on the +x axis
	var lineAngle = Math.atan2(linp2[1] - linp1[1], linp2[0] - linp1[0]);
	bezp0 = rotate(bezp0[0] - linp1[0], bezp0[1] - linp1[1], -lineAngle);
	bezc0 = rotate(bezc0[0] - linp1[0], bezc0[1] - linp1[1], -lineAngle);
	bezc1 = rotate(bezc1[0] - linp1[0], bezc1[1] - linp1[1], -lineAngle);
	bezp1 = rotate(bezp1[0] - linp1[0], bezp1[1] - linp1[1], -lineAngle);
	linp2 = rotate(linp2[0] - linp1[0], linp2[1] - linp1[1], -lineAngle);
	linp2[0] += tolerance;

	//the bezier curve can only intersect the line if the rotated curve intersects the x-axis
	var polyCoefs = coefficientsForBezier(bezp0[1], bezc0[1], bezc1[1], bezp1[1]);
	var intercepts = rootsCubic(polyCoefs[0], polyCoefs[1], polyCoefs[2], polyCoefs[3], tolerance, 0, 1);
	if (intercepts.length == 0) {
		return false;
	}

	//check if the intersection(s) happen anywhere the line is
	var xList = intercepts.map(t => bezierPointFromT(bezp0, bezc0, bezc1, bezp1, t)[0]);
	for (var k=0; k<xList.length; k++) {
		if (xList[k] < linp2[0] && xList[k] > -tolerance) {
			return true;
		}
	}
	return false;
}

//t0 and t1 are only for the recursive parts
function lineBezierIntersect_coords(linp1, linp2, bezp0, bezc0, bezc1, bezp1, tolerance) {
	//if the gap is small enough, count it
	if (Math.max(Math.abs(linp1[0] - linp2[0]), Math.abs(linp1[1] - linp2[1])) < tolerance) {
		return [[(linp1[0] + linp2[0]) / 2, (linp1[1] + linp2[1]) / 2]];
	}

	//no intersection? no return 
	if (!lineBezierIntersect(linp1, linp2, bezp0, bezc0, bezc1, bezp1, tolerance)) {
		return [];
	}

	//there is a connection! Use the line, because it's simpler to cut
	var half = linterpMulti(linp1, linp2, 0.5);
	return lineBezierIntersect_coords(linp1, half, bezp0, bezc0, bezc1, bezp1, tolerance).concat(lineBezierIntersect_coords(half, linp2, bezp0, bezc0, bezc1, bezp1, tolerance));
}

//says whether a point intersects the bezier, with some tolerance
//it's called half tolerance because it's going to be the distance inside the bounding box + the distance outside the bounding box that the point counts
function pointBezierIntersect(p1, bezp0, bezc0, bezc1, bezp1, halfTolerance) {
	var bounds = bezierBounds(bezp0, bezc0, bezc1, bezp1);
	ctx.rect(...bounds[0], bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]);
	ctx.stroke();

	//if the point isn't in the bounds it can't intersect the curve
	if (p1[0] < bounds[0][0] - halfTolerance || p1[0] > bounds[1][0] + halfTolerance || p1[1] < bounds[0][1] - halfTolerance || p1[1] > bounds[1][1] + halfTolerance) {
		return false;
	}

	//if the bounds is too small, say it's good enough
	if (bounds[1][0] - bounds[0][0] < halfTolerance && bounds[1][1] - bounds[0][1] < halfTolerance) {
		return true;
	}

	//if it is in the bounds, but the bounds is too large, contract it
	var slices = bezierSplit(bezp0, bezc0, bezc1, bezp1, 0.5);
	return pointBezierIntersect(p1, slices[0][0], slices[0][1], slices[0][2], slices[0][3], halfTolerance) || 
			pointBezierIntersect(p1, slices[1][0], slices[1][1], slices[1][2], slices[1][3], halfTolerance);
}

function inCurvedPoly(xyPoint, polyLines) {
	ctx.beginPath();
	//add to the path
	ctx.moveTo(polyLines[0][0][0], polyLines[0][0][1]);
	for (var p=0; p<polyLines.length; p++) {
		if (polyLines[p].length == 4) {
			ctx.bezierCurveTo(polyLines[p][1][0], polyLines[p][1][1], polyLines[p][2][0], polyLines[p][2][1], polyLines[p][3][0], polyLines[p][3][1]);
		} else if (polyLines[p].length == 2) {
			ctx.lineTo(polyLines[p][1][0], polyLines[p][1][1]);
		} else {
			console.log(`help! ${polyLines[p].length} controls!`);
		}
	}
	return ctx.isPointInPath(xyPoint[0], xyPoint[1]);
}


//the bounds of a bezier curve can be found either at the start / end, or where the derivative of x/y is 0 (because that's where turns happen)
//returns [min x, min y, max x, max y]
function bezierBounds(p0, c0, c1, p1) {
	return bezierMinMax(p0, c0, c1, p1);
}

//given the 4 points and a t value, gives the point on the bezier curve that corresponds to that t-value
function bezierPointFromT(p0, c0, c1, p1, t) {
	//expanding the formulas for the repeated linear interpolation gives you these
	return [
		p0[0] * (-t*t*t + 3*t*t - 3*t + 1) + c0[0] * 3*(t*t*t - 2*t*t + t) + c1[0] * 3*(-t*t*t + t*t) + p1[0] * (t*t*t),
		p0[1] * (-t*t*t + 3*t*t - 3*t + 1) + c0[1] * 3*(t*t*t - 2*t*t + t) + c1[1] * 3*(-t*t*t + t*t) + p1[1] * (t*t*t),
	]
}


function bezierTFromPoint(p0, c0, c1, p1, p, tMin, tMax, tError, n) {
	console.error(`this function is not finished!`);
	if (n == undefined) {
		//figure out the extra parameters if they're not specified
		n = 10;
		tMin = 0;
		tMax = 1;
		//figure out roughly the square area (squarea?) of the bezier curve
		var bounds = [
			Math.min(p0[0], c0[0], c1[0], p1[0]),
			Math.min(p0[1], c0[1], c1[1], p1[1]),
			Math.max(p0[0], c0[0], c1[0], p1[0]),
			Math.max(p0[1], c0[1], c1[1], p1[1]),
		];
		var squarea = (bounds[2] = bounds[0]) * (bounds[3] - bounds[1]);
		tError = Math.min(0.1 / squarea, 0.01);
	}

	//split the curve into n bits

	//whichever bit the point is closest to becomes the new segment to test

	for (var k=0; k<n; k++) {
	}

	//if the bounds are close enough, escape
	if (tMax - tMin < tError) {
		return (tMax + tMin) / 2;
	}
}

//given a set of cubic bezier numbers, returns the equation coefficients that make those points
function coefficientsForBezier(x0, c0, c1, x1) {
	return [x1 - x0 + 3*c0 - 3*c1, 3*c1 + 3*x0 - 6*c0, 3*c0 - 3*x0, x0];
}

//similar algorithm to bezierBounds - test endpoints and spots where the derivative is 0
function quadraticBounds(p0, c, p1) {
	var xValues = [];
	var yValues = [];
	var a, b, t;

	//start and end points
	xValues.push(p0[0], p1[0]);
	yValues.push(p0[1], p1[1]);

	//check x and then y slope
	for (var i=0; i<2; i++) {
		a = p0[i] - 2 * c[i] + p1[i];
		b = -2 * p0[i] + 2 * c[i];
		t = -b / (2 * a);
		//make sure t is actually part of the curve
		if (t > 0 && t < 1) {
			((i == 0) ? xValues : yValues).push(quadraticPointFromT(p0, c, p1, t)[i]);
		}
	}


	return [
		Math.min(...xValues), Math.min(...yValues),
		Math.max(...xValues), Math.max(...yValues)
	];
}

//given 3 points of a quadratic curve / t value, gives the point on the curve corresponding to the t valuez
function quadraticPointFromT(p0, c, p1, t) {
	return [
		p0[0] * (t*t - 2*t + 1) + c[0] * 2*(-t*t + t) + p1[0] * (t*t),
		p0[1] * (t*t - 2*t + 1) + c[1] * 2*(-t*t + t) + p1[1] * (t*t),
	]
}

/*the minimum and maximum values can be found, either at the start/end points, or where the curve changes direction.
The curve changes direction when the derivative of the x or y components hit zero, so this runs the quadratic formula twice
(once for x and once for y)
*/
//TODO: could this be optimized? It seems to check both the x and y of a 0-slope point, when only one dimension should be necessary
function bezierMinMax(p0, c0, c1, p1) {
	var tvalues = [], xvalues = [], yvalues = [],
		a, b, c, t, t1, t2, b2ac, sqrtb2ac;
	for (var i=0; i<2; i++) {
		b = 6 * p0[i] - 12 * c0[i] + 6 * c1[i];
		a = -3 * p0[i] + 9 * c0[i] - 9 * c1[i] + 3 * p1[i];
		c = 3 * c0[i] - 3 * p0[i];

		if (Math.abs(a) < 1e-12) {
			if (Math.abs(b) < 1e-12) {
				continue;
			}
			t = -c / b;
			if (0 < t && t < 1) {
				tvalues.push(t);
			}
			continue;
		}
		b2ac = b * b - 4 * c * a;
		if (b2ac < 0) {
			if (Math.abs(b2ac) < 1e-12) {
				t = -b / (2 * a);
				if (0 < t && t < 1) {
					tvalues.push(t);
				}
			}
			continue;
		}
		sqrtb2ac = Math.sqrt(b2ac);
		t1 = (-b + sqrtb2ac) / (2 * a);
		if (0 < t1 && t1 < 1) {
			tvalues.push(t1);
		}
		t2 = (-b - sqrtb2ac) / (2 * a);
		if (0 < t2 && t2 < 1) {
			tvalues.push(t2);
		}
	}

	var j = tvalues.length, mt;
	while (j--) {
		t = tvalues[j];
		mt = 1 - t;
		xvalues[j] = (mt * mt * mt * p0[0]) + (3 * mt * mt * t * c0[0]) + (3 * mt * t * t * c1[0]) + (t * t * t * p1[0]);
		yvalues[j] = (mt * mt * mt * p0[1]) + (3 * mt * mt * t * c0[1]) + (3 * mt * t * t * c1[1]) + (t * t * t * p1[1]);
	}

	xvalues.push(p0[0],p1[0]);
	yvalues.push(p0[1],p1[1]);

	return [
		Math.min(...xvalues), Math.min(...yvalues),
		Math.max(...xvalues), Math.max(...yvalues)
	];
}

//takes in a quadratic bezier curve, and outputs two curves split at a percentage that, when put together, are identical to the original 
/*
Here's the dealio
a bezier curve can be produced by tracing along sets of lines. (De casteljau's algorithm)
when we split a bezier curve, the tricky part is getting the two in-between control points.
Those in-between control points are in those lines we trace out, so to split the bezier curve, we run the algorithm 
and then output the results halfway through basically
	*/
function bezierSplit(p0, c0, c1, p1, percentage) {
	
	var pE = [linterp(p0[0], c0[0], percentage), linterp(p0[1], c0[1], percentage)];
	var pF = [linterp(c0[0], c1[0], percentage), linterp(c0[1], c1[1], percentage)];
	var pG = [linterp(c1[0], p1[0], percentage), linterp(c1[1], p1[1], percentage)];

	var pH = [linterp(pE[0], pF[0], percentage), linterp(pE[1], pF[1], percentage)];
	var pI = [linterp(pF[0], pG[0], percentage), linterp(pF[1], pG[1], percentage)];
	var point = [linterp(pH[0], pI[0], percentage), linterp(pH[1], pI[1], percentage)];

	//return the two curves
	return [[p0, pE, pH, point], [point, pI, pG, p1]];
}