window.onload = setup;

//following this tutorial: https://codelabs.developers.google.com/your-first-webgpu-app

var canvas;
var ctx;
var canvasFormat;
var gpu_encoder;
var gpu_device;
var gpu_pipeline;
var gpu_bindGroup;

var gridSize = 300;
var gridOffsets;
var gridOffsetBuffer;

var vertices;
var vertexBuffer;

var cameraProps;
var cameraPropBuffer;

async function setup() {
	console.log('started setup');
	canvas = document.querySelector("canvas");
	// Your WebGPU code will begin here!
	if (!navigator.gpu) {
		throw new Error("WebGPU not supported on this browser.");
	}
	
	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) {
		throw new Error("No appropriate GPUAdapter found.");
	}
	
	gpu_device = await adapter.requestDevice();
	
	ctx = canvas.getContext("webgpu");
	canvasFormat = navigator.gpu.getPreferredCanvasFormat();
	ctx.configure({
		device: gpu_device,
		format: canvasFormat,
	});
	
	
	
	/*buffers are opaque: 
		you cannot easily inspect the data
		you cannot resize the data
	you can:
		change the contents, using device.queue.writeBuffer()
	*/
	vertices = new Float32Array([
		//top triangle
		-1, -1,
		-1,	1,
		 1,	1, 
		
		//bottom triangle
		-1, -1,
		 1,	1, 
		 1, -1,
	]);
	for (var f=0; f<vertices.length; f++) {
		vertices[f] *= 0.8;
	}
	vertexBuffer = gpu_device.createBuffer({
		label: "cellAndSuch",
		size: vertices.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
	});
	gpu_device.queue.writeBuffer(vertexBuffer, 0, vertices);
	
	const uniformArray = new Float32Array([gridSize, gridSize]);
	const uniformBuffer = gpu_device.createBuffer({
		label: "Grid Uniforms",
		size: uniformArray.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
	gpu_device.queue.writeBuffer(uniformBuffer, 0, uniformArray);
	
	gridOffsets = new Uint32Array(4);
	gridOffsetBuffer = gpu_device.createBuffer({
		label: "Grid Offset",
		size: gridOffsets.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});
	gpu_device.queue.writeBuffer(gridOffsetBuffer, 0, gridOffsets);

	cameraProps = new Float32Array(5);
	cameraPropBuffer = gpu_device.createBuffer({
		label: `camera data`,
		size: cameraProps.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});
	gpu_device.queue.writeBuffer(cameraPropBuffer, 0, cameraProps);
	
	
	const vertexBufferLayout = {
		arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
		attributes: [{
			format: "float32x2",
			offset: 0,
			shaderLocation: 0, // Position, see vertex shader
		}],
	};
	
	
	const cellShaderModule = await loadShaderURL(gpu_device, `Cell Shader`, `./gpushader.wgsl`);
	
	gpu_pipeline = gpu_device.createRenderPipeline({
		label: "Cell pipeline",
		layout: "auto",
		vertex: {
			module: cellShaderModule,
			entryPoint: "vertexMain",
			buffers: [vertexBufferLayout]
		},
		fragment: {
			module: cellShaderModule,
			entryPoint: "fragmentMain",
			targets: [{
				format: canvasFormat
			}]
		}
	});
	
	gpu_bindGroup = gpu_device.createBindGroup({
		label: "Cell renderer bind group",
		layout: gpu_pipeline.getBindGroupLayout(0),
		entries: [{
			binding: 0,
			resource: {buffer: uniformBuffer}
		}, {
			binding: 1,
			resource: {buffer: gridOffsetBuffer}
		}, {
			binding: 2,
			resource: {buffer: cameraPropBuffer}
		}],
	});
	
	feedGPU();

	window.setTimeout(main, 10);
}

function main() {
	gridOffsets[0] += 1;
	gpu_device.queue.writeBuffer(gridOffsetBuffer, 0, gridOffsets);
	feedGPU();

	window.setTimeout(main, 5);
}

function feedGPU() {
	gpu_encoder = gpu_device.createCommandEncoder();
	
	const pass = gpu_encoder.beginRenderPass({
		colorAttachments: [{
			view: ctx.getCurrentTexture().createView(),
			loadOp: "clear",
			clearValue: { r: 0.1, g: 0, b: 0.4, a: 1 },
			storeOp: "store",
		}]
	});
	
	pass.setPipeline(gpu_pipeline);
	pass.setVertexBuffer(0, vertexBuffer);
	pass.setBindGroup(0, gpu_bindGroup);
	pass.draw(vertices.length / 2, gridSize * gridSize);
	pass.end();

	gpu_device.queue.submit([gpu_encoder.finish()]);
}



function getShader() {
}

async function loadShaderURL(device, label, url) {
	const code = await (await fetch(url)).text();
	return device.createShaderModule({
		label: label,
		code: code
	});
}

