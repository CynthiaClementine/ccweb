import time

def pad1(str, l, char):
    return "".join([char for x in range(0, l - len(str))]) + str

def pad2(str, l, char):
    i = len(str)
    while (i < l):
        str = char + str
        i += 1
    return str

arr = [10, 100, 1000, 10000]

for h in range(0, len(arr)-1):
    for l in range(0, arr[h]):
        t0 = time.time()
        pad1("helo", arr[l], " ")
        t1 = time.time()
        total = t1-t0
        print("{}: pad1 with {} took {}".format(arr[h], arr[l], total))

        t0 = time.time()
        pad2("helo", arr[l], " ")
        t1 = time.time()
        total = t1-t0
        print("{}: pad2 with {} took {}".format(arr[h], arr[l], total))
