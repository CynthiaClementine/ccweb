#version 300 es

#define ray_maxIters 500
#define ray_maxDist 3000.0
#define ray_nearDist 3.0
#define ray_minDist 0.1
#define render_shadowSteps 2.
#define obj_maxNum 512

precision highp float;

in vec2 vUV;
out vec4 outColor;

struct Raydata {
	int hitMode;
	
	int closestInd;
	float totalDist;
	float localDist;
	
	int world;
	vec3 pos;
	vec3 dPos;
	
	vec4 color;
};

uniform vec2 uResolution;
uniform float uTime;
uniform int uObjectCount;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform int  uCamWorld;

uniform sampler2D uUniverseTex;

vec4 color = vec4(0, 0, 0, 0);

Raydata stage[2] = Raydata[2](
	Raydata(0, 0, 0.0, 0.0, 0, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec4(0., 0., 0., 0.)),
	Raydata(0, 0, 0.0, 0.0, 0, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec4(0.1, 0.1, 0.1, 0.1))
);


//SDFs

float boxSDF(vec3 point, vec4 data1, vec4 data2) {
	vec3 q = abs(point - data1.xyz) - data2.xyz;
	return length(max(q, vec3(0.))) + min(max(q.x, max(q.y, q.z)), 0.);
}

float capsuleSDF(vec3 point, vec4 data1, vec4 data2) {
	point -= data1.xyz;
	vec3 q = vec3(point.x, point.y - clamp(point.y, -data2[0], data2[0]), point.z);
	return length(q) - data1[3];
}

float cylinderSDF(vec3 point, vec4 data1, vec4 data2) {
	point -= data1.xyz;
	float r = data1[3];
	float h = data2[0];
	vec2 d = abs(vec2(length(point.xz), point.y)) - vec2(r, h);
	return min(max(d.x, d.y), 0.) + length(max(d, vec2(0.)));
}

float gyroidSDF(vec3 point, vec4 data1, vec4 data2, vec4 data3) {
	point -= data1.xyz;
	float dot = dot(sin(data1[3] * point.xyz), cos(data1[3] * point.zxy));
	vec3 relBoxPos = max(vec3(0.), abs(point) - data2.xyz);
	
	float gyrsdf = abs(data2[3] * dot) - data3[0];
	float boxsdf = length(relBoxPos);
	
	return max(boxsdf, gyrsdf);
	
	// distanceToPos(pos) {
	// 	const relX = pos[0] - this.pos[0];
	// 	const relY = pos[1] - this.pos[1];
	// 	const relZ = pos[2] - this.pos[2];
	// 	const a = this.a;
	// 	const dot = 
	// 		(Math.sin(a * relX) * Math.cos(a * relZ)) + 
	// 		(Math.sin(a * relY) * Math.cos(a * relX)) + 
	// 		(Math.sin(a * relZ) * Math.cos(a * relY));
		
	// 	const x = Math.max(0, Math.abs(relX) - this.rx);
	// 	const y = Math.max(0, Math.abs(relY) - this.ry);
	// 	const z = Math.max(0, Math.abs(relZ) - this.rz);
		
	// 	const gyroidSDF = Math.abs(this.b * dot) - this.h;
	// 	const boxSDF = Math.sqrt(x * x + y * y + z * z);
		
		
	// 	return Math.max(boxSDF, gyroidSDF);
	// }
	
}


// const relX = Math.abs(pos[0] - this.pos[0]) / this.rx;
// const relY = Math.abs(pos[1] - this.pos[1]) / this.ry;
// const relZ = Math.abs(pos[2] - this.pos[2]) / this.rz;
// const rrx = relX / this.rx;
// const rry = relY / this.ry;
// const rrz = relZ / this.rz;

// var d = Math.sqrt((relX * relX) + (relY * relY) + (relZ * relZ));
// var d2 = Math.sqrt((rrx * rrx) + (rry * rry) + (rrz * rrz));

// // return d - 1;
// return d * (d - 1) / d2;
		
float ellipsoidSDF(vec3 point, vec4 data1, vec4 data2) {
	vec3 relPos = abs(point - data1.xyz) / data2.xyz;
	vec3 rrPos = relPos / data2.xyz;
	
	float d = length(relPos);
	float d2 = length(rrPos);
	return d * (d - 1.) / d2;
}

float planeSDF(vec3 point, vec4 data1) {
	return point[1] - data1[2];
}

float ringSDF(vec3 point, vec4 data1, vec4 data2) {
	vec3 dist = abs(point - data1.xyz);
	float q = length(dist.xz) - data2[0];
	return sqrt(q * q + dist.y * dist.y) - data2[1];
	
	// const distX = Math.abs(pos[0] - this.pos[0]);
	// const distY = Math.abs(pos[1] - this.pos[1]);
	// const distZ = Math.abs(pos[2] - this.pos[2]);
	// const q = Math.sqrt(distX * distX + distZ * distZ) - this.r;
	// return Math.sqrt(q * q + distY * distY) - this.ringR;
}

