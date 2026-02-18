/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { commonShaderUtils } from './common.ts';

export const waterVertexShader = `
uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveSpeed;
uniform float uWaveScale;
uniform sampler2D tRipple;
uniform float uRippleIntensity;
uniform float uRippleNormalIntensity;
uniform vec2 uResolution; // Added resolution uniform

// Displacement Map Uniforms
uniform bool uUseDisplacement;
uniform sampler2D tDisplacementMap;
uniform float uDisplacementStrength;
uniform float uDisplacementSpeed;

varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float vElevation;
${commonShaderUtils}

// FBM function for base waves, isolated for re-use
float getFbmWaveHeight(vec2 p, float speed, float height) {
    return fbm(p + vec2(uTime * speed * 0.5, uTime * speed * 0.5 * 0.4), 3, 0.5, 2.0) * height;
}

vec3 calculateTotalNormal(vec2 pos, vec2 uv, float scale, float speed, float height) {
    // World space epsilon for FBM waves
    float e = 0.5; 
    
    // Texture space epsilon for Ripple texture (1 pixel)
    vec2 texelSize = 1.0 / uResolution; 

    // 1. Sample Ripple Data
    float r_val = texture2D(tRipple, uv).r;
    float r_x_val = texture2D(tRipple, uv + vec2(texelSize.x, 0.0)).r;
    float r_z_val = texture2D(tRipple, uv + vec2(0.0, texelSize.y)).r;
    
    // 2. Calculate FBM Dampening based on ripple strength
    float ripple_magnitude = abs(r_val);
    float fbm_dampening = 1.0 - smoothstep(0.0, 0.5, ripple_magnitude * uRippleNormalIntensity);
    
    // 3. Calculate Base Wave Height (FBM) with dampening
    vec2 p = pos * scale * 0.02;
    vec2 px = (pos + vec2(e, 0.0)) * scale * 0.02;
    vec2 pz = (pos + vec2(0.0, e)) * scale * 0.02;
    
    // Note: The main displacement has smaller sin/cos waves not reflected in the normal calculation.
    // This is a simplification for performance and visual stability. The FBM is the main driver.
    float h_base = getFbmWaveHeight(p, speed, height) * fbm_dampening;
    float h_base_x = getFbmWaveHeight(px, speed, height) * fbm_dampening;
    float h_base_z = getFbmWaveHeight(pz, speed, height) * fbm_dampening;
    
    // 4. Combine Heights for Normal Calculation
    float h = h_base + r_val * uRippleNormalIntensity;
    float hx = h_base_x + r_x_val * uRippleNormalIntensity;
    float hz = h_base_z + r_z_val * uRippleNormalIntensity;
    
    // 5. Compute Finite Difference Vectors
    vec3 v1 = vec3(e, hx - h, 0.0);
    vec3 v2 = vec3(0.0, hz - h, e);
    
    return normalize(cross(v2, v1));
}

void main() {
    vec3 pos = position;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    
    // 1. Sample Ripple
    float ripple_height = texture2D(tRipple, uv).r;
    
    // 2. Calculate FBM dampening factor
    float ripple_magnitude = abs(ripple_height);
    float fbm_dampening = 1.0 - smoothstep(0.0, 0.5, ripple_magnitude * uRippleIntensity);

    // 3. Calculate Main ambient waves
    vec2 p = worldPosition.xz * uWaveScale * 0.02;
    float t = uTime * uWaveSpeed * 0.5;
    float fbm_displacement = getFbmWaveHeight(p, uWaveSpeed, uWaveHeight * 10.0);
    float small_waves = sin(p.x * 5.0 + t * 2.0) * uWaveHeight * 0.5;
    small_waves += cos(p.y * 4.0 + t * 2.5) * uWaveHeight * 0.5;

    // 4. Texture-based displacement
    float texture_displacement = 0.0;
    if (uUseDisplacement) {
        vec2 disp_uv = worldPosition.xz * 0.05 + uTime * uDisplacementSpeed;
        texture_displacement = texture2D(tDisplacementMap, disp_uv).r * uDisplacementStrength * 10.0;
    }

    // 5. Apply dampening and combine all displacements
    float procedural_displacement = (fbm_displacement * fbm_dampening) + small_waves;
    float ripple_displacement = ripple_height * uRippleIntensity;
    pos.y += procedural_displacement + ripple_displacement + texture_displacement;

    vElevation = pos.y;
    vec4 finalWorldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = finalWorldPos.xyz;

    // Normal calculation
    vNormal = calculateTotalNormal(worldPosition.xz, uv, uWaveScale, uWaveSpeed, uWaveHeight * 10.0);
    
    vec4 mvPosition = viewMatrix * finalWorldPos;
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const waterFragmentShader = `
${commonShaderUtils}
uniform vec3 uColorDeep;
uniform vec3 uColorShallow;
uniform vec3 uSunPosition;
uniform float uTransparency;
uniform float uRoughness;
uniform float uSunIntensity;
uniform float uNormalFlatness;
uniform float uIOR;
uniform sampler2D tSky;
uniform float uTime;
uniform float uWaveHeight;

// Normal Map Uniforms
uniform bool uUseTextureNormals;
uniform sampler2D tNormalMap;
uniform float uNormalMapScale;
uniform float uNormalMapSpeed;
uniform float uNormalMapStrength;

