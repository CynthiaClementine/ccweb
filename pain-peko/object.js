
class Network {
	constructor(layerParams) {
		this.layerParams = layerParams;

		this.network = [];

		this.trainRate = 0.1;
	}

	//creates a child network with another network of the same size
	createChildWith(otherNetwork) {
		var child = new Network(this.layerParams);
		//half of the nodes in the child will come from self, half of them will come from the other parent
		for (var c=0; c<this.network.length; c++) {
			child.network.push([]);

			//create all the child nodes
			for (var d=0; d<this.network[c].length; d++) {
				//take from either self or the other parent
				var obj = (Math.random() > 0.5) ? this : otherNetwork;
				//make a copy of the parent's node to give to the child
				child.network[c][d] = copy(obj.network[c][d]);

				//chance of a mutation
				while (Math.random() > network_mutateRate) {
					//change either a weight or the bias, it'll be more likely to change a weight
					if (Math.random() > 1 / (child.network[c][d].w.length + 1)) {
						child.network[c][d].w[Math.floor(randomBounded(0, child.network[c][d].w.length-0.01))] += boolToSigned(Math.random() > 0.5) * network_changeAmount;
					} else {
						child.network[c][d].b += boolToSigned(Math.random() > 0.5) * network_changeAmount;
					}
				}
			}
		}
		return child;
	}

	createNetwork(weightsOPTIONAL, biasesOPTIONAL) {
		this.network = [];

		//create layers
		for (var l=1; l<this.layerParams.length; l++) {
			this.network.push([]);

			//create nodes in the network, the input layer isn't included because it isn't made of nodes
			for (var a=0; a<this.layerParams[l]; a++) {
				//each node has a set of weights and a set of biases. This determines how it filters data from the input nodes
				var weightList = [];

				for (var g=0; g<this.layerParams[l-1]; g++) {
					weightList[g] = (weightsOPTIONAL == undefined) ? randomBounded(-1, 1) : weightsOPTIONAL[l-1][a][g];
				}
				this.network[l-1][a] = {
					w: weightList,
					b: (biasesOPTIONAL == undefined) ? randomBounded(-1, 1) : biasesOPTIONAL[l-1][a]
				};
			}
		}
	}

	//takes in a list of inputs and outputs a list of outputs, according to the values in the network
	evaluate(inputs) {
		//go through, calculating layer by layer
		var newValues = [];
		
		//propogate through all layers
		for (var l=0; l<this.network.length; l++) {
			newValues = [];
			//calculate the values for each node
			for (var m=0; m<this.network[l].length; m++) {
				var nowNode = this.network[l][m];
				newValues[m] = nowNode.b;
				//have the value for the current node be a product of all the weights and biases in that node
				for (var p=0; p<nowNode.w.length; p++) {
					newValues[m] += inputs[p] * nowNode.w[p];
				}
				newValues[m] = sigmoid(newValues[m], 0, 1);
			}

			//now that the values for the layer have been calculated, shift over by one layer and start again
			inputs = newValues;
		}

		//when finished with the network, output the values
		return newValues;
	}

	//takes in a list of inputs and a list of expected outputs, and outputs a positive number corresponding to how far off of the correct output the network is.
	evaluateLoss(inputs, outputs) {
		var loss = 0;

		//find what self thinks
		var thinkOutput = this.evaluate(inputs);

		//loss is the difference between the two, over all output nodes
		for (var g=0; g<outputs.length; g++) {
			loss += (outputs[g] - thinkOutput[g]) ** 2;
		}

		return loss;
	}

	//exports self's data to a string
	exportNetwork() {
		return JSON.stringify(this.network);
	}

	importNetwork(networkData) {
		this.network = JSON.parse(networkData);
	}

	trainOnce(inputs, expectedOutputs) {
		//first run the network forwards and save the values in each layer
		var xValues = [];
		var aValues = [inputs];
		var newValues = [];
		var newXs = [];

		//same forward running as in the evaluate function
		for (var l=0; l<this.network.length; l++) {
			newValues = []
			newXs = [];
			for (var m=0; m<this.network[l].length; m++) {
				var nowNode = this.network[l][m];
				newXs[m] = nowNode.b;
				for (var p=0; p<nowNode.w.length; p++) {
					newXs[m] += inputs[p] * nowNode.w[p];
				}
				newValues[m] = sigmoid(newXs[m], 0, 1);
			}

			//now that the values for the layer have been calculated, shift over by one layer and start again
			inputs = newValues;
			xValues.push(newXs);
			aValues.push(newValues);
		}

		//after all that, we can calculate the error and run the network backwards to fix it
		var frontError = [];
		var currentError = [];
		var neuronRef;
		var neuronRef2;
		var neuronDelta;

		//Apply all changes to a new network so that error backpropogation isn't violated
		var applyNet = copy(this.network);

		for (var n=0; n<newValues.length; n++) {
			neuronRef = this.network[this.network.length-1][n];
			neuronRef2 = applyNet[this.network.length-1][n];

			//calculating error is easy (just expected - actual)
			frontError[n] = expectedOutputs[n] - newValues[n];

			//fix weights + biases
			neuronDelta = this.trainRate * frontError[n] * sigmoidAnti(xValues[xValues.length-1][n]);
			for (var w=0; w<neuronRef.w.length; w++) {
				neuronRef2.w[w] += neuronDelta * aValues[this.network.length-1][w];
			}
			neuronRef2.b += neuronDelta;
		}

		//for middle layers
		for (var k=this.network.length-2; k>-1; k--) {
			for (var n=0; n<this.network[k].length; n++) {
				neuronRef = this.network[k][n];
				neuronRef2 = applyNet[k][n];

				//calculating error
				currentError[n] = 0;
				for (var p=0; p<this.network[k+1].length; p++) {
					currentError[n] += frontError[p] * sigmoidAnti(xValues[k+1][p]) * this.network[k+1][p].w[n];
				}

				//fix weights + biases
				neuronDelta = this.trainRate * currentError[n] * sigmoidAnti(xValues[k][n]);
				for (var w=0; w<neuronRef.w.length; w++) {
					//aValues references the layer behind the current layer, but it also has an extra layer at the beginning (for inputs) so the reference is k instead of k-1
					neuronRef2.w[w] += neuronDelta * aValues[k][w];
				}
				neuronRef2.b += neuronDelta;
			}

			frontError = currentError;
			currentError = [];
		}

		//now that we're all done changing weights / biases, put the changes in self's network
		this.network = applyNet;
	}
}