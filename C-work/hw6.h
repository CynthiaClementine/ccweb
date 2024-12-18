#ifndef HW6_H
#define HW6_H

/* Constant definitions */


#define MAX_FILE_LEN   (50)
#define MAX_STOPS      (500)
#define MAX_NAME_SIZE  (50)
#define MAX_LOC_SIZE   (30)
#define MAX_BUF_SIZE   (600)
#define MAX_LINKS      (10)

typedef struct stop {
    char name[MAX_NAME_SIZE];
    char location[MAX_LOC_SIZE];
    char links[MAX_LINKS][MAX_NAME_SIZE];
    int bus_frequency[MAX_LINKS];
} stop_t;


/* Function prototypes */

int read_stops(char *);
int find_hubs();

/* Global variables */

extern int g_stop_count;
extern stop_t g_stop_array[MAX_STOPS];

/* Error codes */

#define FILE_READ_ERR      (-1)
#define BAD_RECORD         (-2)
#define TOO_MUCH_DATA      (-3)
#define NO_DATA            (-4)
#define NOT_FOUND          (-5)
#define DUPLICATE_NAMES    (-6)

#endif // HW6_H
