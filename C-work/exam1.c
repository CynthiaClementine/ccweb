#include <stdio.h>
//#include <>



int main() {
    FILE* in = fopen("exfile.txt", "r");
    if (!in) {
        return -1;
    }

    long start = ftell(in);
    fseek(in, -1, SEEK_END);
    long end = ftell(in);

    printf("test");
    printf("%ld\n", end);

    return 0;
}


struct coord {
    float x;
    float y;
};


struct coord find_center(FILE* file_ptr) {
    struct coord center = {0, 0};
    struct coord buffer = {0, 0};
    int read = 0;

    fseek(file_ptr, -1, SEEK_END);
    long fileSize = ftell(file_ptr);
    fseek(file_ptr, 0, SEEK_SET);

    while (ftell(file_ptr) < fileSize) {
        fread(&buffer, sizeof(struct coord), 1, file_ptr);
        center.x += buffer.x;
        center.y += buffer.y;
        read += 1;
    }

    center.x /= read;
    center.y /= read;

    return center;
}