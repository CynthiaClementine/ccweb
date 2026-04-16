#version 300 es

#define fencepost 4278259968.

#define ray_maxIters 500
#define ray_maxDist 5000.0
#define ray_nearDist 3.0
#define ray_minDist 0.15
#define ray_maxBounces 22
#define render_shadowSteps 2.
#define obj_maxNum 500

#define fractal_iters 10


//shapes
#define SPHERE		0
#define ELLIPSE		1
#define CAPSULE		2
#define CYLINDER	3
#define SHELL		4
#define BOX			10
#define BOXFRAME	11
#define GYROID		12
#define VOXEL		13
#define CUBE		14
#define LINE		20
#define DISH		22
#define OCTAHEDRON	30
#define RING		40
#define PRISM_RHOMB	51
#define PRISM_HEX	53
#define PRISM_OCT	55
#define FRACTAL		70

//pre-effects
#define E_LOOP			10
#define E_BRIGHTEN		20
#define E_WHITEN		21
#define E_SPHERIZE		30

//post-effects
#define E_BG			0
#define E_BG_RANGE		1
#define E_GRADIENT		2
#define E_FADE			10
#define E_FADE_OLD		11
#define E_FADE_RANGE	12
#define E_SUN			20
#define E_ITERS			31

//natures
#define N_NORMAL	0
#define N_GLOOPY	1
#define N_ANTI		2
#define N_FOG		4

//materials
#define M_COLOR		0
#define M_CONCRETE	1
#define M_RUBBER	2
#define M_NORMAL	3
#define M_GLASS		10
#define M_GHOST		11
#define M_PORTAL	20
#define M_MIRROR	30

precision highp float;
precision highp sampler2DArray;



in vec2 vUV;
out vec4 outColor;

struct Raydata {
	int iters;
	
