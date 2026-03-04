@group(0) @binding(0) var<uniform> renderN: u32;
@group(0) @binding(1) var<storage> gridOffset: array<u32>;

struct VertexData {
	@builtin(position) pos: vec4f,
	@location(0) cellPos: vec2f,
}



// fn projectPerspective(x, ) {

// }

// fn project










// Your shader code will go here
@vertex
fn vertexMain(@location(0) pos: vec2<f32>, @builtin(instance_index) ind: u32) -> VertexData {

	let i = f32(ind);
	let n = f32(renderN);
	let cell = vec2f(i % n, floor(i / n));
	let cellOffset = cell / n * 2;
	let gridPos = (pos + 1) / n - 1 + cellOffset;
	
	var out: VertexData;
	out.pos = vec4f(gridPos.x, gridPos.y, 0, 1);
	out.cellPos = vec2f(cell);
	return out;
}



@fragment
fn fragmentMain(input: VertexData) -> @location(0) vec4<f32> {
	return vec4f(
		(0.7 + (input.cellPos.x + f32(gridOffset[0])) / 100) % 1, 0, 
		(0.7 + (input.cellPos.y + f32(gridOffset[1])) / 100) % 1, 1);
}