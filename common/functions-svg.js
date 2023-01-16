//the svg library to work with 
var baseNamespace = "http://www.w3.org/2000/svg";

function createNode(nodeType, nodeAttributes) {
	var node = document.createElementNS(baseNamespace, nodeType);
	
	if (nodeAttributes != undefined) {
		setNodeAttributes(node, nodeAttributes);
	}

	return node;
}

function setNodeAttributes(node, attributes) {
	console.log(node);
	var propertyNames = Object.keys(attributes);
	propertyNames.forEach(n => {
		node.setAttribute(n, attributes[n]);
	});
}