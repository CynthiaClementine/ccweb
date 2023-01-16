//functions for determining 2d collision are stored here, such as if two line segments intersect, if a point is inside a polygon, and other helpful functions relating to 2d position.

//will return 0 if points are colinear, -1 if points are counterclockwise, and 1 if points are clockwise.
function getOrientation(p1, p2, p3) {
	//use dot product of 90° from slope - it's like cosine but faster!
	var value = (p2[1] - p1[1]) * (p3[0] - p2[0]) - (p2[0] - p1[0]) * (p3[1] - p2[1]); 
	
	//If second slope is greater than 0, clockwise. If second slope is smaller, counterclockwise. If not, it must be colinear.
	return Math.sign(value);
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