#NAME: [redacted]
#DATE: June-5-2022

import math
import random
import copy
import sys

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

		applyNet = self.network#copy.deepcopy(self.network)

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

def constructCircleData(fileName):
	data = []
	with open(fileName) as reading:
		for line in reading:
			sp = line.split(" ")
			xCoord = float(sp[0])
			yCoord = float(sp[1])

			data.append([[xCoord, yCoord], [int((xCoord ** 2 + yCoord ** 2) ** 0.5 <= 1)]])


	return data


sumTrainData = [
	[[0, 0], [0, 0]],
	[[0, 1], [0, 1]],
	[[1, 0], [0, 1]],
	[[1, 1], [1, 0]]
]

circleTrainData = constructCircleData("10000_pairs.txt")
errorTolerance = 0.01
epochs = 0



#if it's sum mode
if (sys.argv[1] == "S"):
	network = Network([2, 2, 2], None, None)
	network.trainRate = 1.5
	networkError = 1e8
	#train for a while™
	while (networkError > 0 and epochs < 220001):
		networkError = 0
		# if (epochs == 50000):
		# 	trainRate = 0.5
		# if (epochs == 100000):
		# 	trainRate = 1
		# if (epochs == 150000):
		# 	trainRate = 5


		for item in sumTrainData:
			networkOut = network.evaluate(item[0])
			#specifications do say every epoch but that's just too much console spam
			if (epochs % 20 == 0):
				print("{:.8f}\t{:.8f}".format(networkOut[0], networkOut[1]))

			networkError += (networkOut[0] - item[1][0]) ** 2 + (networkOut[1] - item[1][1]) ** 2
			network.trainOnce(*item)
		networkError *= 0.5
		
		#little log statement
		if (epochs % 20 == 0):
			print("Epoch {}: Loss = {}".format(epochs, networkError))

		epochs += 1



#if it's circle mode
if (sys.argv[1] == "C"):
	network = Network([2, 4, 1], None, None)
	networkError = 1e8

	#basically same process but with rounding and more logging
	while (networkError > 0 and epochs < 1000):
		networkError = 0
		correct = 0 
		for item in circleTrainData:
			networkOut = network.evaluate(item[0])[0]
			networkError += (networkOut - item[1][0]) ** 2

			network.trainOnce(*item)
		networkError *= 0.5

		#run again to see how many points are correct (no more training)
		for item in circleTrainData:
			correct += int(round(network.evaluate(item[0])[0]) == item[1][0])
		print("Epoch {}: {} / {} classified correctly, true error is {}.".format(epochs, correct, len(circleTrainData), networkError))

		epochs += 1