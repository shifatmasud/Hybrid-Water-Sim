
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const rippleVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const rippleFragmentShader = `
#define MAX_IMPACTS 10

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uStrength;
uniform float uRadius;
uniform float uDamping;
uniform bool uMouseDown;
uniform vec3 uImpacts[MAX_IMPACTS];
uniform int uImpactCount;
varying vec2 vUv;

void main() {
    vec2 cellSize = 1.0 / uResolution;
    
    // RG = (Height, Velocity)
    vec4 data = texture2D(tDiffuse, vUv);
    float height = data.r;
    float vel = data.g;

    // Calculate average neighbor height
    float avg = (
        texture2D(tDiffuse, vUv + vec2(-cellSize.x, 0.0)).r +
        texture2D(tDiffuse, vUv + vec2(cellSize.x, 0.0)).r +
        texture2D(tDiffuse, vUv + vec2(0.0, -cellSize.y)).r +
        texture2D(tDiffuse, vUv + vec2(0.0, cellSize.y)).r
    ) * 0.25;

    // Wave equation: acceleration proportional to Laplacian (avg - height)
    vel += (avg - height) * 2.0;
    vel *= uDamping;
    height += vel;

    // Mouse Interaction
    if (uMouseDown) {
        float dist = distance(vUv, uMouse);
        if (dist < uRadius) {
            // Smooth falloff for the brush
            float amount = uStrength * (1.0 - smoothstep(0.0, uRadius, dist));
            height -= amount; // Push water down
        }
    }
    
    // Discrete Impacts
    float impactForce = 0.0;
    if (uImpactCount > 0) {
        for (int i = 0; i < MAX_IMPACTS; i++) {
            if (i >= uImpactCount) break;
            vec3 impact = uImpacts[i]; // .xy = uv, .z = strength
            float dist = distance(vUv, impact.xy);
            if (dist < uRadius) {
                float amount = impact.z * (1.0 - smoothstep(0.0, uRadius, dist));
                impactForce -= amount;
            }
        }
    }
    height += impactForce;
    
    gl_FragColor = vec4(height, vel, 0.0, 1.0);
}
`;
