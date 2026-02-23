precision mediump float;

uniform sampler2D u_wind;
uniform sampler2D u_scalar;
uniform sampler2D u_color_ramp;

uniform vec2 u_wind_min;
uniform vec2 u_wind_max;
uniform int u_color_mode;

varying vec2 v_particle_pos;

void main() {
    float t;
    
    if (u_color_mode == 0) {
        vec2 velocity = mix(
            u_wind_min,
            u_wind_max,     
            texture2D(u_wind, v_particle_pos).rg
        );
        t = length(velocity) / length(u_wind_max);
    } else {
        t = texture2D(u_scalar, v_particle_pos).r;
    }
    
    t = clamp(t, 0.0, 1.0);
    
    float idx = floor(t * 255.0);
    float x = mod(idx, 16.0);
    float y = floor(idx / 16.0);
    
    vec2 ramp_pos = vec2(
        (x + 0.5) / 16.0,
        (y + 0.5) / 16.0
    );
    
    gl_FragColor = texture2D(u_color_ramp, ramp_pos);
}