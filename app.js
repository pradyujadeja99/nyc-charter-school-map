/* NYC Charter School Explorer - NYS GIS and official Success Academy directory */
'use strict';
const NYS_LAYER='https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Schools/FeatureServer/4';
const NYC_COUNTIES={'bronx':'Bronx','kings':'Brooklyn','new york':'Manhattan','queens':'Queens','richmond':'Staten Island'};
const NYC_CENTER=[40.725,-73.93],NYC_ZOOM=11;
const map=L.map('map',{zoomControl:false}).setView(NYC_CENTER,NYC_ZOOM);
L.control.zoom({position:'bottomright'}).addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map);
const markers=L.layerGroup().addTo(map);
let schools=[],markerById=new Map(),officialLoaded=false,officialLoading=false;
const el=id=>document.getElementById(id);
function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function boroughFromCounty(value){const n=String(value??'').trim().toLowerCase().replace(/ county$/,'');return NYC_COUNTIES[n]||null;}
function normalize(feature){
 const p=feature.properties||{},c=feature.geometry?.coordinates,borough=boroughFromCounty(p.COUNTY_DESC);
 if(!borough||!Array.isArray(c)||c.length<2)return null;
 const lng=Number(c[0]),lat=Number(c[1]);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<40.45||lat>40.95||lng< -74.3||lng> -73.65)return null;
 return {id:String(p.OBJECTID??p.SED_CODE??`${lat},${lng}`),name:String(p.LABEL_NAME||p.POPULAR_NAME||p.LEGAL_NAME||'Unnamed charter school'),aliases:[p.LEGAL_NAME,p.POPULAR_NAME,p.LABEL_NAME].filter(Boolean).join(' '),address:String(p.PHYSADDRLINE1||''),city:String(p.PHYSCITY||''),zip:String(p.PHYSZIPCD5||''),borough,lat,lng,code:String(p.SED_CODE||'')};
}
const officialSchools=SUCCESS_ACADEMY_DIRECTORY.map(s=>({...s}));
function officialMode(){return /^success\s+academy(?:\b|$)/i.test(el('search').value.trim());}
function status(message,error=false){el('status').textContent=message;el('statusDot').className='status-dot'+(error?' error':'');}
function render(){
 const q=el('search').value.trim().toLowerCase(),b=el('borough').value,official=officialMode();
 const source=official?officialSchools:schools;
 // In the official directory mode, the query identifies the organization; borough filtering still applies.
 const filtered=source.filter(s=>(b==='all'||s.borough===b)&&(official||!q||[s.name,s.aliases||'',s.address,s.city,s.zip,s.code].some(v=>v.toLowerCase().includes(q))));
 el('totalCount').textContent=filtered.length.toLocaleString();el('resultsCount').textContent=`${filtered.length} found`;
 markers.clearLayers();markerById.clear();const frag=document.createDocumentFragment();
 filtered.forEach(s=>{
  const hasPoint=Number.isFinite(s.lat)&&Number.isFinite(s.lng);
  const addr=[s.address,s.city,s.zip].filter(Boolean).join(', ');
  const mapsURL='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(addr||`${s.lat},${s.lng}`);
  let mark=null;
  if(hasPoint){
   mark=L.circleMarker([s.lat,s.lng],{radius:6,color:'#fff',weight:1.5,fillColor:official?'#c66d20':'#078b7d',fillOpacity:.88});
   mark.bindPopup(`<div class="popup-name">${escapeHTML(s.name)}</div><div class="popup-info">${escapeHTML(addr)}<br>${escapeHTML(s.borough)}${s.opening&&s.opening!=='Open'?` · ${escapeHTML(s.opening)}`:''}</div><a class="popup-link" href="${mapsURL}" target="_blank" rel="noopener">View in Google Maps ↗</a>`);
   mark.addTo(markers);markerById.set(s.id,mark);
  }
  const item=document.createElement('div');item.className='school';item.tabIndex=0;item.setAttribute('role','button');item.setAttribute('aria-label',`Show ${s.name} on map`);
  item.innerHTML=`<div class="school-title">${escapeHTML(s.name)}</div><div class="school-detail">${escapeHTML(s.address)}${s.address?', ':''}${escapeHTML(s.zip)} <span class="borough-tag">· ${escapeHTML(s.borough)}</span>${s.opening&&s.opening!=='Open'?` · ${escapeHTML(s.opening)}`:''}${official&&!hasPoint?' · Locating…':''}</div>`;
  const go=()=>{if(mark){map.setView([s.lat,s.lng],15);mark.openPopup();}else window.open(mapsURL,'_blank','noopener');};
  item.addEventListener('click',go);item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  frag.appendChild(item);
 });
 el('results').replaceChildren(frag);
 if(!filtered.length)el('results').innerHTML='<div class="loading">No locations match your filters.</div>';
 if(official){
  const located=filtered.filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lng)).length;
  status(`Official Success Academy directory · ${filtered.length} schools · ${located} mapped`);
 }else if(schools.length)status(`Live state GIS data · ${schools.length} mapped records`);
}
function normalizedAddress(s){return String(s.address||'').toUpperCase().replace(/\b(FLOOR|FL|SUITE|STE|ROOM|RM)\b.*$/,'').replace(/[^A-Z0-9]/g,'').replace(/(STREET|AVENUE|BOULEVARD|ROAD|PLACE|DRIVE|LANE)$/,'');}
function matchGISAddress(official){
 const target=normalizedAddress(official);if(target.length<7)return null;
 const matches=schools.filter(s=>s.borough===official.borough&&s.zip===official.zip&&normalizedAddress(s)===target);
 return matches.length?matches[0]:null;
}
async function geocodeOne(s){
 const query=`${s.address}, ${s.city}, NY ${s.zip}`;
 const url='https://geosearch.planninglabs.nyc/v2/search?'+new URLSearchParams({text:query,size:'3'});
 try{
  const response=await fetch(url);if(!response.ok)throw Error('Geocoder HTTP '+response.status);
  const geo=await response.json(),features=geo.features||[];
  // Only accept a geocoding result that matches the published school ZIP.
  const match=features.find(f=>String(f.properties?.postalcode||'')===s.zip&&Array.isArray(f.geometry?.coordinates));
  if(match){const [lng,lat]=match.geometry.coordinates;
   if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat>40.45&&lat<40.95&&lng> -74.3&&lng< -73.65){s.lat=lat;s.lng=lng;return true;}}
 }catch(e){console.warn('Could not geocode',s.name,e.message);}
 return false;
}
async function locateOfficialSchools(){
 if(officialLoaded||officialLoading)return;
 officialLoading=true;
 // Prefer existing mapped NYS coordinates for exact address matches.
 for(const s of officialSchools){const old=matchGISAddress(s);if(old){s.lat=old.lat;s.lng=old.lng;}}
 render();
 // NYC Planning GeoSearch is a separate public geocoder. Requests are deliberately paced.
 const remaining=officialSchools.filter(s=>!Number.isFinite(s.lat));
 for(let i=0;i<remaining.length;i++){
  await geocodeOne(remaining[i]);
  if(officialMode()&&(i%3===2||i===remaining.length-1))render();
  if(i<remaining.length-1)await new Promise(resolve=>setTimeout(resolve,350));
 }
 officialLoaded=true;officialLoading=false;
 if(officialMode())render();
}
async function retrieve(){
 const qs=new URLSearchParams({where:'1=1',outFields:'OBJECTID,SED_CODE,LEGAL_NAME,POPULAR_NAME,LABEL_NAME,PHYSADDRLINE1,PHYSCITY,PHYSZIPCD5,COUNTY_DESC',returnGeometry:'true',outSR:'4326',f:'geojson'});
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const r=await fetch(`${NYS_LAYER}/query?${qs}`,{signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);
  const json=await r.json();if(json.error)throw Error(json.error.message||'GIS API error');if(!Array.isArray(json.features))throw Error('Unexpected data format');
  const byId=new Map();json.features.map(normalize).filter(Boolean).forEach(s=>byId.set(s.id,s));
  schools=[...byId.values()].sort((a,b)=>a.name.localeCompare(b.name));if(!schools.length)throw Error('No NYC charter records returned.');
  render();if(officialMode())locateOfficialSchools();
 }catch(error){console.error('Failed to load GIS data:',error);if(!officialMode())status('State GIS data unavailable',true);}
 finally{clearTimeout(timeout);}
}
el('borough').addEventListener('change',render);
el('search').addEventListener('input',()=>{render();if(officialMode()&&schools.length)locateOfficialSchools();});
el('reset').addEventListener('click',()=>{el('search').value='';el('borough').value='all';map.setView(NYC_CENTER,NYC_ZOOM);render();});
retrieve();
window.addEventListener('load',()=>setTimeout(()=>map.invalidateSize(),300));
