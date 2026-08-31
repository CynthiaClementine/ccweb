
/**
https://danceswithcode.net/engineeringnotes/quaternions/quaternions.html

A quaternion is a set of 4 numbers that represents rotations as an axis + angle.

x = RotationAxis.x * sin(RotationAngle / 2)

y = RotationAxis.y * sin(RotationAngle / 2)

z = RotationAxis.z * sin(RotationAngle / 2)

w = cos(RotationAngle / 2)


to rotate a point:
p' = quatRotate(p, q). This is the equivalent of 
p' = transform(p, offset, theta, phi, rot)

to rotate a quaternion:
q' = quatMultiply(q_2, q) ?
 */

function quatToMatrix(q) {
	const xx = q[0]*q[0];
	const yy = q[1]*q[1];
	const zz = q[2]*q[2];
	const ww = q[3]*q[3];

	const wx = q[3]*q[0];
	const wy = q[3]*q[1];
	const wz = q[3]*q[2];
	const xy = q[0]*q[1];
	const xz = q[0]*q[2];
	const yz = q[1]*q[2];

	return [
		[xx+yy-zz-ww, 2*(yz - wx), 2*(wy + xz), 0],
		[2*(yz + wx), xx-yy+zz-ww, 2*(wz - xy), 0],
		[2*(yw - xz), 2*(yz + xy), xx-yy-zz+ww, 0],
		[0,           0,           0,           1]
	];
}

/**
 * normalized linear interpolation between two quaternions. 
 */
function nlerp(q1, q2, t) {
	return normalize(linterpMulti(q1, q2, t));
}

//TODO: not sure if this actually works
function slerp(q1, q2, t) {
	var qDelta = quatMultiply(q2, quatInv(q1))
}

//from wikipedia, I might be wrong
function aaFromQuat(q) {
	const len = Math.sqrt(q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
	const axis = [q[1] / len, q[2] / len, q[3] / len];
	const theta = 2 * Math.atan2(len, q[0]);

	return [theta, axis];
}

function quatFromAA(angle, axis) {
	angle /= 2;
	const sinA = Math.sin(angle);
	return [
		Math.cos(angle),
		axis[0] * sinA,
		axis[1] * sinA,
		axis[2] * sinA,
	];
}


// https://github.com/jpreiss/quatcompress/blob/master/quatcompress.h
/**
 * encodes a quaternion into a single 32-bit integer
 */
function packageQrot(quat) {
	const abs = Math.abs;
	const invSqrt2 = 1 / Math.sqrt(2);
	const range = ((1 << 9) - 1);
	var iLarg = 0;
	for (var i=1; i<4; i++) {
		if (abs(quat[i]) > abs(quat[iLarg])) {
			iLarg = i;
		}
	}

	//make sure largest element is positive
	var negate = (quat[iLarg] < 0);

	//first two bits take up iLarg (0-3)
	var final = iLarg;
	
	for (var i=0; i<4; i++) {
		if (i == iLarg) {
			continue;
		}
		var sign = (quat[i] < 0) ^ negate;
		var intPart = range * (abs(quat[i]) / invSqrt2);
		final = (final << 10) | (sign << 9) | intPart;
	}
	return final;
}

function unpackageQrot(inter) {
	const range = 0x1FF;
	const invSqrt2 = 1 / Math.sqrt(2);
	var q = [0,0,0,0];
	var iLarg = inter >> 30;
	var sum = 0;
	for (var i=3; i>=0; i--) {
		if (i == iLarg) {
			continue;
		}
		var val = inter & range;
		var negate = (inter >> 9) & 1;
		q[i] = ((negate == 1) ? -invSqrt2 : invSqrt2) * val / range;
		sum += q[i] * q[i];
		inter = inter >> 10;
	}
	q[iLarg] = Math.sqrt(1 - sum);
	return q;
}

function quatFromEuler(theta, phi, rot) {
	var q = quatIdentity();
	q = quatMultiply(quatFromAA(theta, [0,1,0]), q);
	q = quatMultiply(quatFromAA(phi, [1,0,0]), q);
	q = quatMultiply(quatFromAA(rot, [0,0,1]), q);
	return normalize(q);
}

/**
 * left-multiplies q1 and q2.
 * @param {Number[]} q1 quaternion to apply
 * @param {Number[]} q2 quaternion to apply to
 */
function quatMultiply(q1, q2) {
	return [
		q1[0]*q2[0] - q1[1]*q2[1] - q1[2]*q2[2] - q1[3]*q2[3],
		q1[0]*q2[1] + q1[1]*q2[0] + q1[2]*q2[3] - q1[3]*q2[2],
		q1[0]*q2[2] - q1[1]*q2[3] + q1[2]*q2[0] + q1[3]*q2[1],
		q1[0]*q2[3] + q1[1]*q2[2] - q1[2]*q2[1] + q1[3]*q2[0]
	];
}

//also called the conjugation of q
function quatInv(q) {
	return [q[0], -q[1], -q[2], -q[3]]
}

//DON'T USE THIS, THIS CHANGES THE LENGTH OF THE QUATS
function quatAdd(q1, q2) {
	return [
		q1[0] + q2[0],
		q1[1] + q2[1],
		q1[2] + q2[2],
		q1[3] + q2[3],
	];
}

function quatIdentity() {
	return [1, 0, 0, 0];
}

function quatRotate(p, q) {
	const qInv = quatInv(q);
	//rotation is associative. Yay!
	//do p' = qInv * p * q
	p = quatMultiply([0, p[0], p[1], p[2]], q);
	p = quatMultiply(qInv, p);
	return [p[1], p[2], p[3]];
}

/**
 * Takes in a 3d point p and a quaternion q and does the inverse transform of q on p. (qpq^-1)
 * @param {Number[]} p the 3d point to transform
 * @param {Number[]} q the 4d quaternion Q to apply 
 * @returns {Number[]} a 3d point representing the transformed location of p
 */
function quatUnrotate(p, q) {
	const qInv = quatInv(q);
	p = quatMultiply([0, p[0], p[1], p[2]], qInv);
	p = quatMultiply(q, p);
	return [p[1], p[2], p[3]];
}

const Quat = {
	xRr: quatFromAA(1, [1, 0, 0]),
	yRr: quatFromAA(1, [0, 1, 0]),
	zRr: quatFromAA(1, [0, 0, 1]),
	xrr: quatFromAA(-1, [1, 0, 0]),
	yrr: quatFromAA(-1, [0, 1, 0]),
	zrr: quatFromAA(-1, [0, 0, 1]),
	xRd: quatFromAA((Math.PI / 180), [1, 0, 0]),
	yRd: quatFromAA((Math.PI / 180), [0, 1, 0]),
	zRd: quatFromAA((Math.PI / 180), [0, 0, 1]),
	xrd: quatFromAA(-(Math.PI / 180), [1, 0, 0]),
	yrd: quatFromAA(-(Math.PI / 180), [0, 1, 0]),
	zrd: quatFromAA(-(Math.PI / 180), [0, 0, 1]),
};