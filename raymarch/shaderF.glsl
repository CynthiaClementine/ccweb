#version 300 es

#define fencepost 4278259968.

#define ray_maxIters 500
#define ray_maxDist 3000.0
#define ray_nearDist 3.0
#define ray_minDist 0.1
#define render_shadowSteps 2.
#define obj_maxNum 500
//should be log2(obj_maxNum) + 1
//but that's too difficult for the compiler to figure out
#define bvh_maxNum 13



#define SPHERE		0
#define ELLIPSE		1
#define CAPSULE		2
#define CYLINDER	3
#define BOX			10
#define BOXFRAME	11
#define GYROID		12
#define LINE		20
#define OCTAHEDRON	30
#define RING		40
#define RHOMBUSPRISM 51

precision highp float;
precision highp sampler2DArray;

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

uniform int uDebug;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform int uCamWorld;
uniform sampler2DArray uUniverseTex;
uniform sampler2D uUniverseBVHs;

vec2 seed;

int objIndices[obj_maxNum];

Raydata stage[2] = Raydata[2](
	Raydata(0, 0, 0.0, 0.0, 0, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec4(0., 0., 0., 0.)),
	Raydata(0, 0, 0.0, 0.0, 0, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec4(0.1, 0.1, 0.1, 0.1))
);

void calcSceneObjs(int);

void setStageRay(int stg, vec3 newPos, vec3 newDPos) {
	stage[stg].pos = newPos;
	stage[stg].dPos = newDPos;
	calcSceneObjs(stg);
}




//general compute functions
float rand(float low, float high) {
	float a = 12.9898;
	float b = 78.233;
	float c = 43758.5453;
	seed.y += seed.y + uTime;
	float dt = dot(seed.xy, vec2(a, b));
	float sn = mod(dt , 3.14);
	seed.y = mod(sn, 37.1482);
	return low + (high - low) * fract(sin(sn) * c);
}

vec2 rotate(float x, float z, float angle) {
	float sn = sin(angle);
	float cs = cos(angle);
	return vec2(x * cs - z * sn, z * cs + x * sn);
}



//texture fetch functions
vec3 w_spawn(int worldID) {
	return texelFetch(uUniverseTex, ivec3(obj_maxNum, 0, worldID), 0).xyz;
}

int w_objCount(int worldID) {
	return int(texelFetch(uUniverseTex, ivec3(obj_maxNum, 0, worldID), 0)[3]);
}

vec3 w_sunVec(int worldID) {
	return texelFetch(uUniverseTex, ivec3(obj_maxNum, 1, worldID), 0).xyz;
}

float w_ambientLight(int worldID) {
	return texelFetch(uUniverseTex, ivec3(obj_maxNum, 1, worldID), 0)[3];
}

vec2 w_effectCounts(int worldID) {
	return texelFetch(uUniverseTex, ivec3(obj_maxNum, 2, worldID), 0).xy;
}

mat4 objData(int world, int index) {
	//data0 will be: ID, materialID, x, x
	//data0 is now:  ID, r, g, b
	//data1 is x, y, z, r
	//data2 is //rx, ry, rz, ?
	//data3 and data4 are more misc. 
	//num, world, index
	vec4 data0 = texelFetch(uUniverseTex, ivec3(index, 0, world), 0);
	vec4 data1 = texelFetch(uUniverseTex, ivec3(index, 1, world), 0);
	vec4 data2 = texelFetch(uUniverseTex, ivec3(index, 2, world), 0);
	vec4 data3 = texelFetch(uUniverseTex, ivec3(index, 3, world), 0);
	return mat4(data0, data1, data2, data3);
}

mat4 matData(int world, int index) {
	vec4 data0 = texelFetch(uUniverseTex, ivec3(index, 4, world), 0);
	vec4 data1 = texelFetch(uUniverseTex, ivec3(index, 5, world), 0);
	vec4 data2 = texelFetch(uUniverseTex, ivec3(index, 6, world), 0);
	return mat4(data0, data1, data2, vec4(0.0));
}

