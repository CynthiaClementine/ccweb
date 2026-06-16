#version 300 es

in vec2 aPosition;
out vec2 vUV;

void main() {
	vUV = aPosition;
	gl_Position = vec4(aPosition, 0.0, 1.0);
}