// Surface Texture (Foam) Uniforms
uniform bool uUseTextureSurface;
uniform sampler2D tSurfaceMap;
uniform vec3 uFoamColor;
uniform float uSurfaceTextureScale;
uniform float uSurfaceTextureSpeed;
uniform float uSurfaceTextureStrength;

varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float vElevation;

// Equirectangular mapping for fake reflection/refraction
vec3 getSkyColor(vec3 dir) {
    // Standard Equirectangular mapping
    vec2 uv = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
    uv *= vec2(0.1591, 0.3183); // inv(2*PI), inv(PI)
    uv += 0.5;
    return texture2D(tSky, uv).rgb;
}

void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = vNormal;

    if (uUseTextureNormals && uNormalMapStrength > 0.0) {
        // Scrolling UVs for two normal maps
        vec2 uv1 = vWorldPos.xz * 0.1 * uNormalMapScale + vec2(uTime * uNormalMapSpeed, uTime * uNormalMapSpeed * 0.4);
        vec2 uv2 = vWorldPos.xz * 0.07 * uNormalMapScale - vec2(uTime * uNormalMapSpeed * 0.6, uTime * uNormalMapSpeed);
        
        // Sample and unpack tangent-space normals
        vec3 normal1 = texture2D(tNormalMap, uv1).rgb * 2.0 - 1.0;
        vec3 normal2 = texture2D(tNormalMap, uv2).rgb * 2.0 - 1.0;
        
        // Blend texture normals
        vec3 texNormal = normalize(normal1 + normal2);

        // Create TBN matrix from the procedural world-space normal
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), normal));
        vec3 bitangent = normalize(cross(normal, tangent));
        mat3 tbn = mat3(tangent, bitangent, normal);

        // Transform tangent-space normal to world space
        vec3 worldTexNormal = normalize(tbn * texNormal);

        // Blend procedural and texture-based normals
        normal = normalize(mix(normal, worldTexNormal, uNormalMapStrength));
    }
    
    // Apply normal flatness
    normal.xz *= (1.0 - uNormalFlatness * 0.01); 
    normal = normalize(normal);
    
    // Correct normal for backfaces
    vec3 faceNormal = normalize(gl_FrontFacing ? normal : -normal);
    
    float NdotV = max(0.0, dot(faceNormal, viewDir));
    float fresnel = pow(1.0 - NdotV, 5.0); 
    vec3 finalColor;

    if (gl_FrontFacing) {
        // --- SURFACE (Looking Down) ---
        vec3 refDir = reflect(-viewDir, faceNormal);
        
        // Sample HDR Skybox for Reflection
        vec3 reflection = getSkyColor(refDir);
        
        vec3 body = mix(uColorDeep, uColorShallow, 0.2 + 0.3 * NdotV);
        vec3 sunDir = normalize(uSunPosition);
        vec3 halfVec = normalize(sunDir + viewDir);
        float NdotH = max(0.0, dot(faceNormal, halfVec));
        float specular = pow(NdotH, 100.0 * (1.0 - uRoughness));
        
        // Mix reflection with water body
        finalColor = mix(body, reflection, fresnel);
        finalColor += specular * vec3(1.0, 0.95, 0.8) * uSunIntensity;
        
        // --- FOAM LOGIC ---
        if (uUseTextureSurface && uSurfaceTextureStrength > 0.0) {
            // 1. Procedural foam based on wave crests
            float crestFactor = smoothstep(uWaveHeight * 0.7, uWaveHeight * 1.2, vElevation);

            // 2. Texture-based foam pattern
            vec2 uv1 = vWorldPos.xz * 0.1 * uSurfaceTextureScale + vec2(uTime * uSurfaceTextureSpeed, 0.0);
            vec2 uv2 = vWorldPos.xz * 0.13 * uSurfaceTextureScale - vec2(0.0, uTime * uSurfaceTextureSpeed * 0.8);
            float foamPattern = texture2D(tSurfaceMap, uv1).r * texture2D(tSurfaceMap, uv2).g;

            // 3. Combine and apply
            float foamAmount = crestFactor * foamPattern * uSurfaceTextureStrength;
            finalColor = mix(finalColor, uFoamColor, foamAmount);
        }

        gl_FragColor = vec4(finalColor, uTransparency);
    } else {
        // --- UNDERWATER (Looking Up) ---
        vec3 I = viewDir;
        vec3 N = faceNormal;
        float eta = 1.0 / uIOR; // Water to Air

        vec3 refractedDir = refract(I, N, eta);
        
        float R0 = pow((1.0 - uIOR) / (1.0 + uIOR), 2.0);
        float cosTheta = max(0.0, dot(I, N));
        float fresnelFactor = R0 + (1.0 - R0) * pow(1.0 - cosTheta, 5.0);
        
        vec3 refractedColor;
        if (length(refractedDir) > 0.0) {
            refractedColor = getSkyColor(refractedDir);
        } else {
            refractedColor = vec3(0.0);
        }

        vec3 reflectedDir = reflect(-I, N);
        float noise = fbm(vWorldPos.xz * 0.05 + reflectedDir.xz * 0.1 + uTime * 0.1, 3, 0.5, 2.0);
        vec3 reflectedColor = mix(uColorDeep, uColorShallow, 0.3 + noise * 0.3);
        
        float k = 1.0 - eta * eta * (1.0 - cosTheta * cosTheta);
        float finalFresnel = k < 0.0 ? 1.0 : fresnelFactor;

        finalColor = mix(refractedColor, reflectedColor, finalFresnel);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
}
`;