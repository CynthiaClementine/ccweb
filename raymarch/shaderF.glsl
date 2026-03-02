#version 300 es

#define ray_maxIters 256
#define ray_maxDist 100.0
#define ray_minDist 0.02
#define render_shadowSteps 2.
#define obj_maxNum 512

precision highp float;

out vec4 outColor;
in vec2 vUV;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform int uObjectCount;

uniform sampler2D uSceneTex;




vec4 color = vec4(0, 0, 0, 0);


struct Raydata {
	int hitMode;
	int closestInd;
	float totalDist;
	float stepDist;
	vec3 pos;
	vec3 dPos;
	vec4 color;
};

Raydata stage[2] = Raydata[2](
	Raydata(0, 0, 0.0, 0.0, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec4(0., 0., 0., 0.)),
	Raydata(0, 0, 0.0, 0.0, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec4(0.1, 0.1, 0.1, 0.1))
);




// vec4 loadObject(int index, int row) {
// 	return texelFetch(uSceneTex, ivec2(index, row), 0);
// }


//SDFs
float sphereSDF(vec3 point, vec4 data1, vec4 data2) {
	return length(point - data1.xyz) - data2[0];
}

float boxSDF(vec3 point, vec4 data1, vec4 data2) {
	vec3 q = abs(point - data1.xyz) - data2.xyz;
	return length(max(q, vec3(0.))) + min(max(q.x, max(q.y, q.z)), 0.);
}

float planeSDF(vec3 point, vec4 data1) {
	return point[1] - data1[2];
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
	vec4 data0 = texelFetch(uSceneTex, ivec2(index,0), 0);
	vec4 data1 = texelFetch(uSceneTex, ivec2(index,1), 0);
	vec4 data2 = texelFetch(uSceneTex, ivec2(index,2), 0);
	vec4 data3 = texelFetch(uSceneTex, ivec2(index,3), 0);
	return mat4(data0, data1, data2, data3);
}


float objSDF(vec3 p, int index) {
	mat4 data = objData(index);
	
	int type = int(data[0][0]);
	float d = 9999.;
	switch (type) {
		case 10: {d = sphereSDF(p, data[1], data[2]);
				// stage[1].color[1] = data[1][0] / 4.0;
			}
			break;
		case 11: {
				d = boxSDF(p, data[1], data[2]);
			}
			break;
		default: {d = 9999.;}
			break;
	}
	return d;
}


float sceneSDF(vec3 p, int stg) {
	float minDist = 1e9;
	
	for(int i=0; i<obj_maxNum; i++) {
		if (i >= uObjectCount) {
			return minDist;
		}
		
		float d = objSDF(p, i);
		
		if(d < minDist) {
			minDist = d;
			stage[stg].closestInd = i;
		}
	}
	
	return minDist;
}

vec3 getNormal(vec3 p, int objIndex, int stage) {
	float d = sceneSDF(p, stage);
	vec2 e = vec2(0.001, 0);
	vec3 n = d - vec3(
		sceneSDF(p + e.xyy, stage),
		sceneSDF(p + e.yxy, stage),
		sceneSDF(p + e.yyx, stage)
	);
	return normalize(n);
}



// Raymarching steps

void raymarch() {
	for(int i=0; i<ray_maxIters; i++) {
		// vec3 p = startP + dPos * totalDist;
		stage[0].stepDist = max(sceneSDF(stage[0].pos, 0), 0.0);
		
		//if (i == ray_maxIters - 1) {
		//stage[1].color = vec4(float(uObjectCount) / 10., stage[0].stepDist / 20000., 0.1, 1.0);
		//}
		
		//TODO: do some material effect in here when there are materials
		
		stage[0].totalDist += stage[0].stepDist;
		stage[0].pos += stage[0].stepDist * stage[0].dPos;
		if(stage[0].totalDist > ray_maxDist || stage[0].stepDist < ray_minDist) {
			return;
		}
	}
}

void shadow() {
	float result = 1.0;
	stage[1].totalDist = 0.02;
	for(int i=0; i<40; i++) {
		float h = sceneSDF(stage[1].pos, 1);
		result = min(result, 8.0 * (h / stage[1].totalDist));
		
		stage[1].stepDist = clamp(h, 0.02, 1.0);
		stage[1].totalDist += stage[1].stepDist;
		stage[1].pos += stage[1].dPos * stage[1].stepDist;
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
	
	raymarch();
	if (stage[0].totalDist < ray_maxDist) {
		//it's hit an object
		mat4 hitData = objData(stage[0].closestInd);
		stage[1].color = vec4(hitData[0].gba, 1.0);
		
		vec3 sunVec = normalize(vec3(5.0, 8.0, 0.0));
		vec3 normal = getNormal(stage[0].pos, stage[0].closestInd, 1);
		stage[1].pos = stage[0].pos + normal * 0.01;
		stage[1].dPos = sunVec;
		// shadow();
	}
	
	stage[1].color[2] = abs(stage[0].dPos[1]);
	
	mat4 dat = objData(stage[0].closestInd);
	//stage[1].color = vec4(dat[0].gba, 1.0);
	
	// vec3 lightMix = stage[0].color.rgb + stage[1].color.rgb;
	// float rescale = max(max(lightMix.r, lightMix.g), lightMix.b);
	// outColor = vec4(lightMix * rescale, 1.0);
	
	// outColor = vec4(stage[1].color.rgb, 1.0);
	outColor = vec4(stage[1].color.rgb, 1.0);
	// vec4 test = texelFetch(uSceneTex, ivec2(0,0), 0);
	// outColor = vec4(test.xyz / 20., 1.0);
}