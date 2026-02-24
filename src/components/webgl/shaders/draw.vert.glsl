precision mediump float;

attribute float a_index;

uniform sampler2D u_particles;
uniform float u_particles_res;

uniform float u_point_size;

uniform vec2 u_extent_min;
uniform vec2 u_extent_max;

uniform vec2 u_map_center;
uniform float u_resolution;

uniform vec2 u_canvas_size;

varying vec2 v_particle_pos;

void main() {
    vec4 color = texture2D(u_particles, vec2(
        fract(a_index / u_particles_res),
        floor(a_index / u_particles_res) / u_particles_res
    ));
    
    // decode current particle position from the pixel's RGBA value
    v_particle_pos = vec2(
        color.r / 255.0 + color.b,
        color.g / 255.0 + color.a
    );

    // texture 좌표(0~1) -> LCC 좌표
    vec2 mapPos = vec2(
        mix(u_extent_min.x, u_extent_max.x, v_particle_pos.x),
        mix(u_extent_min.y, u_extent_max.y, 1.0 - v_particle_pos.y)
    );

    // LCC 좌표 -> pixel 좌표
    float px = (mapPos.x - u_map_center.x) / u_resolution + u_canvas_size.x * 0.5;
    float py = (u_map_center.y - mapPos.y) / u_resolution + u_canvas_size.y * 0.5;

    vec2 clip = vec2(
        px / u_canvas_size.x * 2.0 - 1.0,
        1.0 - py / u_canvas_size.y * 2.0
    );
    
    gl_PointSize = u_point_size;
    gl_Position = vec4(
        clip, 
        0.0, 
        1.0
    );
}