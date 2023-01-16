
function d2_add(v1, v2) {
	return [v1[0] + v2[0], v1[1] + v2[1]];
}

function d2_subtract(v1, v2) {
	return  [v1[0] - v2[0], v1[1] - v2[1]];
}

function d2_dot(v1, v2) {
	return v1[0] * v2[0] + v1[1] * v2[1];
}

function d2_scaleBy(v1, scale) {
	return [v1[0] * scale, v1[1] * scale];
}

function d2_normalize(v) {
	var len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
	return [v[0] / len, v[1] / len];
}