	int closestInd;
	float totalDist;
	float localDist;
	float distSinceBounce;
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

int bounceCount = 0;
float bvhTolerance = 8.0;

Raydata stage[2] = Raydata[2](
	Raydata(0, 0, 0.0, 0.0, 0.0, 0, vec3(0.0), vec3(0.0), vec4(0.,0.,0.,0.)),
	Raydata(0, 0, 0.0, 0.0, 0.0, 0, vec3(0.0), vec3(0.0), vec4(1.0,0.1,0.1,0.0))
);

void calcSceneObjs(int);

void setStageRay(int stg, vec3 newPos, vec3 newDPos) {
	stage[stg].pos = newPos;
	stage[stg].dPos = newDPos;
	calcSceneObjs(stg);
	bounceCount += 1;
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

vec2 rotate(vec2 pos, int deg) {
	float angle = float(deg) * 0.01745329252;
	float sn = sin(angle);
	float cs = cos(angle);
	return vec2(pos.x * cs - pos.y * sn, pos.y * cs + pos.x * sn);
}

vec2 rotate(vec2 pos, float rad) {
	float sn = sin(rad);
	float cs = cos(rad);
	return vec2(pos.x * cs - pos.y * sn, pos.y * cs + pos.x * sn);
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
	//data0 is: ID, materialID, nature, __
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
	if (availableAlpha == 1.0) {
		stage[stg].color.rgb = mix(stage[stg].color.rgb, color.rgb, availableAlpha);
	} else {
		stage[stg].color.rgb = mix(stage[stg].color.rgb, color.rgb, color.a * availableAlpha);
	}
	stage[stg].color.a += color.a * availableAlpha * 1.1;
}

void applyColorLight(int stg, vec4 color) {
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
		case E_LOOP: {
			setStageRay(stg, mod(stage[stg].pos, arg0[0]), stage[stg].dPos);
		} break;
		//brighten
		case E_BRIGHTEN: {
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
		case E_WHITEN: {
			stage[stg].color.rgb += vec3(1./255., 1./255., 1./255.);
			stage[stg].color.a += 1.;
		} break;
		//spherize
		// case E_SPHERIZE: {
			
		// } break;
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
		case E_BG: {
			if (stg > 0) {
				return;
			}
			applyColorLight(0, vec4(arg0, 0.0));
		} break;
		//bg_range
		case E_BG_RANGE: {
			if (stg > 0) {
				return;
			}
			applyColorLight(0, vec4(rand(arg0.r, data1.r), rand(arg0.g, data1.g), rand(arg0.b, data1.b), 0.0));
		} break;
		//bg_gradient
		case E_GRADIENT:
			break;
		//bg_fadeTo
		case E_FADE: {
			if (stg == 0) {
				return;
			}
			float distPerc = stage[0].totalDist;
			vec3 transmittance = vec3(0.5 + 0.5 * arg0.rgb);
			// stage[0].color.rgb = mix(stage[1].color.rgb, arg0.rgb, clamp(exp(-5. + 5.*distPerc), 0., 1.));
			stage[0].color.rgb = mix(stage[1].color.rgb, arg0.rgb, clamp(1. - exp(-distPerc * transmittance / data1[0]), 0., 1.));
		} break;
		//bg_fadeToOld
		case E_FADE_OLD: {
			float distPerc = clamp((stage[0].totalDist + stage[1].totalDist) / data1[0], 0.0, 0.9);
			stage[0].color.rgb = mix(stage[0].color.rgb, arg0.rgb, distPerc * distPerc);
		} break;
		//bg_fadeToRange
		case E_FADE_RANGE: {
			if (stg == 0) {
				return;
			}
			vec3 col = vec3(rand(arg0.r, data1.r), rand(arg0.g, data1.g), rand(arg0.b, data1.b));
			float distPerc = clamp(stage[0].totalDist / data1[3], 0.0, 0.9);
			stage[0].color.rgb = mix(stage[0].color.rgb, col, distPerc * distPerc);
		} break;
		//sun
		case E_SUN: {
			if (stg != 0) {
				return;
			}
			float sunSize = data1[0];
			float dotted = max(dot(stage[0].dPos, w_sunVec(stage[0].world)) - 1. + sunSize, 0.);
			dotted = clamp(2. * dotted / sunSize, 0.0, 1.0);
			if (dotted > 0.0) {
				applyColorLight(0, vec4(mix(stage[0].color.rgb, arg0.rgb, dotted), 1.));
			}
		} break;
		
		case E_ITERS: {
			float gweh = 3. * (float(stage[0].iters) + float(stage[1].iters)) / float(ray_maxIters);
				stage[0].color.rgba = vec4(
					gweh * gweh, 
					0.1 + stage[stg].color.g / 4., 
					float(bounceCount) / float(ray_maxBounces),
					1.0
				);
		} break;
	}
}




//2d SDFs
float hexagonSDF(vec2 point, float r) {
	vec3 magicNums = vec3(-0.86603, 0.5, 0.57735);
	point = abs(point);
	point -= 2. * min(dot(magicNums.xy, point), 0.) * magicNums.xy;
	point.x -= clamp(point.x, -magicNums[2] * r, magicNums[2] * r);
	point.y -= r;
	return length(point) * sign(point.y);
}

float octagonSDF(vec2 point, float r) {
	vec3 magicNums = vec3(-0.9238795325, 0.382683, 0.4142135);
	point = abs(point);
	point -= 2. * min(dot(magicNums.xy, point), 0.) * magicNums.xy;
	point -= 2. * min(dot(vec2(-magicNums.x, magicNums.y), point), 0.) * vec2(-magicNums.x, magicNums.y);
	point.x -= clamp(point.x, -magicNums.z * r, magicNums.z * r);
	point.y -= r;
	return length(point) * sign(point.y);
}


float rhombusSDF(vec2 point, vec2 r, float skew) {
	float relX = point.x;
	float relY = point.y;
	
	if (relY < 0.) {
		relX = -relX;
		relY = -relY;
	}
	
	skew /= 2.;
	float hegt = r.y;
	float widt = r.x;
	
	float w0 = relX - skew;
	float w1 = relY - hegt;
	w0 = w0 - clamp(w0, -widt, widt);
	float d0 = w0*w0 + w1*w1;
	float d1 = -w1;
	
	float s = relX * hegt - relY * skew;
	if (s < 0.) {
		relX = -relX;
		relY = -relY;
	}
	float v0 = relX - widt;
	float v1 = relY;
	
	float ve = v0 * skew   + v1 * hegt;
	float ee = skew * skew + hegt * hegt;
	float gweh = clamp(ve / ee, -1., 1.);
	
	v0 = v0 - skew * gweh;
	v1 = v1 - hegt * gweh;
	float vv = v0 * v0 + v1 * v1;
	
	d0 = min(d0, vv);
	d1 = min(d1, widt * hegt - abs(s));
	
	return sqrt(d0) * sign(-d1);
}

float prismSDF(vec3 point, int type, float data1, vec4 data2) {
	//data1: [x, y, z, null]
	float shapeDist = 9999.;
	//data2: [rx, ry, rz, skew]
	switch (type) {
		case PRISM_RHOMB:{shapeDist = rhombusSDF(point.xy, data2.xy, data2[3]);} break;
		case PRISM_HEX:  {shapeDist = hexagonSDF(point.xy, data2.x);} break;
		case PRISM_OCT:  {shapeDist = octagonSDF(point.xy, data2.x);} break;
		default:
			break;
	}

	float vertDist = abs(point.z) - data2.z;
	float negPart = min(max(shapeDist, vertDist), 0.);
	float posPart = length(vec2(max(shapeDist, 0.), max(vertDist, 0.)));
	return negPart + posPart;
}


//SDFs
float boxSDF(vec3 point, vec4 data2) {
	float r = 0.4;
	vec3 q = abs(point) - data2.xyz + vec3(r);
	return length(max(q, vec3(0.))) + min(max(q.x, max(q.y, q.z)), 0.) - r;
}

float capsuleSDF(vec3 point, float data1, vec4 data2) {
	vec3 q = vec3(point.x, point.y, point.z - clamp(point.z, -data2[0], data2[0]));
	return length(q) - data1;
}

float cylinderSDF(vec3 point, float data1, vec4 data2) {
	float r = data1;
	float h = data2[0];
	vec2 d = abs(vec2(length(point.xy), point.z)) - vec2(r, h);
	return min(max(d.x, d.y), 0.) + length(max(d, vec2(0.)));
}

float dishSDF(vec3 point, float data1, vec4 data2) {
	float rba = data2[3] - data1;
	float baba = dot(data2.xyz, data2.xyz);
	float papa = dot(point, point);
	float paba = dot(point, data2.xyz) / baba;
	float x = sqrt(papa - paba * paba * baba);
	// float cax = max(0.0, x - select(data2[3], data1, paba < 0.5));
	float cax = max(0.0, x - ((paba < 0.5) ? data1 : data2[3]));
	float cay = abs(paba - 0.5) - 0.5;
	float k = rba * rba + baba;
	float f = clamp((rba * (x - data1) + paba * baba) / k, 0.0, 1.0);
	float cbx = x - data1 - f * rba;
	float cby = paba - f;
	// float s = select(1., -1., cbx < 0.0 && cay < 0.0);
	float s = ((cbx < 0.0 && cay < 0.0) ? -1.0 : 1.0);
	return s * sqrt(min(cax * cax + cay * cay * baba, cbx * cbx + cby * cby * baba));
}

//shamelessly stolen from marble marcher. Marble marcher is cool
float fractalSDF(vec3 point, float data1, vec4 data2, vec4 data3) {
	point /= data1;
	//data2: [scale, a1, a2]
	//data3: [shift amount]
	float scale = data2[0];
	float a1 = data2[1];
	float a2 = data2[2];
	vec3 shift = data3.xyz;
	
	vec4 p = vec4(point, 1.);
	for (int i=0; i<fractal_iters; i++) {
		//absolute fold
		p.xyz = abs(p.xyz);
		
		//rot
		p.xy = rotate(p.xy, -a1);
		
		//menger fold (???????)
		float a = min(p.x - p.y, 0.);
		p.x -= a;
		p.y += a;
		a = min(p.x - p.z, 0.);
		p.x -= a;
		p.z += a;
		a = min(p.y - p.z, 0.);
		p.y -= a;
		p.z += a;
		
		//phi
		p.yz = rotate(p.yz, -a2);
		
		//scaling + translation
		p *= scale;
		p.xyz += shift;
	}
	
	//extra ending bit
	vec3 a = abs(p.xyz) - vec3(6.);
	float finalVal = (min(max(max(a.x, a.y), a.z), 0.) + length(max(a, 0.))) / p.w;
	return (finalVal * data1);
}

float gyroidSDF(vec3 point, float data1, vec4 data2, vec4 data3) {
	float dot = dot(sin(data1 * point.xyz), cos(data1 * point.zxy));
	vec3 relBoxPos = max(vec3(0.), abs(point) - data2.xyz);
	float boxsdf = length(relBoxPos);
	
	float gyrsdf = abs(data2[3] * dot) - data3[0];
	
	return max(boxsdf, gyrsdf);
}

float ellipsoidSDF(vec3 point, float data1, vec4 data2) {
	vec3 relPos = abs(point) / data2.xyz;
	vec3 rrPos = relPos / data2.xyz;
	
	float d = length(relPos);
	float d2 = length(rrPos);
	return d * (d - 1.) / d2;
}

float lineSDF(vec3 point, float data1, vec4 data2) {
	float lineDot = dot(data2.xyz, data2.xyz);
	float lambda = clamp(dot(point, data2.xyz) / lineDot, 0., 1.);
	return length(point - mix(vec3(0.), data2.xyz, lambda)) - data2[3];
}

float octahedronSDF(vec3 point, float data1, vec4 data2) {
	point.xz = rotate(point.xz, 0.7853981634);
	point = abs(point);
	
	return 0.57735 * dot((point - data2.xyz), vec3(1, 1, 1));
}

float ringSDF(vec3 point, float data1, vec4 data2) {
	vec3 dist = abs(point);
	float q = length(dist.xy) - data2[0];
	return sqrt(q * q + dist.z * dist.z) - data2[1];
}

float shellSDF(vec3 point, float data1, vec4 data2) {
	float sphereD = length(point) - data2[0];
	return abs(sphereD) - data2[1];
}

float sphereSDF(vec3 point, float data1) {
	return length(point) - data1;
}

float voxelSDF(vec3 point, float data1, vec4 data2, vec4 data3) {
	float halfD = data1 / 2.;
	float boxsdf = boxSDF(point, vec4(halfD));
	
	point = clamp((point / data1) + 0.5, 0., 1.);
	
	vec4 plane = mix(data2, data3, vec4(point.y));
	vec2 line = mix(plane.xw, plane.yz, vec2(point.x));
	float voxelsdf = halfD * mix(line[0], line[1], point.z);
	
	return max(boxsdf, voxelsdf);
}

float boxFrameSDF(vec3 point, float data1, vec4 data2) {
	vec3 q = abs(point) - data2.xyz;
	vec3 w = abs(q + data2[3]) - data2[3];
	return min(min(
		length(max(vec3(q.x, w.y, w.z), vec3(0.))) + min(max(q.x, max(w.y, w.z)), 0.),
		length(max(vec3(w.x, q.y, w.z), vec3(0.))) + min(max(w.x, max(q.y, w.z)), 0.)),
		length(max(vec3(w.x, w.y, q.z), vec3(0.))) + min(max(w.x, max(w.y, q.z)), 0.));
}


float objSDF(vec3 p, int world, int index) {
	mat4 data = objData(world, index);
	
	int type = (floatBitsToInt(data[0][0]) & 0xFFFF);
	int nature = int(data[0][1]);
	int rotations = floatBitsToInt(data[0][2]);
	int theta = rotations       & 0x1FF;
	int phi = ((rotations >> 9 ) & 0x1FF) - 90;
	int rot = (rotations >> 18) & 0x1FF;
	float d = 9999.;
	
	//it's a loop object. Do the modulation beforehand
	if (type > 100) {
		type -= 100;
		float loopSize = data[3][3];
		vec3 insideP = clamp(p, -data[1].xyz, data[1].xyz);
		data[1].xyz = vec3(0.);
		p = mod(insideP, loopSize) + p - insideP - vec3(loopSize / 2.);
	}
	
	//transform to object coordinates
	p -= data[1].xyz;
	p.xz = rotate(p.xz, -theta);
	p.yz = rotate(p.yz, phi);
	p.xy = rotate(p.xy, -rot);
	
	switch (type) {
		case CAPSULE:
			{d = capsuleSDF(p, data[1][3], data[2]);} break;
		case CYLINDER:
			{d = cylinderSDF(p, data[1][3], data[2]);} break;
		case BOX:
		case CUBE:
			{d = boxSDF(p, data[2]);} break;
		case BOXFRAME:
			{d = boxFrameSDF(p, data[1][3], data[2]);} break;
		case DISH:
			{d = dishSDF(p, data[1][3], data[2]);} break;
		case ELLIPSE:
			{d = ellipsoidSDF(p, data[1][3], data[2]);} break;
		case FRACTAL:
			{d = fractalSDF(p, data[1][3], data[2], data[3]);} break;
		case GYROID:
			{d = gyroidSDF(p, data[1][3], data[2], data[3]);} break;
		case LINE:
			{d = lineSDF(p, data[1][3], data[2]);} break;
		case OCTAHEDRON:
			{d = octahedronSDF(p, data[1][3], data[2]);} break;
		case RING:
			{d = ringSDF(p, data[1][3], data[2]);} break;
		case PRISM_RHOMB:
		case PRISM_HEX:
		case PRISM_OCT: 
			{d = prismSDF(p, type, data[1][3], data[2]);} break;
		case SPHERE: 
			{d = sphereSDF(p, data[1][3]);} break;
		case SHELL:
			{d = shellSDF(p, data[1][3], data[2]);} break;
		case VOXEL:
			{d = voxelSDF(p, data[1][3], data[2], data[3]);} break;
		default:
			{d = 999.;} break;
	}
	if ((nature & N_ANTI) > 0) {
		d = -d;
	}
	if ((nature & N_FOG) > 0) {
		d = max(d, ray_nearDist - ray_minDist);
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
	int res = 1;
	switch (matType) {
		case M_COLOR: {
			applyColor(1, data0);
			res = 1;
		} break;
		
		case M_CONCRETE: {
			res = 1;
		} break;
		
		case M_NORMAL: {
			//theoretically this should work. try 0 -> stg if not
			vec3 norm = getNormal(stage[0].pos, stage[0].world, stage[0].closestInd);
			applyColor(1, vec4((norm + 1.) / 2., 1.));
			res = 1;
		} break;
		
		case M_RUBBER: {
			float localVal = mod(stage[stg].pos[0] + stage[stg].pos[2], 10.) - 5.;
			vec3 mult = vec3(4.0/255., 4.0/255., 4.8/255.);
			vec4 paint = vec4(vec3(47./255., 48./255., 66./255.) + localVal * mult, 1.0);
			applyColor(1, paint);
			res = 1;
		} break;
		
		case M_GLASS: {
			if (abs(stage[stg].localDist) < ray_minDist * 2.) {
				applyColorLight(stg, data0);
				stage[stg].localDist = ray_minDist * 2.;
			} else {
				stage[stg].localDist = -stage[stg].localDist;
			}
			res = 0;
		} break;

		case M_GHOST: {
			res = 1;
		} break;

		case M_PORTAL: {
			stage[stg].world = int(data1[0]);
			setStageRay(stg, stage[stg].pos + data0.xyz, stage[stg].dPos);
			stage[stg].distSinceBounce = 0.0;
			stage[stg].localDist = ray_minDist * 2.;
			res = 0;
		} break;
		case M_MIRROR: {
			if (stage[stg].distSinceBounce < 0.5) {
				break;
			}
			applyColor(stg, data0);
			if (stg == 0) {
				vec3 incident = stage[stg].dPos;
				vec3 normal = getNormal(stage[stg].pos, stage[stg].world, stage[stg].closestInd);
				//vec3 normal = normalize(vec3(-1, -1, -1));
				float product = dot(incident, normal);
				setStageRay(stg, stage[stg].pos, incident - 2. * normal * product);
				res = int(stage[stg].color.a >= 1. || bounceCount > ray_maxBounces);
			} else {
				res = 1;
			}
			stage[stg].distSinceBounce = 0.0;
			stage[stg].localDist = ray_minDist * 2.;
		} break;
		default: {
			res = 1;
		} break;
	}
	return res;
}

void applyNearEffect(int stg, int matType, vec4 data0, vec4 data1, vec4 data2) {
	switch (matType) {
		//color
		default:
			break;
		//ghost
		case M_GHOST: {
			if (stg == 0) {
				applyColor(stg, data0);
			}
		} return;
	}
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

/*idea: 
	if you have a pointer to the next node in an in-order traversal, you can traverse the binary tree without a stack.
	since we only ever do a specific traversal, this is further optimized to (nextNode->right), rather than just (nextNode)
	this is known as the Skip Pointer.
	This is about 1.5 times as fast as the version with the stack.
*/
void calcSceneObjs(int stg) {
	//set up array
	int numObjs = objIndices[obj_maxNum - 1];
	for (int o=0; o<numObjs; o++) {
		objIndices[o] = -1;
	}
	objIndices[obj_maxNum - 1] = 0;
	numObjs = 0;
	
	//traverse tree
	int currNode = 0;
	//there are 2*objs nodes in the tree. At maximum, we explore every one of them
	int len = 2 * w_objCount(stage[stg].world);
	int explored = 0;
	for (int f=0; f<len; f++) {
		//valid node checks
		if (currNode < 0) {
			break;
		}
		explored += 1;
		vec4 data0 = texelFetch(uUniverseBVHs, ivec2(currNode, 2 * stage[stg].world), 0);
		vec4 data1 = texelFetch(uUniverseBVHs, ivec2(currNode, 2 * stage[stg].world + 1), 0);
		if (data1[3] == fencepost) {
			break;
		}
		
		//evaluate using slab test
		bool isIn = intersects(stage[stg].pos, stage[stg].dPos, data0.xyz, data1.xyz);
		bool hasChildren = (data0[3] == -1.);
		
		//in current node?
		if (isIn) {
			//if the node does not have children, put it in the objs array
			if (!hasChildren) {
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
				//go to skip pointer
				currNode = int(data1[3]);
			} else {
				//go to left child
				currNode = 2 * currNode + 1;
			}
		} else {
			//not in current node? go to skip pointer
			currNode = int(data1[3]);
		}
	}

	//return array with length info encoded
	objIndices[obj_maxNum - 1] = numObjs;
}

//from inigo quilez - smoothly blends between the minimum of two function outputs. 
//k is the range within which values will blend.
//note: d1 and d2 are interchangable
float smoothMin(float d1, float d2, float k) {
	k *= 16.0/3.0;
	float h = max(k - abs(d1 - d2), 0.) / k;
	return min(d1, d2) - h*h*h * (4. - h) * (k / 16.);
}

float applyDist(int stg, float oldDist, float newDist, int nature, int index) {
	if ((nature & N_FOG) > 0) {
		nature ^= N_FOG;
	}

	if (nature == N_NORMAL) {
		if (newDist < oldDist) {
			stage[stg].closestInd = index;
			return newDist;
		}
		return oldDist;
	}
	
	if ((nature & N_GLOOPY) > 0) {
		float trueNewDist = smoothMin(oldDist, newDist, ray_nearDist / 2.);
		if (trueNewDist < oldDist - ray_minDist / 2.) {
			stage[stg].closestInd = index;
			return trueNewDist;
		}
	}
	if ((nature & N_ANTI) > 0) {
		newDist = -newDist;
		if (newDist < ray_minDist) {
			newDist = min(newDist, -ray_minDist);
		}
		float trueNewDist = max(oldDist, -newDist);
		if (trueNewDist != oldDist) {
			stage[stg].closestInd = index;
			return trueNewDist;
		}
	}
	return oldDist;
}

float sceneSDF(vec3 p, int stg) {
	int objCount = objIndices[obj_maxNum - 1];
	float sceneDist = 9999999.;
	
	for(int i=0; i<objCount; i++) {
		float d = objSDF(p, stage[stg].world, objIndices[i]);
		int nature = int(texelFetch(uUniverseTex, ivec3(objIndices[i], 0, stage[stg].world), 0)[1]);
		// float d = objSDF(p, stage[stg].world, i);
		
		sceneDist = applyDist(stg, sceneDist, d, nature, objIndices[i]);
	}
	
	return sceneDist;
}


float sceneSDF_naive(vec3 p, int stg) {
	int objCount = w_objCount(stage[stg].world);
	float minDist = 1e9;
	
	for(int i=0; i<objCount; i++) {
		float d = objSDF(p, stage[stg].world, i);
		
		if(d < minDist) {
			minDist = d;
			stage[stg].closestInd = i;
		}
	}
	
	return minDist;
}


// Raymarching steps

int matType(int world, int id) {
	float bits = texelFetch(uUniverseTex, ivec3(id, 0, world), 0)[0];
	return (floatBitsToInt(bits) >> 16);
}

void raymarch() {
	for(int i=0; i<ray_maxIters; i++) {
		// vec3 p = startP + dPos * totalDist;
		stage[0].iters = i;
		stage[0].localDist = sceneSDF(stage[0].pos, 0);

		if (stage[0].localDist < ray_nearDist) {
			mat4 matDat = matData(stage[0].world, stage[0].closestInd);
			int type = matType(stage[0].world, stage[0].closestInd);
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
		stage[0].distSinceBounce += stage[0].localDist;
		stage[0].pos += stage[0].localDist * stage[0].dPos;
		if(stage[0].totalDist > ray_maxDist || stage[0].color.a > 0.99) {
			return;
		}
	}
}

void shadow() {
	float result = 1.0;
	stage[1].totalDist = 0.02;
	int count = 80;
	for(int i=0; i<count; i++) {
		stage[1].iters = i;
		stage[1].localDist = sceneSDF(stage[1].pos, 1);
		int res = 0;
		
		if (stage[1].localDist < ray_minDist) {
			mat4 matDat = matData(stage[1].world, stage[1].closestInd);
			int type = matType(stage[1].world, stage[1].closestInd);
			res = applyHitEffect(1, type, matDat[0], matDat[1], matDat[2]);
			
		}
		
		float shadowTolerance = min(stage[1].totalDist, 80.);
		result = min(result, 4.0 * (stage[1].localDist / shadowTolerance));
		
		stage[1].localDist = max(stage[1].localDist, ray_minDist);
		stage[1].totalDist += stage[1].localDist;
		stage[1].pos += stage[1].dPos * stage[1].localDist;
		//potentially add t cutoff here (far away objects won't cast shadows)
		if (res > 0) {
			result = 0.0;
			break;
		}
		applyPreEffects(1);
	}
	//quantize shadows for cell shading effect
	if (result > 0.) {
		result = max(result, (1.1 / render_shadowSteps));
	}
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
	// outColor = vec4(stage[0].color.rgb, 1.0);
	// return;
	
	// stage 1
	if (stage[0].totalDist < ray_maxDist && stage[0].iters + 1 < ray_maxIters) {
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
	
	// vec3 lightMix = stage[0].color.rgb + stage[1].color.rgb;
	// float rescale = max(max(lightMix.r, lightMix.g), lightMix.b);
	// outColor = vec4(lightMix * rescale, 1.0);
	
	// gradient postEffect:
	// applyColor(0, vec4(0.1, 0.2, 0.3 + stage[1].dPos[1] * 0.7, 1.0));
	
	//send to screem
	outColor = vec4(stage[0].color.rgb, 1.0);
	// outColor = vec4(float(bounceCount) / 20., stage[0].color.g, 0.0, 1.0);
	// outColor = vec4(stage[0].totalDist / 19999999., stage[1].totalDist / 255., 0.5, 1.0);
	// outColor = vec4(vec3(uTime / 255., 0., 0.), 1.0);
}