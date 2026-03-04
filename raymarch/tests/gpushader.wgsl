//https://surma.dev/things/webgpu/

@group(0) @binding(0) var<uniform> gridDims: vec2f;
@group(0) @binding(1) var<storage> gridOffset: array<u32>;
@group(0) @binding(2) var<storage> cameraProps: array<f32>;

struct Object {
	// sphere=0, box=1, etc
	class: u32,
	material: u32,
	position: vec3<f32>,
	// radius or box size etc
	param0: vec4<f32>,
	// extra data if needed
	param1: vec4<f32>,
};

#define RAY_MAXBOUNCE = 10;

struct VertexData {
	@builtin(position) pos: vec4<f32>,
	@location(0) cellPos: vec2<f32>,
}
	
//helper functions
fn rotate(pos: vec2<f32>, theta: f32) -> vec2<f32> {
	let sres = sin(theta);
	let cres = cos(theta);
	return vec2<f32>(
		pos.x * cres - pos.y * sres,
		pos.y * cres + pos.x * cres
	);
}

fn polToCart(theta: f32, phi: f32, r: f32) -> vec3<f32> {
	return vec3<f32>(
	
	);
}








// Your shader code will go here
@vertex
fn vertexMain(@location(0) pos: vec2f, @builtin(instance_index) ind: u32) -> VertexData {

	let i = f32(ind);
	let cell = vec2f(i % gridDims.x, floor(i / gridDims.x));
	let cellOffset = cell / gridDims * 2;
	let gridPos = (pos + 1) / gridDims - 1 + cellOffset;
	
	var out: VertexData;
	out.pos = vec4f(gridPos.x, gridPos.y, 0, 1);
	out.cellPos = vec2f(cell);
	return out;
}



@fragment
fn fragmentMain(input: VertexData) -> @location(0) vec4f {
	let cPos = vec3<f32>(cameraProps[0], cameraProps[1], cameraProps[2]);
	let cTheta = cameraProps[3];
	let cPhi = cameraProps[4];



	return vec4f(
		(0.7 + (input.cellPos.x + f32(gridOffset[0])) / 100) % 1, 0, 
		(0.7 + (input.cellPos.y + f32(gridOffset[1])) / 100) % 1, 1);
}