mat4 effectData(int world, int effectIndex, bool isPre) {
	vec4 data0 = texelFetch(uUniverseTex, ivec3(obj_maxNum + 1 + effectIndex, 4*int(isPre) + 0, world), 0);
	vec4 data1 = texelFetch(uUniverseTex, ivec3(obj_maxNum + 1 + effectIndex, 4*int(isPre) + 1, world), 0);
	vec4 data2 = texelFetch(uUniverseTex, ivec3(obj_maxNum + 1 + effectIndex, 4*int(isPre) + 2, world), 0);
	return mat4(data0, data1, data2, vec4(0.0));
}


//
void applyColor(int stg, vec4 color) {
	// stage[stg].color = color;
	float availableAlpha = 1.0 - stage[stg].color.a;
	if (availableAlpha <= 0.0) {
		return;
	}
	
	// super funky effect
	// outColor = vec4(vec3(availableAlpha), 1.0);
	
	stage[stg].color.rgb = mix(stage[stg].color.rgb, color.rgb, availableAlpha);
	stage[stg].color.a += color.a * availableAlpha;
}

void preEffect(int stg, vec4 data0, vec4 data1, vec4 data2) {
	int effectType = int(data0[0]);
	vec3 arg0 = data0.gba;
	switch (effectType) {
		//loop
		case 10: {
			setStageRay(stg, mod(stage[stg].pos, arg0[0]), stage[stg].dPos);
		} break;
		//brighten
		case 20: {
			if (stage[stg].color.a >= 1.0) {
				return;
			}
			stage[stg].color.rgb += arg0;
			//rescale to fit within normal bounds
			float rescale = max(max(stage[stg].color.r, stage[stg].color.g), stage[stg].color.b);
			if (rescale > 1.0) {
				stage[stg].color.rgb /= rescale;
			}
			stage[stg].color.a += 2./255.;
		} break;
		//whiten
		case 21: {
			stage[stg].color.rgb += vec3(1./255., 1./255., 1./255.);
			stage[stg].color.a += 1.;
		} break;
		//spherize
		case 30: {
			
		} break;
		case 3: {
			
		} break;
		case 4: {
			
		} break;
		case 5: {
			
		} break;
	}
}

void applyPreEffects(int stg) {
	int effCount = int(w_effectCounts(stage[stg].world)[0]);
	for (int d=0; d<effCount; d++) {
		mat4 dat = effectData(stage[stg].world, d, true);
		preEffect(stg, dat[0], dat[1], dat[2]);
	}
}

//postEffects always apply to stage 1 (but can take in data from either stage)
void postEffect(int stg, vec4 data0, vec4 data1, vec4 data2) {
	int effectType = int(data0[0]);
	vec3 arg0 = data0.gba;
	switch (effectType) {
		//bg
		case 0: {
			if (stg > 0) {
				return;
			}
			applyColor(0, vec4(arg0, 1.0));
		} break;
		//bg_range
		case 1: {
			if (stg > 0) {
				return;
			}
			applyColor(0, vec4(rand(arg0.r, data1.r), rand(arg0.g, data1.g), rand(arg0.b, data1.b), 1.0));
		} break;
		//bg_gradient
		case 2: {
			
		} break;
		//bg_fadeTo
		case 10: {
			if (stg == 0) {
				return;
			}
			float distPerc = clamp(stage[0].totalDist / data1[0], 0.0, 0.9);
			stage[0].color.rgb = mix(stage[0].color.rgb, arg0.rgb, distPerc * distPerc);
		} break;
		//bg_fadeToOld
		case 11: {
			float distPerc = clamp((stage[0].totalDist + stage[1].totalDist) / data1[0], 0.0, 0.9);
			stage[0].color.rgb = mix(stage[0].color.rgb, arg0.rgb, distPerc * distPerc);
		} break;
		//bg_fadeToRange
		case 12: {
			if (stg == 0) {
				return;
			}
			vec3 col = vec3(rand(arg0.r, data1.r), rand(arg0.g, data1.g), rand(arg0.b, data1.b));
			float distPerc = clamp(stage[0].totalDist / data1[3], 0.0, 0.9);
			stage[0].color.rgb = mix(stage[0].color.rgb, col, distPerc * distPerc);
		} break;
		//sun
		case 20: {
			if (stg != 0) {
				return;
			}
			float sunSize = data1[0];
			float dotted = max(dot(stage[0].dPos, w_sunVec(stage[0].world)) - 1. + sunSize, 0.);
			dotted = min(2. * dotted / sunSize, 1.);
			if (dotted > 0.0) {
				stage[0].color.rgb = mix(stage[0].color.rgb, arg0.rgb, dotted);
			}
		} break;
	}
}


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
}

