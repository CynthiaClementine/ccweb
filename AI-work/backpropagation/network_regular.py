
import math
import random
import copy

#this is an adaptation of the javascript version of my network class.
#For more comments, see that one.
class Network:
	def __init__(self, layerParams, weightsOPTIONAL, biasesOPTIONAL):
		#network properties
		self.layerParams = layerParams
		self.network = []
		self.trainRate = 0.1
		self.createNetwork(weightsOPTIONAL, biasesOPTIONAL)

	def createNetwork(self, weights, biases):
		self.network = []

		for l in range(1, len(self.layerParams)):
			self.network.append([])

			for a in range(self.layerParams[l]):
				weightList = []

				for g in range(self.layerParams[l-1]):
					weightList.append((random.random() * 2 - 1) if (weights == None) else weights[l-1][a][g])

				self.network[l-1].append({
					'w': weightList,
					'b': (random.random() * 2 - 1) if (biases == None) else biases[l-1][a]
				})

	def evaluate(self, inputs):
		newValues = []

		for l in range(len(self.network)):
			newValues = []
			for m in range(len(self.network[l])):
				nowNode = self.network[l][m]
				newValues.append(nowNode['b'])

				for p in range(len(nowNode['w'])):
					newValues[m] += inputs[p] * nowNode['w'][p]
				newValues[m] = sigmoid(newValues[m])

			inputs = newValues
		return newValues

	def evaluateLoss(self, inputs, outputs):
		loss = 0
		thinkOutput = self.evaluate(inputs)

		for g in range(len(outputs)):
			loss += 0.5 * (outputs[g] - thinkOutput[g]) ** 2

		return loss

	def exportNetwork(self):
		#gotta make a copy of the network for all weights + biases, essentially
		weights = copy.deepcopy(self.network)
		biases = copy.deepcopy(self.network)

		for l in range(len(self.network)):
			for n in range(len(self.network[l])):
				weights[l][n] = weights[l][n]['w']
				biases[l][n] = biases[l][n]['b']
		
		return {
			'w': weights,
			'b': biases
		}

	def trainOnce(self, inputs, expectedOutputs):
		xValues = []
		aValues = [inputs]
		newValues = []
		newXs = []

		for l in range(len(self.network)):
			newValues = []
			newXs = []
			for m in range(len(self.network[l])):
				nowNode = self.network[l][m]
				newXs.append(nowNode['b'])
				for p in range(len(nowNode['w'])):
					newXs[m] += inputs[p] * nowNode['w'][p]

				newValues.append(sigmoid(newXs[m]))

			inputs = newValues
			xValues.append(newXs)
			aValues.append(newValues)

		frontError = []
		currentError = []

		applyNet = copy.deepcopy(self.network)

		for n in range(len(newValues)):
			neuronRef = self.network[len(self.network)-1][n]
			neuronRef2 = applyNet[len(self.network)-1][n]

			frontError.append(expectedOutputs[n] - newValues[n])

			neuronDelta = self.trainRate * frontError[n] * sigmoidAnti(xValues[len(xValues)-1][n])
			for w in range(len(neuronRef['w'])):
				neuronRef2['w'][w] += neuronDelta * aValues[len(self.network)-1][w]
			neuronRef2['b'] += neuronDelta

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

		self.network = applyNet


def sigmoid(x):
	return 1 / (1 + math.e ** -x)

def sigmoidAnti(x):
	return sigmoid(x) * (1 - sigmoid(x))




#test cases
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

testNet.trainRate = 0.1
print(testNet.evaluate(testSet[0]))
print(testNet.evaluateLoss(*testSet))
testNet.trainOnce(*testSet)
print(testNet.evaluateLoss(*testSet))