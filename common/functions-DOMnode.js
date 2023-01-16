/*
functions for dealing with nodes in javascript
I have made the executive decision that all my svg functions will start with the character φ. Everyone will be upset but my functions will be short and cool (:
INDEX:

φAdd(node, attributes);
φCreate(node, attributes);
φGet(node, attributes);
φOver(node);
φSet(node, attributes)
*/
var baseNamespace = "http://www.w3.org/2000/svg";



//adds the attributes to the node's attributes
/**
 * Adds the values to the specified attribute or attributes of a node
 * @param {*} node 
 * @param {Object} attributes 
 */
 function φAdd(node, attributes) {
	for (var p in attributes) {
		node.setAttribute(p, +node.getAttribute(p) + +attributes[p]);
	}
}

//creates a node with specified attributes. Applies no extra attributes if left blank.
function φCreate(nodeType, nodeAttributes) {
	var node = document.createElementNS(baseNamespace, nodeType);
	
	if (nodeAttributes != undefined) {
		φSet(node, nodeAttributes);
	}

	return node;
}

/**
 * Returns the specified attribute or attributes of a node
 * @param {*} node the node to get attributes from
 * @param {String|Array<String>} attributes the attribute(s) to get
 */
function φGet(node, attributes) {
	if (attributes.constructor.name == "String") {
		return node.getAttribute(attributes);
	}

	return attributes.map(a => node.getAttribute(a));
}

function φSet(node, attributes) {
	//change the innerHTML because that's probably what the user wants
	if (attributes["innerHTML"] != undefined) {
		node.innerHTML = attributes["innerHTML"];
	}
	for (var p in attributes) {
		node.setAttribute(p, attributes[p]);
	}
}