float ellipsoidSDF(vec3 point, vec4 data1, vec4 data2) {
	vec3 relPos = abs(point - data1.xyz) / data2.xyz;
	vec3 rrPos = relPos / data2.xyz;
	
	float d = length(relPos);
	float d2 = length(rrPos);
	return d * (d - 1.) / d2;
}

float lineSDF(vec3 point, vec4 data1, vec4 data2) {
	point -= data1.xyz;
	float lineDot = dot(data2.xyz, data2.xyz);
	float lambda = clamp(dot(point, data2.xyz) / lineDot, 0., 1.);
	return length(point - mix(vec3(0.), data2.xyz, lambda)) - data2[3];
}

float octahedronSDF(vec3 point, vec4 data1, vec4 data2) {
	point -= data1.xyz;
	point.xz = rotate(point.x, point.z, 0.7853981634);
	point = abs(point);
	
	return 0.57735 * dot((point - data2.xyz), vec3(1, 1, 1));
}

float planeSDF(vec3 point, vec4 data1) {
	return point[1] - data1[2];
}

float ringSDF(vec3 point, vec4 data1, vec4 data2) {
	vec3 dist = abs(point - data1.xyz);
	float q = length(dist.xz) - data2[0];
	return sqrt(q * q + dist.y * dist.y) - data2[1];
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


float objSDF(vec3 p, int world, int index) {
	mat4 data = objData(world, index);
	
	int type = int(data[0][0]);
	float d = 9999.;
	
	//it's a loop object. Do the modulation beforehand
	if (type > 100) {
		type -= 100;
		float loopSize = data[3][3];
		vec3 insideP = clamp(p, -data[1].xyz, data[1].xyz);
		data[1].xyz = vec3(0.);
		p = mod(insideP, loopSize) + p - insideP - vec3(loopSize / 2.);
	}
	switch (type) {
		case SPHERE: 
			{d = sphereSDF(p, data[1]); /*stage[1].color[1] = data[1][0] / 4.0;*/} break;
		case ELLIPSE: 
			{d = ellipsoidSDF(p, data[1], data[2]);} break;
		case CAPSULE:
			{d = capsuleSDF(p, data[1], data[2]);} break;
		case CYLINDER:
			{d = cylinderSDF(p, data[1], data[2]);} break;
		case BOX:
			{d = boxSDF(p, data[1], data[2]);} break;
		case BOXFRAME:
			{d = boxFrameSDF(p, data[1], data[2]);} break;
		case GYROID:
			{d = gyroidSDF(p, data[1], data[2], data[3]);} break;
		case LINE:
			{d = lineSDF(p, data[1], data[2]);} break;
		case OCTAHEDRON:
			{d = octahedronSDF(p, data[1], data[2]);} break;
		case RING:
			{d = ringSDF(p, data[1], data[2]);} break;
		case RHOMBUSPRISM:
			// {d = rhombusPrismSDF(p, data[1], data[2]);} break;
			
		// case 5:
		// 	{d = SDF(p, data[1], data[2]);} break;
		default: 
			{d = 9999.;} break;
	}
	return d;
}


vec3 getNormal(vec3 p, int worldIndex, int objIndex) {
	float d = objSDF(p, worldIndex, objIndex);
	vec2 e = vec2(0.001, 0.);
	vec3 n = vec3(d) - vec3(
		objSDF(p + e.xyy, worldIndex, objIndex),
		objSDF(p + e.yxy, worldIndex, objIndex),
		objSDF(p + e.yyx, worldIndex, objIndex)
	);
	return normalize(n);
}


int applyHitEffect(int stg, int matType, vec4 data0, vec4 data1, vec4 data2) {
	// mat4 data = matData(stage[stg].world, stage[stg].closestInd);
	
	switch (matType) {
		//color
		default:
		case 0: {
			applyColor(1, data0);
		} return 1;
		//concrete
		case 1: {
		
		} return 1;
		//rubber
		case 2: {
			float localVal = mod(stage[stg].pos[0] + stage[stg].pos[2], 10.) - 5.;
			vec3 mult = vec3(4.0/255., 4.0/255., 4.8/255.);
			vec4 paint = vec4(vec3(47./255., 48./255., 66./255.) + localVal * mult, 1.0);
			
			applyColor(stg, paint);
			stage[stg].localDist = ray_minDist * 2.;
		} return 1;
		//glass
		case 10: {
			if (abs(stage[stg].localDist) < ray_minDist * 2.) {
				applyColor(stg, data0);
				stage[stg].localDist = ray_minDist * 2.;
			} else {
				stage[stg].localDist = -stage[stg].localDist;
			}
		} return 0;
		//ghost
		case 11: {
		} return 1;
		//portal
		case 20: {
			stage[stg].world = int(data1[0]);
			setStageRay(stg, stage[stg].pos + data0.xyz, stage[stg].dPos);
			stage[stg].localDist = ray_minDist * 2.;
		} return 0;
		//mirror
		case 30: {
			applyColor(stg, data0);
			vec3 incident = stage[stg].dPos;
			vec3 normal = getNormal(stage[stg].pos, stage[stg].world, stage[stg].closestInd);
			//vec3 normal = normalize(vec3(-1, -1, -1));
			float product = dot(incident, normal);
			setStageRay(stg, stage[stg].pos, incident - 2. * normal * product);
			stage[stg].localDist = ray_minDist * 2.;
			// return 1;
		} return 0;
	}
	return 1;
}

void applyNearEffect(int stg, int matType, vec4 data0, vec4 data1, vec4 data2) {

}


bool intersects(vec3 p, vec3 v, vec3 minPos, vec3 maxPos) {
	vec3 invV = 1.0 / v;
	vec3 tLow = (minPos - p) * invV;
	vec3 tHigh = (maxPos - p) * invV;
	vec3 tClose = min(tLow, tHigh);
	vec3 tFar = max(tLow, tHigh);
	
	float tCloseReal = max(max(tClose.x, tClose.y), tClose.z);
	float tFarReal = min(min(tFar.x, tFar.y), tFar.z);
	
	return (tFarReal > 0.) && (tCloseReal <= tFarReal);
}
		
void calcSceneObjs(int stg) {
	//set up array
	int numObjs = objIndices[obj_maxNum - 1];
	for (int o=0; o<numObjs; o++) {
		objIndices[o] = -1;
	}
	objIndices[obj_maxNum - 1] = 0;
	numObjs = 0;
	
	//add objects to array based on the tree
	int nodeStack[bvh_maxNum];
	for (int s=0; s<bvh_maxNum; s++) {
		nodeStack[s] = -1;
	}
	nodeStack[0] = 0;
	int nodeCount = 1;
	
	
	//there are 2*objs nodes in the tree. At maximum, we explore every one of them
	int len = 2 * w_objCount(stage[stg].world);
	int explored = 0;
	for (int f=0; f<len; f++) {
		explored += 1;
		nodeCount -= 1;
		if (nodeCount < 0) {
			break;
		}
		int nodeID = nodeStack[nodeCount];
		nodeStack[nodeCount] = -1;
		
		
		vec4 data0 = texelFetch(uUniverseBVHs, ivec2(nodeID, 2 * stage[stg].world), 0);
		vec4 data1 = texelFetch(uUniverseBVHs, ivec2(nodeID, 2 * stage[stg].world + 1), 0);
		
		//make sure it's a valid node anyways
		if (data1[3] != fencepost) {
			continue;
		}
		
		
		//use slab method to figure out if the ray intersects the bounding box
		if (!intersects(stage[stg].pos, stage[stg].dPos, data0.xyz, data1.xyz)) {
			continue;
		}
		
		//if the node has children, add them to the stack and recurse
		if (data0[3] == -1. && nodeCount + 1 < bvh_maxNum) {
			nodeStack[nodeCount] = 2 * nodeID + 1;
			nodeStack[nodeCount+1] = 2 * nodeID + 2;
			nodeCount += 2;
			continue;
		}
		
		//if the node does not have children, put it in the objs array
		int held = int(data0[3]);
		int temp;
		for (int g=0; g<numObjs; g++) {
			if (objIndices[g] > held) {
				temp = objIndices[g];
				objIndices[g] = held;
				held = temp;
			}
		}
		objIndices[numObjs] = held;
		numObjs += 1;
	}
	// outColor = vec4(0., max(outColor.g, float(numObjs) / 50.), 0.5, 1.);

	//return array with length info encoded
	objIndices[obj_maxNum - 1] = numObjs;
}

		// const scene = this.world.bvh.objects(this);
		// var dist = 2 * ray_maxDist;
		// var distObj;
		// var isObj;
		// for (var a=0; a<scene.length; a++) {
		// 	[dist, isObj] = scene[a].sceneSDF(pos, dist);
		// 	if (isObj) {
		// 		distObj = scene[a];
		// 	}
		// }
float sceneSDF(vec3 p, int stg) {
	int objCount = objIndices[obj_maxNum - 1];
	float minDist = 1e9;
	// objCount = w_objCount(stage[stg].world);
	
	for(int i=0; i<objCount; i++) {
		float d = objSDF(p, stage[stg].world, objIndices[i]);
		// float d = objSDF(p, stage[stg].world, i);
		
		if(d < minDist) {
			minDist = d;
			stage[stg].closestInd = objIndices[i];
		}
	}
	
	return minDist;
}


// float sceneSDF(vec3 p, int stg) {
// 	int objCount = w_objCount(stage[stg].world);
// 	float minDist = 1e9;
	
// 	for(int i=0; i<objCount; i++) {
// 		float d = objSDF(p, stage[stg].world, i);
		
// 		if(d < minDist) {
// 			minDist = d;
// 			stage[stg].closestInd = i;
// 		}
// 	}
	
// 	return minDist;
// }



// Raymarching steps

void raymarch() {
	for(int i=0; i<ray_maxIters; i++) {
		// vec3 p = startP + dPos * totalDist;
		stage[0].localDist = sceneSDF(stage[0].pos, 0);

		if (stage[0].localDist < ray_nearDist) {
			mat4 matDat = matData(stage[0].world, stage[0].closestInd);
			vec4 fetched = texelFetch(uUniverseTex, ivec3(stage[0].closestInd, 0, stage[0].world), 0);
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
		applyPreEffects(0);
		
		
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
		result = min(result, 4.0 * (h / shadowTolerance));
		
		stage[1].localDist = max(h, ray_minDist);
		stage[1].totalDist += stage[1].localDist;
		stage[1].pos += stage[1].dPos * stage[1].localDist;
		//potentially add t cutoff here (far away objects won't cast shadows)
		if(h < ray_minDist * 0.1) {
			break;
		}
		applyPreEffects(1);
	}
	//quantize shadows for cell shading effect
	result = floor(result * render_shadowSteps) / render_shadowSteps;
	float ambience = w_ambientLight(stage[1].world);
	stage[1].color *= ambience + ((1. - ambience) * clamp(result, 0.0, 1.0));
}



//actual fragment shader: what's done for a pixel

void drawVal(float val, vec2 pos) {
	if (val < 0.) {
		outColor = vec4(-val, 0., 0., 1.0);
	} else if (val > 0.0) {
		if (val == fencepost) {
			outColor = vec4(1., 0., 1., 1.0);
		} else {
			outColor = vec4(0., val, 0., 1.0);
		}
	} else {
		if (mod(pos[0] / 10., 1.) < 0.03 || fract(pos[1]) < 0.02) {
			return;
		}
		outColor = vec4(0.25, 0.1, 0.25, 1.0);
	}
}

void drawWorld() {
	vec2 uv = vec2(smoothstep(0.0, 1.0, vUV.x), vUV.y) * 1.05 - 0.025;
	if (uv[0] < 0.0 || uv[0] > 1.0 || uv[1] < 0.0 || uv[1] > 1.0) {
		outColor = vec4(0.4, 0.3, 0.4, 1.0);
		return;
	}
	float worldWidth = float(obj_maxNum) + 6.;
	float worldHeight = 7.;
	
	vec2 texPos = vec2((worldWidth + 1.) * uv.x, (worldHeight + 1.) * uv.y);
	int subpx = int(floor(mod(texPos[1], 1.0) * 4.0));
	
	
	vec4 fetched = texelFetch(uUniverseTex, ivec3(int(texPos.x), int(texPos.y), uCamWorld), 0);
	float val = fetched[subpx];
	drawVal(val, texPos);
}

void drawBvh() {
	vec2 uv = vec2(vUV.x, vUV.y) * 1.05 - 0.025;
	if (uv[0] < 0.0 || uv[0] > 1.0 || uv[1] < 0.0 || uv[1] > 1.0) {
		outColor = vec4(0.5, 0.2, 0.5, 1.0);
		return;
	}
	float width = float(obj_maxNum);
	float height = 40.;
	
	vec2 texPos = vec2((width + 1.) * uv.x, (height + 1.) * uv.y);
	int subpx = int(floor(mod(texPos[1], 1.0) * 4.0));
	
	
	vec4 fetched = texelFetch(uUniverseBVHs, ivec2(int(texPos.x), int(texPos.y)), 0);
	float val = fetched[subpx];
	drawVal(val, texPos);
}

void main() {
	if (uDebug == 1) {
		drawWorld();
		return;
	}
	if (uDebug == 2) {
		drawBvh();
		return;
	}
	
	for (int a=0; a<obj_maxNum; a++) {
		objIndices[a] = -1;
	}
	objIndices[obj_maxNum - 1] = 0;
	
	//TODO: why does this go from -1 to 1?
	vec2 uv = vUV * 2.0 - 1.0;
	seed = vec2(vUV);
	uv.x *= uResolution.x / uResolution.y;
	
	
	stage[0].world = uCamWorld;
	setStageRay(0, uCamPos, normalize(uCamRot * vec3(uv, 1)));
	
	//fetch world data
	//??
	
	int currStg = 0;
	
	//stage 0
	raymarch();
	
	//stage 1
	
	if (stage[0].totalDist < ray_maxDist) {
		currStg = 1;
		//it's hit an object
		// mat4 hitData = objData(stage[0].closestInd);
		
		vec3 sunVec = w_sunVec(stage[0].world);
		vec3 normal = getNormal(stage[0].pos, stage[0].world, stage[0].closestInd);
		stage[1].world = stage[0].world;
		setStageRay(1, stage[0].pos - normal * ray_minDist * 2., sunVec);
		shadow();
	}
	
	applyColor(0, stage[1].color);
	
	
	// post effects go here??????? this is mint
	// MAID!!!! FEtch me my textures~~!!
	int effCount = int(w_effectCounts(stage[currStg].world)[1]);
	for (int d=0; d<effCount; d++) {
		mat4 dat = effectData(stage[currStg].world, d, false);
		postEffect(currStg, dat[0], dat[1], dat[2]);
	}
	
	mat4 objDat = objData(stage[0].world, stage[0].closestInd);
	
	// vec3 lightMix = stage[0].color.rgb + stage[1].color.rgb;
	// float rescale = max(max(lightMix.r, lightMix.g), lightMix.b);
	// outColor = vec4(lightMix * rescale, 1.0);
	
	// gradient postEffect:
	// applyColor(0, vec4(0.1, 0.2, 0.3 + stage[1].dPos[1] * 0.7, 1.0));
	
	//send to screem
	outColor = vec4(stage[0].color.rgb, 1.0);
	
	// outColor = vec4(vec3(uTime / 255., 0., 0.), 1.0);
}