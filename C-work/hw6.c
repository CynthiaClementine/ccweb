/* Add any includes here */
#include "hw6.h"
#include <stdio.h>
#include <assert.h>
#include <stddef.h>
#include <string.h>
#include <stdbool.h>

#define CENTRAL "Central"
#define CLOSE printf("[%s]", in_file); fclose(f); f = NULL;

/* Define any global variables here */
int g_stop_count = 0;
stop_t g_stop_array[MAX_STOPS] = {0};

//these functions initialize an array as {0} would, 
//except they apply to already-created arrays.
void zero_carr(char arr[], int len) {
  for (int d = 0; d < len; d++) {
    arr[d] = 0;
  }
}

void zero_iarr(int arr[], int len) {
  for (int d = 0; d < len; d++) {
    arr[d] = 0;
  }
}

/* takes in a stop name and tries to find it in the stops array. returns 1 if found and 0 if not.*/
int find_stop(char stop_name[MAX_NAME_SIZE]) {
  for (int h = 0; h < g_stop_count; h++) {
    if (!strcmp(g_stop_array[h].name, stop_name)) {
      return 1;
    }
  }
  return 0;
} /* find_stop() */


/* define read_stops() here:
read_stops takes in a file name, reads that file, and 
stores the stops in g_stop_array. it also updates g_stop_count.
It returns the number of stops read, or an error code
*/
int read_stops(char* in_file) {
  assert(in_file);
  printf("%s\n", in_file);

  //open file
  FILE* f = fopen(in_file, "r");
  if (!f) {
    printf("err - read\n\n");
    return FILE_READ_ERR;
  }

  //pre-read setup, error checking
  fseek(f, -1, SEEK_END);
  long len = ftell(f);
  fseek(f, 0, SEEK_SET);


  stop_t temp = {0};
  char buf[MAX_BUF_SIZE] = {0};
  int errorCode = 0;
  char return_something_please = '0';

  //actual reading
  while (ftell(f) < len) {
    //make sure not to over-read
    if (g_stop_count >= MAX_STOPS) {
      printf("err - too many stops\n\n");
      CLOSE return TOO_MUCH_DATA;
    }


    //print the line for logging purposes
    long spot = ftell(f);
    char buf2[1000] = {0};
    fscanf(f, "%[^\n]", buf2);
    long postspot = ftell(f);
    printf("\n~~\n%s\n~~\n", buf2);
    fseek(f, spot, SEEK_SET);

    if (postspot - spot > MAX_BUF_SIZE) {
      printf("stupid. hate this\n");
      CLOSE return BAD_RECORD;
    }

    //name
    zero_carr(temp.name, MAX_NAME_SIZE);
    errorCode = fscanf(f, "%[^$\n]", temp.name);
    if ((errorCode != 1) || (temp.name[sizeof(temp.name)-1] != '\0')) {
      printf("err - bad 1\n\n");
      CLOSE return BAD_RECORD;
    }
    errorCode = fscanf(f, "%[$]", &return_something_please);
    if (errorCode != 1) {
      printf("err - yeap\n");
      CLOSE return BAD_RECORD;
    }

    //real quick check if the name is a duplicate
    printf("new name: %s\n", temp.name);
    if (find_stop(temp.name)) {
      printf("err - duplicate\n\n");
      CLOSE return DUPLICATE_NAMES;
    }

    //location
    zero_carr(buf, MAX_BUF_SIZE);
    errorCode = fscanf(f, "%[^$]$", buf);
    if (errorCode != 1) {
      printf("err - bad 2\n\n");
      CLOSE return BAD_RECORD;
    }

    strncpy(temp.location, buf, MAX_LOC_SIZE - 1);

    //links
    int current_link = 0;
    int current_freq = 0;
    for (int f = 0; f < MAX_LINKS; f++) {
      zero_carr(temp.links[f], MAX_NAME_SIZE);
    }

    while (fscanf(f, "%[>]", &return_something_please)) {
      printf("links is: %d\n", current_link);
      printf("scanned %c, \n", return_something_please);
      if (current_link >= MAX_LINKS) {
        printf("err - bad 3\n\n");
        CLOSE return BAD_RECORD;
      }
      printf("links is: %d\n", current_link);
      errorCode = fscanf(f, "%[^>$]", temp.links[current_link]);
      if ((errorCode != 1) || 
          (temp.links[current_link][sizeof(temp.links[current_link]) - 1] != '\0')) {
         printf("err - bad 4\n\n");
         CLOSE return BAD_RECORD;
      }
      printf("found %s\n", temp.links[current_link]);
      current_link++;
    }

    printf("links: %d\n", current_link);
    errorCode = fscanf(f, "$");
    if (errorCode != 0) {
         printf("err - bad 5\n\n");
         CLOSE return BAD_RECORD;
    }

    //frequency 
    zero_iarr(temp.bus_frequency, MAX_LINKS);
    while (fscanf(f, "%[+]", &return_something_please)) {
      if (current_freq >= MAX_LINKS) {
        printf("err - bad 3.2\n\n");
        CLOSE return BAD_RECORD;
      }
      errorCode = fscanf(f, "%d", &temp.bus_frequency[current_freq]);
      if (errorCode != 1) {
         printf("err - bad 4.2\n\n");
         CLOSE return BAD_RECORD;
      }
      if (temp.bus_frequency[current_freq] <= 0) {
        printf("err - 0 freq\n");
        CLOSE return BAD_RECORD;
      }
      current_freq++;
    }

    if (current_link != current_freq) {
      printf("err - link mismatch");
      CLOSE return BAD_RECORD;
    }

    errorCode = fscanf(f, "\n");
    if (errorCode != 0) {
         printf("err - bad 7\n\n");
         CLOSE return BAD_RECORD;
    }


    //put into the array!
    g_stop_array[g_stop_count] = temp;
    g_stop_count += 1;
  }

  if (g_stop_count == 0) {
         printf("err - no data\n\n");
         CLOSE return NO_DATA;
  }

  //finally check that all links go to real stops
  for (int d = 0; d < g_stop_count; d++) {
    for (int l = 0; l < MAX_LINKS; l++) {
      if (g_stop_array[d].bus_frequency[l] == 0) {
        l = MAX_LINKS + 1;
      } else {
        if (!find_stop(g_stop_array[d].links[l])) {
          printf("err - invalid links\n");
          CLOSE return NOT_FOUND;
        }
      }
    }
  }

  printf("good %d\n", g_stop_count);
  CLOSE return g_stop_count;
} /* read_stops() */

