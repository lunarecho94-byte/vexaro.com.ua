#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

// Fast floodfill in C
// pixels: raw RGB byte buffer (w * h * 3)
// target: (tr, tg, tb)
// seeds: array of (x, y) seed coordinates
void c_floodfill(uint8_t *pixels, int w, int h, 
                 int tr, int tg, int tb, 
                 int thresh,
                 const int *seeds, int num_seeds) 
{
    int total_pixels = w * h;
    uint8_t *visited = (uint8_t *)calloc(total_pixels, sizeof(uint8_t));
    int *queue = (int *)malloc(total_pixels * sizeof(int));
    if (!visited || !queue) {
        if (visited) free(visited);
        if (queue) free(queue);
        return;
    }

    int q_start = 0;
    int q_end = 0;

    int thresh_sq = thresh * thresh * 3; // Euclidean RGB distance squared

    for (int s = 0; s < num_seeds; s++) {
        int sx = seeds[s * 2];
        int sy = seeds[s * 2 + 1];
        if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
        int s_idx = sy * w + sx;
        if (!visited[s_idx]) {
            visited[s_idx] = 1;
            queue[q_end++] = s_idx;
        }
    }

    // Sample background color from the first valid seed
    int first_seed_idx = queue[0];
    int bg_r = pixels[first_seed_idx * 3];
    int bg_g = pixels[first_seed_idx * 3 + 1];
    int bg_b = pixels[first_seed_idx * 3 + 2];

    while (q_start < q_end) {
        int curr = queue[q_start++];
        int cx = curr % w;
        int cy = curr / w;

        int p_offset = curr * 3;
        // Replace current pixel with target color
        pixels[p_offset]     = (uint8_t)tr;
        pixels[p_offset + 1] = (uint8_t)tg;
        pixels[p_offset + 2] = (uint8_t)tb;

        // Check 4 neighbors
        int nx[4] = {cx + 1, cx - 1, cx, cx};
        int ny[4] = {cy, cy, cy + 1, cy - 1};

        for (int i = 0; i < 4; i++) {
            int x = nx[i];
            int y = ny[i];
            if (x >= 0 && x < w && y >= 0 && y < h) {
                int n_idx = y * w + x;
                if (!visited[n_idx]) {
                    visited[n_idx] = 1;
                    int no = n_idx * 3;
                    int dr = (int)pixels[no]     - bg_r;
                    int dg = (int)pixels[no + 1] - bg_g;
                    int db = (int)pixels[no + 2] - bg_b;
                    int dist_sq = dr * dr + dg * dg + db * db;
                    if (dist_sq <= thresh_sq) {
                        queue[q_end++] = n_idx;
                    }
                }
            }
        }
    }

    free(visited);
    free(queue);
}
