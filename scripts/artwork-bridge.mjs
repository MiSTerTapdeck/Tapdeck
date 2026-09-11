import {createReadStream,existsSync,readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {basename,join,resolve} from 'node:path';

const port=Number(process.env.TAPDECK_ARTWORK_PORT||8090);
const configPath=process.env.TAPDECK_ARTWORK_SOURCES||resolve('tapdeck-artwork-sources.json');
const allowed=/-((?:thumb)|(?:image))\.png$/i;
function sources(){
 try{
  const parsed=JSON.parse(readFileSync(configPath,'utf8'));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('not an object');
  return Object.fromEntries(Object.entries(parsed).filter(([system,folder])=>/^[a-z0-9-]+$/i.test(system)&&typeof folder==='string'&&folder.trim()).map(([system,folder])=>[system.toLowerCase(),folder]));
 }catch{return {'32x':process.env.TAPDECK_ARTWORK_ROOT||'F:/RetroBat/roms/sega32x/images'};}
}
const server=createServer((request,response)=>{
 response.setHeader('Access-Control-Allow-Origin','*');
 if(request.url==='/health'){response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify({ok:true,systems:Object.keys(sources())}));return;}
 if(request.url==='/systems'){response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(Object.keys(sources())));return;}
 const match=request.url?.match(/^\/art\/([a-z0-9-]+)\/([^/?]+)$/i);
 if(!match){response.writeHead(404);response.end();return;}
 const system=match[1].toLowerCase();let name='';try{name=decodeURIComponent(match[2]);}catch{response.writeHead(400);response.end();return;}
 const root=sources()[system];
 if(!root||basename(name)!==name||!allowed.test(name)){response.writeHead(400);response.end('Only configured systems with -thumb.png and -image.png are available.');return;}
 const file=join(root,name);
 if(!existsSync(file)){response.writeHead(404);response.end();return;}
 response.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public, max-age=86400'});createReadStream(file).pipe(response);
});
server.listen(port,'0.0.0.0',()=>console.log(`Tapdeck artwork bridge: http://0.0.0.0:${port} (${Object.keys(sources()).join(', ')})`));
