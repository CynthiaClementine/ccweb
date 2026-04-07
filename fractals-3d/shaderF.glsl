#version 300 es

#define fencepost 4278259968.

#define ray_maxIters 500
#define ray_maxDist 5000.0
#define ray_nearDist 3.0
#define ray_minDist 0.15
#define render_shadowSteps 2.
#define obj_maxNum 500
//should be log2(obj_maxNum) + 1
//but that's too difficult for the compiler to figure out
#define bvh_maxNum 13

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

Raydata stage[2] = Raydata[2](
	Raydata(0, 0, 0.0, 0.0, 0, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec4(0., 0., 0., 0.)),
	Raydata(0, 0, 0.0, 0.0, 0, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec4(0.1, 0.1, 0.1, 0.1))
);

void setStageRay(int stg, vec3 newPos, vec3 newDPos) {
	stage[stg].pos = newPos;
	stage[stg].dPos = newDPos;
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
			applyColor(0, vec4(arg0, 0.0));
		} break;
		//bg_range
		case E_BG_RANGE: {
			if (stg > 0) {
				return;
			}
			applyColor(0, vec4(rand(arg0.r, data1.r), rand(arg0.g, data1.g), rand(arg0.b, data1.b), 0.0));
		} break;
		//bg_gradient
		case E_GRADIENT:
			break;
		//bg_fadeTo
		case E_FADE: {
			if (stg == 0) {
				return;
			}
			float distPerc = clamp(stage[0].totalDist / data1[0], 0.0, 0.9);
			stage[0].color.rgb = mix(stage[0].color.rgb, arg0.rgb, distPerc * distPerc);
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
				applyColor(0, vec4(mix(stage[0].color.rgb, arg0.rgb, dotted), 0.));
			}
		} break;
	}
}



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


float objSDF(vec3 p, int world, int index) {
	mat4 data = objData(world, index);
	
	int type = (floatBitsToInt(data[0][0]) & 0xFFFF);
	int nature = int(data[0][1]);
	int rotations = floatBitsToInt(data[0][2]);
	int theta = rotations       & 0x1FF;
	int phi = ((rotations >> 9 ) & 0x1FF) - 90;
	int rot = (rotations >> 18) & 0x1FF;
	float d = 9999.;
	
	//transform to object coordinates
	p -= data[1].xyz;
	p.xz = rotate(p.xz, -theta);
	p.yz = rotate(p.yz, phi);
	p.xy = rotate(p.xy, -rot);

	d = fractalSDF(p, data[1][3], data[2], data[3]);
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
		
		case M_NORMAL: {
			//theoretically this should work. try 0 -> stg if not
			vec3 norm = getNormal(stage[0].pos, stage[0].world, stage[0].closestInd);
			applyColor(1, vec4((norm + 1.) / 2., 1.));
			res = 1;
		} break;
		
		case M_GLASS: {
			if (abs(stage[stg].localDist) < ray_minDist * 2.) {
				applyColor(stg, data0);
				stage[stg].localDist = ray_minDist * 2.;
			} else {
				stage[stg].localDist = -stage[stg].localDist;
			}
			res = 0;
		} break;
	}
	return res;
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

//from inigo quilez - smoothly blends between the minimum of two function outputs. 
//k is the range within which values will blend.
//note: d1 and d2 are interchangable
float smoothMin(float d1, float d2, float k) {
	k *= 16.0/3.0;
	float h = max(k - abs(d1 - d2), 0.) / k;
	return min(d1, d2) - h*h*h * (4. - h) * (k / 16.);
}

float applyDist(int stg, float oldDist, float newDist, int nature, int index) {
	if (newDist < oldDist) {
		stage[stg].closestInd = index;
		return newDist;
	}
	return oldDist;
}

float sceneSDF(vec3 p, int stg) {
	//it's just the sdf for the fractal
	float sceneDist = 99999.;
	
	float d = objSDF(p, stage[stg].world, 0);
	sceneDist = applyDist(stg, sceneDist, d, 0, 0);
	
	return sceneDist;
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
			}
		}
		applyPreEffects(0);
		
		stage[0].totalDist += stage[0].localDist;
		stage[0].pos += stage[0].localDist * stage[0].dPos;
		if(stage[0].totalDist > ray_maxDist || stage[0].color.a > 1.) {
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

void main() {
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
	
	mat4 objDat = objData(stage[0].world, stage[0].closestInd);
	
	// vec3 lightMix = stage[0].color.rgb + stage[1].color.rgb;
	// float rescale = max(max(lightMix.r, lightMix.g), lightMix.b);
	// outColor = vec4(lightMix * rescale, 1.0);
	
	// gradient postEffect:
	// applyColor(0, vec4(0.1, 0.2, 0.3 + stage[1].dPos[1] * 0.7, 1.0));
	
	//send to screem
	outColor = vec4(stage[0].color.rgb, 1.0);
	// outColor = vec4(stage[0].totalDist / 19999999., stage[1].totalDist / 255., 0.5, 1.0);
	// outColor = vec4(vec3(uTime / 255., 0., 0.), 1.0);
}