
import math
import sys

sys.path.append("/usr/local/lib/python3.9/site-packages")
import numpy as np


#A version of my network class that uses numpy arrays instead of python structures
class Network:
	def __init__(self, layerParams, weightsOPTIONAL, biasesOPTIONAL):
		#network properties
		self.layerParams = layerParams
		self.netWeights = []
		self.netBiases = []
		self.trainRate = 0.1
		self.createNetwork(weightsOPTIONAL, biasesOPTIONAL)

	def createNetwork(self, weights, biases):
		for l in range(1, len(self.layerParams)):
			self.netWeights.append([])

			#biases for the layer
			if (biases != None):
				self.netBiases.append(np.array(biases[l-1]))
			else:
				self.netBiases.append(np.array(2 * np.random.random(self.layerParams[l-1]) - 1))


			#weights for the layer
			#if the weights are pre-supplied, everything's good, and you just need to remember that across = changing the weight source, while down = changing the weight destination
			if (weights != None):
				self.netWeights[len(self.netWeights)-1] = np.array(weights[l-1])
			else:
				self.netWeights[len(self.netWeights)-1] = np.array(np.random.rand(self.layerParams[l], self.layerParams[l-1]))

		#convert all the populated layers into an array, for quicker access
		self.netWeights = np.array(self.netWeights)
		self.netBiases = np.array(self.netBiases)

	def evaluate(self, inputs):
		#if the inputs are treated as a matrix, then creating the outputs is as simple as doing a matrix multiplication and adding biases
		for l in range(len(self.netWeights)):
			inputs = vigmoid((self.netWeights[l] @ inputs) + self.netBiases[l])
		return inputs

	def evaluateLoss(self, inputs, outputs):
		thinkOutput = self.evaluate(inputs)
		return np.sum(0.5 * (np.array(outputs) - thinkOutput) ** 2)

	def exportNetwork(self):
		#I want to be consistient between versions, so this exports to an object
		return {
			#multiply by 1 to make a copy
			'w': self.netWeights * 1,
			'b': self.netBiases * 1,
		}

	def trainOnce(self, inputs, expectedOutputs):
		expectedOutputs = np.array(expectedOutputs)
		bufferX = inputs
		bufferA = []

		xValues = []
		aValues = [inputs]
		newValues = []

		#forward propogation
		for l in range(len(self.netWeights)):
			bufferX = (self.netWeights[l] @ bufferX) + self.netBiases[l]
			bufferA = vigmoid(bufferX)
			xValues.append(bufferX)
			aValues.append(bufferA)

		frontError = []
		currentError = []

		#again, multiplying by 1 to make a copy
		applyWeights = self.netWeights * 1
		applyBiases = self.netBiases * 1

		#for the last layer
		frontError = expectedOutputs - bufferA
		neuronDeltas = self.trainRate * frontError * vigmoidAnti(bufferX)

		#CONSTRUCT MULTIPLY MATRIX HERE
		#neuron deltas change going down, pull-from a-values change going across
		matrixDeltas = []
		for s in range(len(bufferA)):
			#since neuron deltas are already in a list, the delta matrix is created sideways and then transposed
			matrixDeltas.append(neuronDeltas * 1)
		matrixDeltas = np.transpose(np.array(matrixDeltas))
		for q in range(len(matrixDeltas)):
			matrixDeltas[q] *= bufferA

		applyWeights[len(self.netWeights)-1] += np.array(matrixDeltas)
		applyBiases[len(self.netBiases)-1] += neuronDeltas


		#for all the other layers
		

		for k in range(len(self.network)-2, -1, -1):
			for n in range(len(self.network[k])):
				neuronRef = self.network[k][n]
				neuronRef2 = applyNet[k][n]

				currentError.append(0)
				for p in range(len(self.network[k+1])):
					currentError[n] += frontError[p] * sigmoidAnti(xValues[k+1][p]) * self.network[k+1][p]['w'][n]

				neuronDelta = self.trainRate * currentError[n] * sigmoidAnti(xValues[k][n])
				for w in range(len(neuronRef['w'])):
					neuronRef2['w'][w] += neuronDelta * aValues[k][w]
				neuronRef2['b'] += neuronDelta
			
			frontError = currentError
			currentError = []

		self.netWeights = applyWeights
		self.netBiases = applyBiases


def sigmoid(x):
	#I didn't feel like importing math for this one constant. It's e. don't worry about it.
	return 1 / (1 + 2.718281828459045235 ** -x)

def sigmoidAnti(x):
	return sigmoid(x) * (1 - sigmoid(x))

vigmoid = np.vectorize(sigmoid)
vigmoidAnti = np.vectorize(sigmoidAnti)

testNet = Network([2, 2, 2], 
	[[[1, 1],
	[-0.5, 0.5]], 

	[[1, -1], 
	[2, -2]]], 
	
	[[1, -1], 
	 [-0.5, 0.5]
	])

testSet = [
	[2, 3],
	[0.8, 1]
]

testSet2 = [
	[1, 4],
	[3, -1]
]

print("starting")
# print(np.array(testSet) * np.array(testSet2))
testNet.trainRate = 0.1
print(testNet.evaluate(testSet[0]))
print(testNet.evaluateLoss(*testSet))
testNet.trainOnce(*testSet)
print(testNet.evaluateLoss(*testSet))