int is_central(stop_t* stop) {
  int len = strlen(stop->location);
  int centLen = strlen(CENTRAL);

  if (len < centLen) {
    return false;
  }

  //start
  if (!strncmp(stop->location, CENTRAL, centLen)) {
    return true;
  }

  //end
  for (int s = len - 1; s > len - centLen; s--) {
    if (stop->location[s] != CENTRAL[s - len + centLen]) {
      return false;
    }
  }

  return true;
}


/* define find_hubs() here */
/* 
hub requirements:
  have 3 outgoing links
  have total buses leaving = total buses arriving
  location text starts or ends with "Central"
*/
int find_hubs() {
  if (g_stop_count == 0) {
    return NO_DATA;
  }

  //check for duplicate names for some reason
  for (int y = 0; y < g_stop_count; y++) {
    for (int x = y + 1; x < g_stop_count; x++) {
      if (!strcmp(g_stop_array[y].name, g_stop_array[x].name)) {
        return DUPLICATE_NAMES;
      }
    }
  }

  int hubs = 0;
  int numBuses = 0;
  int q = 0;

  for (int y = 0; y < g_stop_count; y++) {
    if (!is_central(&g_stop_array[y])) {
      continue;
    }

    //make sure at least 3 links have data
    if (g_stop_array[y].bus_frequency[2] == 0) {
       continue;
    }

    //track total buses leaving
    q = 0;
    numBuses = 0;
    while (g_stop_array[y].bus_frequency[q] != 0) {
      numBuses += g_stop_array[y].bus_frequency[q];
      q += 1;
    }

    //track total buses arriving
    for (int r = 0; r < g_stop_count; r++) {
      for (q = 0; q < MAX_LINKS; q++) {
        if (!strcmp(g_stop_array[y].name, g_stop_array[r].links[q])) {
          numBuses -= g_stop_array[r].bus_frequency[q];
        }
      }
    }

    //numBuses now represents (buses leaving) - (buses arriving)
    if (numBuses != 0) {
       continue;
    }
    //all 3 conditions have now been met!
    hubs += 1;
  }

  if (hubs == 0) {
    return NOT_FOUND;
  }

  return hubs;
} /* find_hubs() */