
/*
standard is using p0, c0, c1, p1 to represent a cubic bezier curve 

requires: 
	functions-math.js


lineBezierIntersect(linp1, linp2, bezp0, bezc0, bezc1, bezp1)
pointBezierIntersect(p1, bezp0, bezc0, bezc1, bezp1, halfTolerance)
inCurvedPoly(xyPoint, polyLines)
bezierBounds(p0, c0, c1, p1)
bezierPointFromT(p0, c0, c1, p1, t)
quadraticPointFromT(p0, c, p1, t)
bezierMinMax(p0, x1, y1, x2, y2, x3, y3)
bezierSplit(p0, c0, c1, p1, percentage)


*/
//Says whether a line segment and a bezier curve intersect
function lineBezierIntersect(linp1, linp2, bezp0, bezc0, bezc1, bezp1) {
	var tolerance = 0.04;
	//rotate the line and curve together so the line is always directly on the +x axis
	var lineAngle = Math.atan2(linp2[1] - linp1[1], linp2[0] - linp1[0]);
	bezp0 = rotate(bezp0[0] - linp1[0], bezp0[1] - linp1[1], -lineAngle);
	bezc0 = rotate(bezc0[0] - linp1[0], bezc0[1] - linp1[1], -lineAngle);
	bezc1 = rotate(bezc1[0] - linp1[0], bezc1[1] - linp1[1], -lineAngle);
	bezp1 = rotate(bezp1[0] - linp1[0], bezp1[1] - linp1[1], -lineAngle);
	linp2 = rotate(linp2[0] - linp1[0], linp2[1] - linp1[1], -lineAngle);
	linp2[0] += tolerance;

	console.log(bezp0, bezc0, bezc1, bezp1, linp2);

	//the bezier curve can only intersect the line if the rotated curve intersects the x-axis
	var polyCoefs = coefficientsForBezier(bezp0[1], bezc0[1], bezc1[1], bezp1[1]);
	var intercepts = rootsCubic(polyCoefs[0], polyCoefs[1], polyCoefs[2], polyCoefs[3], tolerance, 0, 1);
	console.log(intercepts);
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
//

function bezierBounds(p0, c0, c1, p1) {
	return bezierMinMax(p0, c0[0], c0[1], c1[0], c1[1], p1[0], p1[1]);
}

//given the 4 points and a t value, gives the point on the bezier curve that corresponds to that t-value
function bezierPointFromT(p0, c0, c1, p1, t) {
	//expanding the formulas for the repeated linear interpolation gives you these
	return [
		p0[0] * (-t*t*t + 3*t*t - 3*t + 1) + c0[0] * 3*(t*t*t - 2*t*t + t) + c1[0] * 3*(-t*t*t + t*t) + p1[0] * (t*t*t),
		p0[1] * (-t*t*t + 3*t*t - 3*t + 1) + c0[1] * 3*(t*t*t - 2*t*t + t) + c1[1] * 3*(-t*t*t + t*t) + p1[1] * (t*t*t),
	]
}

//given a set of cubic bezier numbers, returns the equation coefficients that make those points
function coefficientsForBezier(x0, c0, c1, x1) {
	return [x1 - x0 + 3*c0 - 3*c1, 3*c1 + 3*x0 - 6*c0, 3*c0 - 3*x0, x0];
}

function quadraticBounds(p0, c, p1) {

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
function bezierMinMax(p0, x1, y1, x2, y2, x3, y3) {
	var tvalues = [], xvalues = [], yvalues = [],
		a, b, c, t, t1, t2, b2ac, sqrtb2ac;
	for (var i=0; i<2; i++) {
		if (i == 0) {
			b = 6 * p0[0] - 12 * x1 + 6 * x2;
			a = -3 * p0[0] + 9 * x1 - 9 * x2 + 3 * x3;
			c = 3 * x1 - 3 * p0[0];
		} else {
			b = 6 * p0[1] - 12 * y1 + 6 * y2;
			a = -3 * p0[1] + 9 * y1 - 9 * y2 + 3 * y3;
			c = 3 * y1 - 3 * p0[1];
		}
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
		xvalues[j] = (mt * mt * mt * p0[0]) + (3 * mt * mt * t * x1) + (3 * mt * t * t * x2) + (t * t * t * x3);
		yvalues[j] = (mt * mt * mt * p0[1]) + (3 * mt * mt * t * y1) + (3 * mt * t * t * y2) + (t * t * t * y3);
	}

	xvalues.push(p0[0],x3);
	yvalues.push(p0[1],y3);

	return [
		[Math.min(...xvalues), Math.min(...yvalues)],
		[Math.max(...xvalues), Math.max(...yvalues)]
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