float sphereSDF(vec3 point, vec4 data1) {
	return length(point - data1.xyz) - data1[3];
}



float boxFrameSDF(vec3 point, vec4 data1, vec4 data2) {
	vec3 q = abs(point - data1.xyz) - data2.xyz;
	vec3 w = abs(q + data2[3]) - data2[3];
	return min(min(
		length(max(vec3(q.x, w.y, w.z), vec3(0.))) + min(max(q.x, max(w.y, w.z)), 0.),
		length(max(vec3(w.x, q.y, w.z), vec3(0.))) + min(max(w.x, max(q.y, w.z)), 0.)),
		length(max(vec3(w.x, w.y, q.z), vec3(0.))) + min(max(w.x, max(w.y, q.z)), 0.));
}

mat4 objData(int index) {
	//data0 will be: ID, materialID, x, x
	//data0 is now:  ID, r, g, b
	//data1 is x, y, z, r
	//data2 is //rx, ry, rz, ?
	//data3 and data4 are more misc. 
	vec4 data0 = texelFetch(uUniverseTex, ivec2(index,0), 0);
	vec4 data1 = texelFetch(uUniverseTex, ivec2(index,1), 0);
	vec4 data2 = texelFetch(uUniverseTex, ivec2(index,2), 0);
	vec4 data3 = texelFetch(uUniverseTex, ivec2(index,3), 0);
	return mat4(data0, data1, data2, data3);
}

mat4 matData(int index) {
	vec4 data0 = texelFetch(uUniverseTex, ivec2(index, 4), 0);
	vec4 data1 = texelFetch(uUniverseTex, ivec2(index, 5), 0);
	vec4 data2 = texelFetch(uUniverseTex, ivec2(index, 6), 0);
	return mat4(data0, data1, data2, vec4(0.0));
}

void applyColor(int stg, vec4 color) {
	// stage[stg].color = color;
	float availableAlpha = 1.0 - stage[stg].color.a;
	if (availableAlpha <= 0.0) {
		return;
	}
	
	stage[stg].color.rgb = mix(stage[stg].color.rgb, color.rgb, availableAlpha);
	stage[stg].color.a += color.a * availableAlpha;
}


float objSDF(vec3 p, int index) {
	mat4 data = objData(index);
	
	int type = int(data[0][0]);
	float d = 9999.;
	/*
	0      sphere
	1      ellipse
	2      capsule
	3      cylinder
	10     box
	11     boxFrame
	12     gyroid
	20     line
	30     octahedron
	40     ring
	51     rhombus prism
	*/
	switch (type) {
		case 0: 
			{d = sphereSDF(p, data[1]); /*stage[1].color[1] = data[1][0] / 4.0;*/} break;
		case 1: 
			{d = ellipsoidSDF(p, data[1], data[2]);} break;
		case 2:
			{d = capsuleSDF(p, data[1], data[2]);} break;
		case 3:
			{d = cylinderSDF(p, data[1], data[2]);} break;
		case 10:
			{d = boxSDF(p, data[1], data[2]);} break;
		case 11:
			{d = boxFrameSDF(p, data[1], data[2]);} break;
		case 12:
			{d = gyroidSDF(p, data[1], data[2], data[3]);} break;
		case 20:
			// {d = lineSDF(p, data[1], data[2]);} break;
		case 30:
			// {d = octahedronSDF(p, data[1], data[2]);} break;
		case 40:
			{d = ringSDF(p, data[1], data[2]);} break;
		case 51:
			// {d = rhombusPrismSDF(p, data[1], data[2]);} break;
			
		// case 5:
		// 	{d = SDF(p, data[1], data[2]);} break;
		default: 
			{d = 9999.;} break;
	}
	return d;
}


vec3 getNormal(vec3 p, int objIndex) {
	float d = objSDF(p, objIndex);
	vec2 e = vec2(0.001, 0.);
	vec3 n = vec3(d) - vec3(
		objSDF(p + e.xyy, objIndex),
		objSDF(p + e.yxy, objIndex),
		objSDF(p + e.yyx, objIndex)
	);
	return normalize(n);
}


int applyHitEffect(int stg, int matType, vec4 data0, vec4 data1, vec4 data2) {
	mat4 data = matData(stage[stg].closestInd);
	
	switch (matType) {
		//color
		default:
		case 0: {
			applyColor(1, data[0]);
			}
			return 1;
		//concrete
		case 1: {
		
			}
			return 1;
		//rubber
		case 2: {
		
			}
			return 1;
		//glass
		case 10: {
			if (abs(stage[stg].localDist) < ray_minDist * 2.) {
				applyColor(stg, data[0]);
				stage[stg].localDist = ray_minDist * 2.;
			} else {
				stage[stg].localDist = -stage[stg].localDist;
			}
			}
			return 0;
		//ghost
		case 11: {
		
			}
			return 1;
		//portal
		case 20: {
		
			}
			return 1;
		//mirror
		case 30: {
			applyColor(stg, data[0]);
			vec3 incident = stage[stg].dPos;
			vec3 normal = getNormal(stage[stg].pos, stage[stg].closestInd);
			//vec3 normal = normalize(vec3(-1, -1, -1));
			float product = dot(incident, normal);
			stage[stg].dPos = incident - 2. * normal * product;	
			stage[stg].localDist = ray_minDist * 2.;
			// return 1;
			}
			return 0;
	}
	return 1;
}

