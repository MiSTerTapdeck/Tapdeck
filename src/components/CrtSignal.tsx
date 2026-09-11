import React,{useEffect,useRef} from 'react';
import {Image,Platform,StyleSheet,View} from 'react-native';
import type {ImageSourcePropType} from 'react-native';
import {Asset} from 'expo-asset';
import {GLView} from 'expo-gl';
const vhsOverlay=require('../../assets/vhs-overlay-ch03.png');

const vertex=`
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_uv;
void main(){gl_Position=vec4(a_position,0.0,1.0);v_uv=a_texCoord;}
`;
const fragment=`
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform sampler2D u_overlay;
uniform vec2 u_resolution;
uniform vec2 u_imageSize;
float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  // Match React Native Image resizeMode="cover": no barrel distortion,
  // just the complete mix image filling the straight CRT window.
  vec2 uv=v_uv;
  float screenAspect=u_resolution.x/u_resolution.y;
  float imageAspect=u_imageSize.x/u_imageSize.y;
  if(screenAspect>imageAspect)uv.y=(uv.y-0.5)*(imageAspect/screenAspect)+0.5;
  else uv.x=(uv.x-0.5)*(screenAspect/imageAspect)+0.5;
  vec3 color=texture2D(u_image,uv).rgb;
  vec4 tapeSample=texture2D(u_overlay,v_uv);
  vec3 tape=tapeSample.rgb*tapeSample.a;
  color=mix(color,tape,tapeSample.a*0.68);
  gl_FragColor=vec4(color,1.0);
}
`;
function shader(gl:any,type:number,source:string){const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(result)||'CRT shader failed to compile');return result;}

export function CrtSignal({source,label}:{source:ImageSourcePropType;label:string}){
 const frame=useRef<number|null>(null);const mounted=useRef(true);
 useEffect(()=>()=>{mounted.current=false;if(frame.current!==null)cancelAnimationFrame(frame.current);},[]);
 if(Platform.OS==='web')return <WebCrtPreview source={source} label={label}/>;
 return <GLView style={s.signal} accessibilityLabel={label} onContextCreate={async(gl:any)=>{
  try{
   const asset=Asset.fromModule(source as number);const tapeAsset=Asset.fromModule(vhsOverlay);await Promise.all([asset.downloadAsync(),tapeAsset.downloadAsync()]);
   const uri=asset.localUri??asset.uri;const tapeUri=tapeAsset.localUri??tapeAsset.uri;if(!uri||!tapeUri)throw new Error('Artwork texture is unavailable');
   const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'CRT shader failed to link');gl.useProgram(program);
   const positions=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,positions);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
   const coords=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,coords);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,1,1,1,0,0,1,0]),gl.STATIC_DRAW);
   const texCoord=gl.getAttribLocation(program,'a_texCoord');gl.enableVertexAttribArray(texCoord);gl.vertexAttribPointer(texCoord,2,gl.FLOAT,false,0,0);
   const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,{localUri:uri});
   const tapeTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tapeTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,{localUri:tapeUri});
   const resolution=gl.getUniformLocation(program,'u_resolution');const imageSize=gl.getUniformLocation(program,'u_imageSize');const image=gl.getUniformLocation(program,'u_image');const tape=gl.getUniformLocation(program,'u_overlay');gl.uniform1i(image,0);gl.uniform1i(tape,1);
   const draw=()=>{if(!mounted.current)return;gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);gl.uniform2f(resolution,gl.drawingBufferWidth,gl.drawingBufferHeight);gl.uniform2f(imageSize,asset.width??1,asset.height??1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.endFrameEXP();};
   draw();
  }catch(error){console.warn('Tapdeck CRT effect unavailable',error);}
 }}/>
}
function WebCrtPreview({source,label}:{source:ImageSourcePropType;label:string}){
 return <View style={s.webSignal} accessibilityLabel={label}>
  <Image source={source} resizeMode="cover" style={s.webImage}/>
  <Image source={vhsOverlay} resizeMode="stretch" style={s.webVhs}/>
 </View>;
}
const s=StyleSheet.create({
 signal:{flex:1},webSignal:{flex:1,overflow:'hidden',borderRadius:21,backgroundColor:'#030404'},
 webImage:{width:'104%',height:'104%',marginLeft:'-2%',marginTop:'-2%'},
 webVhs:{position:'absolute',width:'100%',height:'100%',opacity:.68} as any,
});
