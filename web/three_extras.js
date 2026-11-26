/* three_extras.js — three@0.149.0 examples/jsm (MIT, Copyright 2010-2023 Three.js Authors). Requires global THREE r149. */
var ThreeX=(()=>{var le=Object.create;var I=Object.defineProperty;var ne=Object.getOwnPropertyDescriptor;var he=Object.getOwnPropertyNames;var ue=Object.getPrototypeOf,fe=Object.prototype.hasOwnProperty;var ce=(n,e)=>()=>(e||n((e={exports:{}}).exports,e),e.exports),de=(n,e)=>{for(var t in e)I(n,t,{get:e[t],enumerable:!0})},q=(n,e,t,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of he(e))!fe.call(n,r)&&r!==t&&I(n,r,{get:()=>e[r],enumerable:!(i=ne(e,r))||i.enumerable});return n};var R=(n,e,t)=>(t=n!=null?le(ue(n)):{},q(e||!n||!n.__esModule?I(t,"default",{value:n,enumerable:!0}):t,n)),me=n=>q(I({},"__esModule",{value:!0}),n);var S=ce((xe,J)=>{J.exports=window.THREE});var ge={};de(ge,{CopyShader:()=>U,EffectComposer:()=>N,Reflector:()=>W,RenderPass:()=>G,RoomEnvironment:()=>K,ShaderPass:()=>D,UnrealBloomPass:()=>z});var P=R(S(),1);var U={uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );
			gl_FragColor.a *= opacity;


		}`};var V=R(S(),1);var C=R(S(),1),b=class{constructor(){this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},pe=new C.OrthographicCamera(-1,1,1,-1,0,1),X=new C.BufferGeometry;X.setAttribute("position",new C.Float32BufferAttribute([-1,3,0,-1,-1,0,3,-1,0],3));X.setAttribute("uv",new C.Float32BufferAttribute([0,2,0,0,2,0],2));var B=class{constructor(e){this._mesh=new C.Mesh(X,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,pe)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var D=class extends b{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof V.ShaderMaterial?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=V.UniformsUtils.clone(e.uniforms),this.material=new V.ShaderMaterial({defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new B(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}};var Q=class extends b{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){let r=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let l,c;this.inverse?(l=0,c=1):(l=1,c=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,l,4294967295),s.buffers.stencil.setClear(c),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}},j=class extends b{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}};var N=class{constructor(e,t){if(this.renderer=e,t===void 0){let i=e.getSize(new P.Vector2);this._pixelRatio=e.getPixelRatio(),this._width=i.width,this._height=i.height,t=new P.WebGLRenderTarget(this._width*this._pixelRatio,this._height*this._pixelRatio),t.texture.name="EffectComposer.rt1"}else this._pixelRatio=1,this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new D(U),this.clock=new P.Clock}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());let t=this.renderer.getRenderTarget(),i=!1;for(let r=0,s=this.passes.length;r<s;r++){let l=this.passes[r];if(l.enabled!==!1){if(l.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),l.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),l.needsSwap){if(i){let c=this.renderer.getContext(),u=this.renderer.state.buffers.stencil;u.setFunc(c.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),u.setFunc(c.EQUAL,1,4294967295)}this.swapBuffers()}Q!==void 0&&(l instanceof Q?i=!0:l instanceof j&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new P.Vector2);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Z=R(S(),1);var G=class extends b{constructor(e,t,i,r,s){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s!==void 0?s:0,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Z.Color}render(e,t,i){let r=e.autoClear;e.autoClear=!1;let s,l;this.overrideMaterial!==void 0&&(l=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor&&(e.getClearColor(this._oldClearColor),s=e.getClearAlpha(),e.setClearColor(this.clearColor,this.clearAlpha)),this.clearDepth&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor&&e.setClearColor(this._oldClearColor,s),this.overrideMaterial!==void 0&&(this.scene.overrideMaterial=l),e.autoClear=r}};var o=R(S(),1);var $=R(S(),1),ee={shaderID:"luminosityHighPass",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new $.Color(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			vec3 luma = vec3( 0.299, 0.587, 0.114 );

			float v = dot( texel.xyz, luma );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var z=class n extends b{constructor(e,t,i,r){super(),this.strength=t!==void 0?t:1,this.radius=i,this.threshold=r,this.resolution=e!==void 0?new o.Vector2(e.x,e.y):new o.Vector2(256,256),this.clearColor=new o.Color(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),l=Math.round(this.resolution.y/2);this.renderTargetBright=new o.WebGLRenderTarget(s,l),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let f=0;f<this.nMips;f++){let p=new o.WebGLRenderTarget(s,l);p.texture.name="UnrealBloomPass.h"+f,p.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(p);let x=new o.WebGLRenderTarget(s,l);x.texture.name="UnrealBloomPass.v"+f,x.texture.generateMipmaps=!1,this.renderTargetsVertical.push(x),s=Math.round(s/2),l=Math.round(l/2)}let c=ee;this.highPassUniforms=o.UniformsUtils.clone(c.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new o.ShaderMaterial({uniforms:this.highPassUniforms,vertexShader:c.vertexShader,fragmentShader:c.fragmentShader,defines:{}}),this.separableBlurMaterials=[];let u=[3,5,7,9,11];s=Math.round(this.resolution.x/2),l=Math.round(this.resolution.y/2);for(let f=0;f<this.nMips;f++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(u[f])),this.separableBlurMaterials[f].uniforms.texSize.value=new o.Vector2(s,l),s=Math.round(s/2),l=Math.round(l/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1,this.compositeMaterial.needsUpdate=!0;let y=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=y,this.bloomTintColors=[new o.Vector3(1,1,1),new o.Vector3(1,1,1),new o.Vector3(1,1,1),new o.Vector3(1,1,1),new o.Vector3(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;let m=U;this.copyUniforms=o.UniformsUtils.clone(m.uniforms),this.copyUniforms.opacity.value=1,this.materialCopy=new o.ShaderMaterial({uniforms:this.copyUniforms,vertexShader:m.vertexShader,fragmentShader:m.fragmentShader,blending:o.AdditiveBlending,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new o.Color,this.oldClearAlpha=1,this.basic=new o.MeshBasicMaterial,this.fsQuad=new B(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.materialCopy.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.texSize.value=new o.Vector2(i,r),i=Math.round(i/2),r=Math.round(r/2)}render(e,t,i,r,s){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();let l=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let c=this.renderTargetBright;for(let u=0;u<this.nMips;u++)this.fsQuad.material=this.separableBlurMaterials[u],this.separableBlurMaterials[u].uniforms.colorTexture.value=c.texture,this.separableBlurMaterials[u].uniforms.direction.value=n.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[u]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[u].uniforms.colorTexture.value=this.renderTargetsHorizontal[u].texture,this.separableBlurMaterials[u].uniforms.direction.value=n.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[u]),e.clear(),this.fsQuad.render(e),c=this.renderTargetsVertical[u];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=l}getSeperableBlurMaterial(e){return new o.ShaderMaterial({defines:{KERNEL_RADIUS:e,SIGMA:e},uniforms:{colorTexture:{value:null},texSize:{value:new o.Vector2(.5,.5)},direction:{value:new o.Vector2(.5,.5)}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}
				void main() {
					vec2 invSize = 1.0 / texSize;
					float fSigma = float(SIGMA);
					float weightSum = gaussianPdf(0.0, fSigma);
					vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianPdf(x, fSigma);
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new o.ShaderMaterial({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}};z.BlurDirectionX=new o.Vector2(1,0);z.BlurDirectionY=new o.Vector2(0,1);var h=R(S(),1),K=class extends h.Scene{constructor(){super();let e=new h.BoxGeometry;e.deleteAttribute("uv");let t=new h.MeshStandardMaterial({side:h.BackSide}),i=new h.MeshStandardMaterial,r=new h.PointLight(16777215,5,28,2);r.position.set(.418,16.199,.3),this.add(r);let s=new h.Mesh(e,t);s.position.set(-.757,13.219,.717),s.scale.set(31.713,28.305,28.591),this.add(s);let l=new h.Mesh(e,i);l.position.set(-10.906,2.009,1.846),l.rotation.set(0,-.195,0),l.scale.set(2.328,7.905,4.651),this.add(l);let c=new h.Mesh(e,i);c.position.set(-5.607,-.754,-.758),c.rotation.set(0,.994,0),c.scale.set(1.97,1.534,3.955),this.add(c);let u=new h.Mesh(e,i);u.position.set(6.167,.857,7.803),u.rotation.set(0,.561,0),u.scale.set(3.927,6.285,3.687),this.add(u);let y=new h.Mesh(e,i);y.position.set(-2.017,.018,6.124),y.rotation.set(0,.333,0),y.scale.set(2.002,4.566,2.064),this.add(y);let m=new h.Mesh(e,i);m.position.set(2.291,-.756,-2.621),m.rotation.set(0,-.286,0),m.scale.set(1.546,1.552,1.496),this.add(m);let f=new h.Mesh(e,i);f.position.set(-2.193,-.369,-5.547),f.rotation.set(0,.516,0),f.scale.set(3.875,3.487,2.986),this.add(f);let p=new h.Mesh(e,F(50));p.position.set(-16.116,14.37,8.208),p.scale.set(.1,2.428,2.739),this.add(p);let x=new h.Mesh(e,F(50));x.position.set(-16.109,18.021,-8.207),x.scale.set(.1,2.425,2.751),this.add(x);let M=new h.Mesh(e,F(17));M.position.set(14.904,12.198,-1.832),M.scale.set(.15,4.265,6.331),this.add(M);let _=new h.Mesh(e,F(43));_.position.set(-.462,8.89,14.52),_.scale.set(4.38,5.441,.088),this.add(_);let g=new h.Mesh(e,F(20));g.position.set(3.235,11.486,-12.541),g.scale.set(2.5,2,.1),this.add(g);let T=new h.Mesh(e,F(100));T.position.set(0,20,0),T.scale.set(1,.1,1),this.add(T)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function F(n){let e=new h.MeshBasicMaterial;return e.color.setScalar(n),e}var a=R(S(),1),W=class n extends a.Mesh{constructor(e,t={}){super(e),this.isReflector=!0,this.type="Reflector",this.camera=new a.PerspectiveCamera;let i=this,r=t.color!==void 0?new a.Color(t.color):new a.Color(8355711),s=t.textureWidth||512,l=t.textureHeight||512,c=t.clipBias||0,u=t.shader||n.ReflectorShader,y=t.multisample!==void 0?t.multisample:4,m=new a.Plane,f=new a.Vector3,p=new a.Vector3,x=new a.Vector3,M=new a.Matrix4,_=new a.Vector3(0,0,-1),g=new a.Vector4,T=new a.Vector3,H=new a.Vector3,E=new a.Vector4,A=new a.Matrix4,v=this.camera,O=new a.WebGLRenderTarget(s,l,{samples:y,type:a.HalfFloatType}),k=new a.ShaderMaterial({uniforms:a.UniformsUtils.clone(u.uniforms),fragmentShader:u.fragmentShader,vertexShader:u.vertexShader});k.uniforms.tDiffuse.value=O.texture,k.uniforms.color.value=r,k.uniforms.textureMatrix.value=A,this.material=k,this.onBeforeRender=function(d,te,L){if(p.setFromMatrixPosition(i.matrixWorld),x.setFromMatrixPosition(L.matrixWorld),M.extractRotation(i.matrixWorld),f.set(0,0,1),f.applyMatrix4(M),T.subVectors(p,x),T.dot(f)>0)return;T.reflect(f).negate(),T.add(p),M.extractRotation(L.matrixWorld),_.set(0,0,-1),_.applyMatrix4(M),_.add(x),H.subVectors(p,_),H.reflect(f).negate(),H.add(p),v.position.copy(T),v.up.set(0,1,0),v.up.applyMatrix4(M),v.up.reflect(f),v.lookAt(H),v.far=L.far,v.updateMatrixWorld(),v.projectionMatrix.copy(L.projectionMatrix),A.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),A.multiply(v.projectionMatrix),A.multiply(v.matrixWorldInverse),A.multiply(i.matrixWorld),m.setFromNormalAndCoplanarPoint(f,p),m.applyMatrix4(v.matrixWorldInverse),g.set(m.normal.x,m.normal.y,m.normal.z,m.constant);let w=v.projectionMatrix;E.x=(Math.sign(g.x)+w.elements[8])/w.elements[0],E.y=(Math.sign(g.y)+w.elements[9])/w.elements[5],E.z=-1,E.w=(1+w.elements[10])/w.elements[14],g.multiplyScalar(2/g.dot(E)),w.elements[2]=g.x,w.elements[6]=g.y,w.elements[10]=g.z+1-c,w.elements[14]=g.w,i.visible=!1;let se=d.getRenderTarget(),ie=d.xr.enabled,re=d.shadowMap.autoUpdate,oe=d.outputEncoding,ae=d.toneMapping;d.xr.enabled=!1,d.shadowMap.autoUpdate=!1,d.outputEncoding=a.LinearEncoding,d.toneMapping=a.NoToneMapping,d.setRenderTarget(O),d.state.buffers.depth.setMask(!0),d.autoClear===!1&&d.clear(),d.render(te,v),d.xr.enabled=ie,d.shadowMap.autoUpdate=re,d.outputEncoding=oe,d.toneMapping=ae,d.setRenderTarget(se);let Y=L.viewport;Y!==void 0&&d.state.viewport(Y),i.visible=!0},this.getRenderTarget=function(){return O},this.dispose=function(){O.dispose(),i.material.dispose()}}};W.ReflectorShader={uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,fragmentShader:`
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			#include <logdepthbuf_fragment>

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <encodings_fragment>

		}`};return me(ge);})();
