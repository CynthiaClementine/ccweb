/*functions for determining 2d collision are stored here, such as if two line segments intersect, if a point is inside a polygon, and other helpful functions relating to 2d position.

INDEX
getOrientation(p1, p2, p3)
circleCircleIntersect(circleParams1, circleParams2)
lineIntersect(lin1p1, lin1p2, lin2p1, lin2p2)
lineLineIntersect(l1p1, l1p2, l2p1, l2p2)
lineLineClosestPoints(l1p1, l1p2, l2p1, l2p2)
inPoly(xyPoint, polyPoints)
pointLineIntersect(p, linp1, linp2, tolerance)
pointLineDistance(point, lineP1, lineP2)
lineT(lineP1, lineP2, point)
pointSegmentDistance(point, lineP1, lineP2)

*/

//will return 0 if points are colinear, -1 if points are counterclockwise, and 1 if points are clockwise.
function getOrientation(p1, p2, p3) {
	//use dot product of 90° from slope - it's like cosine but faster!
	var value = (p2[1] - p1[1]) * (p3[0] - p2[0]) - (p2[0] - p1[0]) * (p3[1] - p2[1]); 
	
	//If second slope is greater than 0, clockwise. If second slope is smaller, counterclockwise. If not, it must be colinear.
	return Math.sign(value);
}

//this code yoinked from the interwebs. I'm lazy. 
//https://stackoverflow.com/questions/12219802/a-javascript-function-that-returns-the-x-y-points-of-intersection-between-two-ci
//circleParams in [x, y, r] form
function circleCircleIntersect(circleParams1, circleParams2) {
	var [x0, y0, r0] = circleParams1;
	var [x1, y1, r1] = circleParams2;
	var h, rx, ry;

	//get distances between circle centers
	var dx = x1 - x0;
	var dy = y1 - y0;

	//distance
	var dist = Math.sqrt(dx * dx + dy * dy);

	//if circles do not intersect (are too far apart)
	if (dist > (r0 + r1)) {
		return undefined;
	}
	//if circles are contained within each other
	if (dist < Math.abs(r0 - r1)) {
		return undefined;
	}

	//'point 2' is the point where the line through the circle intersection points crosses the line between the circle centers.

	//Determine the distance from point 0 to point 2.
	var p02Dist = ((r0 * r0) - (r1 * r1) + (dist * dist)) / (dist * 2);

	//Determine the coordinates of point 2.
	var x2 = x0 + (dx * p02Dist / dist);
	var y2 = y0 + (dy * p02Dist / dist);

	/* Determine the distance from point 2 to either of the
	* intersection points.
	*/
	h = Math.sqrt((r0 * r0) - (p02Dist * p02Dist));

	/* Now determine the offsets of the intersection points from
	* point 2.
	*/
	rx = -dy * (h / dist);
	ry = dx * (h / dist);

	/* Determine the absolute intersection points. */
	var xi = x2 + rx;
	var xi_prime = x2 - rx;
	var yi = y2 + ry;
	var yi_prime = y2 - ry;

	return [[xi, yi], [xi_prime, yi_prime]];
}

/*lines intersect if the orientation between:
	a. the points in the first segment and the first point in the second segment
	b. the points in the first segment and the second point in the second segment

	are different, and vice versa, so

	c. the points in the second segment and the first point in the first segment
	d. the points in the second segment and the second point in the first segment

	are different. If a != b and c != d, they intersect.
*/
function lineIntersect(lin1p1, lin1p2, lin2p1, lin2p2) {
	return (getOrientation(lin1p1, lin1p2, lin2p1) != getOrientation(lin1p1, lin1p2, lin2p2) && getOrientation(lin2p1, lin2p2, lin1p1) != getOrientation(lin2p1, lin2p2, lin1p2))
}

//returns the t coordinate of the first line where it intersects with the second line.
function lineLineIntersect(l1p1, l1p2, l2p1, l2p2) {
	var det, t1, t2;
	det = (l1p2[0] - l1p1[0]) * (l2p2[1] - l2p1[1]) - (l2p2[0] - l2p1[0]) * (l1p2[1] - l1p1[1]);
	//if the determinant is 0, the lines must be parallel and therefore don't intersect at a single point
	if (det == 0) {
		return [];
	}

	t1 = ((l2p2[1] - l2p1[1]) * (l2p2[0] - l1p1[0]) + (l2p1[0] - l2p2[0]) * (l2p2[1] - l1p1[1])) / det;
	t2 = ((l1p1[1] - l1p2[1]) * (l2p2[0] - l1p1[0]) + (l1p2[0] - l1p1[0]) * (l2p2[1] - l1p1[1])) / det;
	if (t1 > 0 && t1 < 1 && t2 > 0 && t2 < 1) {
		return [t1, 1 - t2];
	}
	return [];
}