void applyNearEffect(int stg, int matType, vec4 data0, vec4 data1, vec4 data2) {

}


float sceneSDF(vec3 p, int stg) {
	float minDist = 1e9;
	
	for(int i=0; i<uObjectCount; i++) {
		float d = objSDF(p, i);
		
		if(d < minDist) {
			minDist = d;
			stage[stg].closestInd = i;
		}
	}
	
	return minDist;
}



// Raymarching steps

void raymarch() {
	for(int i=0; i<ray_maxIters; i++) {
		// vec3 p = startP + dPos * totalDist;
		stage[0].localDist = sceneSDF(stage[0].pos, 0);
		
		//if (i == ray_maxIters - 1) {
		//stage[1].color = vec4(float(uObjectCount) / 10., stage[0].localDist / 20000., 0.1, 1.0);
		//}
		
		//TODO: do some material effect in here when there are materials
		if (stage[0].localDist < ray_nearDist) {
			mat4 matDat = matData(stage[0].closestInd);
			vec4 fetched = texelFetch(uUniverseTex, ivec2(stage[0].closestInd, 0), 0);
			int type = int(fetched[1]);
			// stage[1].color = fetched;
		
			if (stage[0].localDist < ray_minDist) {
				int res = applyHitEffect(0, type, matDat[0], matDat[1], matDat[2]);
				if (res == 1) {
					return;
				}
			} else {
				applyNearEffect(0, type, matDat[0], matDat[1], matDat[2]);
			}
		}
		
		
		stage[0].totalDist += stage[0].localDist;
		stage[0].pos += stage[0].localDist * stage[0].dPos;
		if(stage[0].totalDist > ray_maxDist) {
			return;
		}
	}
}

void shadow() {
	float result = 1.0;
	stage[1].totalDist = 0.02;
	for(int i=0; i<40; i++) {
		float h = sceneSDF(stage[1].pos, 1);
		float shadowTolerance = min(stage[1].totalDist, 80.);
		result = min(result, 8.0 * (h / shadowTolerance));
		
		stage[1].localDist = max(h, ray_minDist);
		stage[1].totalDist += stage[1].localDist;
		stage[1].pos += stage[1].dPos * stage[1].localDist;
		//potentially add t cutoff here (far away objects won't cast shadows)
		if(h < ray_minDist * 0.1) {
			break;
		}
	}
	//quantize shadows for cell shading effect
	result = floor(result * render_shadowSteps) / render_shadowSteps;
	stage[1].color *= 0.3 + (0.7 * clamp(result, 0.0, 1.0));
}



//actual fragment shader: what's done for a pixel

void main() {
	stage[0].pos = uCamPos;
	
	//TODO: why does this go from -1 to 1?
	vec2 uv = vUV * 2.0 - 1.0;
	uv.x *= uResolution.x / uResolution.y;
	
	stage[0].dPos = normalize(uCamRot * vec3(uv, 1));
	
	//stage 0
	raymarch();
	
	//stage 1
	if (stage[0].totalDist < ray_maxDist) {
		//it's hit an object
		// mat4 hitData = objData(stage[0].closestInd);
		
		// vec4 sunData = texelFetch(uUniverseTex, vec2(513, 0));
		vec3 sunVec = vec3(0, 0.644217687237691, 0.7648421872844885);
		vec3 normal = getNormal(stage[0].pos, stage[0].closestInd);
		stage[1].pos = stage[0].pos - normal * ray_minDist * 2.;
		// stage[1].pos = stage[0].pos + sunVec * ray_minDist * 1.5;
		stage[1].dPos = sunVec;
		shadow();
	}
	
	applyColor(0, stage[1].color);
	
	mat4 dat = objData(stage[0].closestInd);
	
	// vec3 lightMix = stage[0].color.rgb + stage[1].color.rgb;
	// float rescale = max(max(lightMix.r, lightMix.g), lightMix.b);
	// outColor = vec4(lightMix * rescale, 1.0);
	
	applyColor(0, vec4(0.1, 0.2, 0.3 + stage[1].dPos[1] * 0.7, 1.0));
	outColor = vec4(stage[0].color.rgb, 1.0);
	// vec4 test = texelFetch(uUniverseTex, ivec2(0,0), 0);
	// outColor = vec4(test.xyz / 20., 1.0);
}