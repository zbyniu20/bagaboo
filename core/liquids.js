// ==========================================
// CIECZE: lawa i maź (shadery na MeshStandardMaterial przez onBeforeCompile)
//  - lawa: dwie warstwy tekstury płyną w różnych kierunkach i różnym tempie, jasne pęknięcia pulsują żarem,
//    ciemna skorupa się przesuwa (bez dodatkowych obiektów, jedno wywołanie rysowania)
//  - maź: czarna, lakierowana powierzchnia z powoli falującą normalną i fioletowo-czerwoną poświatą Fresnela
// Czas dla wszystkich cieczy to jedna wspólna zmienna, aktualizowana raz na klatkę z updateVisuals().
// ==========================================
import { THREE } from './engine.js';

export const LIQUID_TIME = { value: 0 };

export function makeLavaMaterial(texture, opts) {
    opts = opts || {};
    const mat = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: opts.emissive || 0xff4a08, emissiveIntensity: opts.intensity || 1.5, roughness: 0.55, metalness: 0.0 });
    mat.onBeforeCompile = (sh) => {
        sh.uniforms.uLiqT = LIQUID_TIME;
        sh.fragmentShader = 'uniform float uLiqT;\n' + sh.fragmentShader
            .replace('#include <map_fragment>', `
                vec2 lq1 = vMapUv + vec2(uLiqT * 0.012, uLiqT * 0.021);
                vec2 lq2 = vMapUv * 1.7 + vec2(-uLiqT * 0.017, uLiqT * 0.009);
                vec4 lqA = texture2D(map, lq1), lqB = texture2D(map, lq2);
                float lqH = clamp((lqA.r + lqB.r) * 0.5, 0.0, 1.0);                     // jasność = pęknięcia ze żarem
                vec4 sampledDiffuseColor = mix(lqA, lqB, 0.5) * vec4(vec3(0.55 + 0.6 * lqH), 1.0);
                diffuseColor *= sampledDiffuseColor;`)
            .replace('#include <emissivemap_fragment>', `
                float lqPulse = 0.85 + 0.3 * sin(uLiqT * 1.3 + lqH * 9.0 + vMapUv.x * 14.0);
                totalEmissiveRadiance *= sampledDiffuseColor.rgb * (0.4 + 1.6 * lqH * lqH) * lqPulse;`);
    };
    mat.customProgramCacheKey = () => 'bbLava';
    return mat;
}

export function makeOozeMaterial() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.05, metalness: 0.55, emissive: 0x140004 });
    mat.onBeforeCompile = (sh) => {
        sh.uniforms.uLiqT = LIQUID_TIME;
        sh.vertexShader = 'varying vec3 vOozeW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvOozeW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'uniform float uLiqT; varying vec3 vOozeW;\n' + sh.fragmentShader
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
                // powoli falująca powierzchnia: dwie fale o różnych kierunkach zaburzają normalną w przestrzeni widoku
                vec2 ow = vec2(sin(vOozeW.x * 2.6 + uLiqT * 0.9) + sin(vOozeW.z * 3.4 - uLiqT * 1.2), cos(vOozeW.z * 2.2 + uLiqT * 0.7) + sin(vOozeW.x * 3.9 + uLiqT * 1.5));
                normal = normalize(normal + vec3(ow.x, ow.y, 0.0) * 0.07);`)
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                float ooF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.5);
                totalEmissiveRadiance += vec3(0.5, 0.05, 0.25) * ooF * (0.6 + 0.4 * sin(uLiqT * 1.7));`);
    };
    mat.customProgramCacheKey = () => 'bbOoze';
    return mat;
}