//returns the two closest points of two lines. If the two lines intersect, the points will be the same. 
//If the lines are parallel, returns one of the endpoints of the line. 
function lineLineClosestPoints(l1p1, l1p2, l2p1, l2p2) {
	var r = [l2p1[0] - l1p1[0], l2p1[1] - l1p1[1]];
	var u = [l1p2[0] - l1p1[0], l1p2[1] - l1p1[1]];
	var v = [l2p2[0] - l2p1[0], l2p2[1] - l2p1[1]];

	var ru = r[0] * u[0] + r[1] * u[1];
	var rv = r[0] * v[0] + r[1] * v[1];
	var uu = u[0] * u[0] + u[1] * u[1];
	var uv = u[0] * v[0] + u[1] * v[1];
	var vv = v[0] * v[0] + v[1] * v[1];

	var det = uu * vv - uv * uv;
	var s, t;

	if (det < 0.001 * uu * vv) {
		s = ru / uu;
		s = (s < 0) ? 0 : (s > 1) ? 1 : s;
		t = 0;
	} else {
		s = (ru * vv - rv * uv) / det;
		s = (s < 0) ? 0 : (s > 1) ? 1 : s;
		t = (ru * uv - rv * uu) / det;
		t = (t < 0) ? 0 : (t > 1) ? 1 : t;
	}

	var sp = (t * uv + ru) / uu;
	sp = (sp < 0) ? 0 : (sp > 1) ? 1 : sp;
	var tp = (s * uv - rv) / vv;
	tp = (tp < 0) ? 0 : (tp > 1) ? 1 : tp;

	return [[l1p1[0] + sp * u[0], l1p1[1] + sp * u[1]], [l2p1[0] + tp * v[0], l2p1[1] + tp * v[1]]];
}


function inPoly(xyPoint, polyPoints) {
	//to test if a point is in a polygon, a line is drawn out to infinity (or close enough)
	//and it's checked against all lines in the polygon. If it hits an odd number of lines, it is inside.

	//making collision line, known bug: will break if polygon is more than 1e7 units large
	var linP2 = [xyPoint[0] + 1e7, xyPoint[1]];
	var intersectNum = 0;
	//checking against all polygon lines
	for (var r=0; r<polyPoints.length; r++) {
		intersectNum += lineIntersect(polyPoints[r % polyPoints.length], polyPoints[(r+1) % polyPoints.length], xyPoint, linP2);
	}

	//return final value
	return (intersectNum % 2 == 1);
}

//says whether a point is on a line, with some tolerance
function pointLineIntersect(p, linp1, linp2, tolerance) {
	return pointSegmentDistance(p, linp1, linp2) < tolerance;
}

//gives the distance between a line, defined with two points, and a third point
function pointLineDistance(point, lineP1, lineP2) {
	var changeX = lineP2[0] - lineP1[0];
	var changeY = lineP2[1] - lineP1[1];

	//if the two points are the same it's impossible to calculate
	if (changeX == 0 && changeY == 0) {
		console.log(`cannot find distance of ${point} away from ${lineP1} -> ${lineP2}!!`);
		return 1e1001;
	}

	var t = ((point[0] - lineP1[0]) * changeX + (point[1] - lineP1[1]) * changeY) / (changeX * changeX + changeY * changeY);
	return Math.sqrt((point[0] - (lineP1[0] + t * changeX)) ** 2 + (point[1] - (lineP1[1] + t * changeY)) ** 2);
}

function lineT(lineP1, lineP2, point) {
	var changeX = lineP2[0] - lineP1[0];
	var changeY = lineP2[1] - lineP1[1];

	//if the two line points are the same just use distance
	if (changeX == 0 && changeY == 0) {
		return Math.sqrt((lineP1[0] - point[0]) ** 2 + (lineP1[1] - point[1]) ** 2);
	}

	//t calculation
	return ((point[0] - lineP1[0]) * changeX + (point[1] - lineP1[1]) * changeY) / (changeX * changeX + changeY * changeY);
}

//gives the distance between a line segment and a point
function pointSegmentDistance(point, lineP1, lineP2) {
	var changeX = lineP2[0] - lineP1[0];
	var changeY = lineP2[1] - lineP1[1];

	//segment is a point and distance is easy
	if (changeX == 0 && changeY == 0) {
		return Math.sqrt((point[0] - lineP1[0]) ** 2 + (point[1] - lineP1[1]) ** 2);
	}

	//T is progress along the line to get minimum distance
	var t = ((point[0] - lineP1[0]) * changeX + (point[1] - lineP1[1]) * changeY) / (changeX * changeX + changeY * changeY);

	//T is off of the line
	if (t <= 0) {
		return Math.sqrt((point[0] - lineP1[0]) ** 2 + (point[1] - lineP1[1]) ** 2);
	}

	if (t >= 1) {
		return Math.sqrt((point[0] - lineP2[0]) ** 2 + (point[1] - lineP2[1]) ** 2);
	}

	//t is between the points
	return Math.sqrt((point[0] - (lineP1[0] + t * changeX)) ** 2 + (point[1] - (lineP1[1] + t * changeY)) ** 2);
}

/**
 * Returns an array of percentages, representing how far along the path each point is.           
 * [[0, 0], [0, 1], [2, 1], [2, 0], [0, 0]] returns [0, 1/6, 3/6, 4/6, 1]
 * @param {Number[][]} points  
 */
function segmentTimings(points) {
	var u = [0];
	//loop through and say how far along the polyline each point is
	for (var i=1; i<points.length; i++)
		u[i] = u[i-1] + Math.sqrt((points[i][0] - points[i-1][0]) ** 2 + (points[i][1] - points[i-1][1]) ** 2)

	var factor = 1 / u[u.length-1];

	//turn those distances into percentages
	for (i=0; i<u.length; i++) {
		u[i] *= factor;
	}
	return u;
}