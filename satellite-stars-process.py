import math
# from decimal import Decimal

starDat = []
magThresh = 6.1

def radians(x):
    return (x * math.pi / 180)



#import
#https://www.kaggle.com/datasets/konivat/hipparcos-star-catalog?resource=download
with open("hipparcos-voidmain.csv") as file:
    lines = file.readlines()
    first = True
    print(lines[0])

    for line in lines:
        split = line.split(",")
        if not first:
            try:
                if (float(split[5]) < magThresh):
                        starDat.append([float(split[8]), float(split[9]), float(split[5])])
            except:
                pass
        else:
            first = False


#export
with open("stars-clean.txt", "w") as outFile:
    output = "["

    count = 0
    for star in starDat:
        count += 1
        output += "["+str(round(star[0], 3))+","+str(round(star[1], 3))+","+str(star[2])+"],"

        if (count % 8 == 0):
            output += "\n"


    output += "]"
    outFile.write(output)