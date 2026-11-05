/* NYC Charter School Explorer — public NYS geospatial data, no API key. */
'use strict';
const NYS_LAYER='https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Schools/FeatureServer/4';
const NYC_COUNTIES={'bronx':'Bronx','kings':'Brooklyn','new york':'Manhattan','queens':'Queens','richmond':'Staten Island'};
const NYC_CENTER=[40.725,-73.93], NYC_ZOOM=11;
const map=L.map('map',{zoomControl:false}).setView(NYC_CENTER,NYC_ZOOM);
L.control.zoom({position:'bottomright'}).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',maxZoom:19}).addTo(map);
const markers=L.layerGroup().addTo(map);
let schools=[];let markerById=new Map();
const el=id=>document.getElementById(id);
function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function boroughFromCounty(value){const n=String(value??'').trim().toLowerCase().replace(/ county$/,'');return NYC_COUNTIES[n]||null;}
function normalize(feature){
 const p=feature.properties||{}, c=feature.geometry?.coordinates;
 const borough=boroughFromCounty(p.COUNTY_DESC);
 if(!borough||!Array.isArray(c)||c.length<2)return null;
 const lng=Number(c[0]),lat=Number(c[1]);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<40.45||lat>40.95||lng< -74.3||lng> -73.65)return null;
 return {id:String(p.OBJECTID??p.SED_CODE??`${lat},${lng}`),name:String(p.LABEL_NAME||p.POPULAR_NAME||p.LEGAL_NAME||'Unnamed charter school'),address:String(p.PHYSADDRLINE1||''),city:String(p.PHYSCITY||''),zip:String(p.PHYSZIPCD5||''),borough,lat,lng,code:String(p.SED_CODE||'')};
}
function status(message,error=false){el('status').textContent=message;el('statusDot').className='status-dot'+(error?' error':'');}
function render(){
 const q=el('search').value.trim().toLowerCase(), b=el('borough').value;
 const filtered=schools.filter(s=>(b==='all'||s.borough===b)&&(!q||[s.name,s.address,s.city,s.zip,s.code].some(v=>v.toLowerCase().includes(q))));
 el('totalCount').textContent=filtered.length.toLocaleString();el('resultsCount').textContent=`${filtered.length} found`;
 markers.clearLayers();markerById.clear();
 const frag=document.createDocumentFragment();
 filtered.forEach(s=>{
  const mark=L.circleMarker([s.lat,s.lng],{radius:6,color:'#fff',weight:1.5,fillColor:'#078b7d',fillOpacity:.88});
  const addr=[s.address,s.city,s.zip].filter(Boolean).join(', ');
  const mapsURL='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(addr||`${s.lat},${s.lng}`);
  mark.bindPopup(`<div class="popup-name">${escapeHTML(s.name)}</div><div class="popup-info">${escapeHTML(addr)}<br>${escapeHTML(s.borough)}${s.code?` · ${escapeHTML(s.code)}`:''}</div><a class="popup-link" href="${mapsURL}" target="_blank" rel="noopener">View in Google Maps ↗</a>`);
  mark.addTo(markers);markerById.set(s.id,mark);
  const item=document.createElement('div');item.className='school';item.tabIndex=0;item.setAttribute('role','button');item.setAttribute('aria-label',`Show ${s.name} on map`);
  item.innerHTML=`<div class="school-title">${escapeHTML(s.name)}</div><div class="school-detail">${escapeHTML(s.address)}${s.address?', ':''}${escapeHTML(s.zip)} <span class="borough-tag">· ${escapeHTML(s.borough)}</span></div>`;
  const go=()=>{map.setView([s.lat,s.lng],15);mark.openPopup();};item.addEventListener('click',go);item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  frag.appendChild(item);
 });
 el('results').replaceChildren(frag);
 if(!filtered.length)el('results').innerHTML='<div class="loading">No locations match your filters.</div>';
}
async function retrieve(){
 // Pull all records (well under the layer's documented 10,000-record limit), then filter the five NYC counties.
 const qs=new URLSearchParams({where:'1=1',outFields:'OBJECTID,SED_CODE,LEGAL_NAME,POPULAR_NAME,LABEL_NAME,PHYSADDRLINE1,PHYSCITY,PHYSZIPCD5,COUNTY_DESC',returnGeometry:'true',outSR:'4326',f:'geojson'});
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const r=await fetch(`${NYS_LAYER}/query?${qs}`,{signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);
  const json=await r.json();if(json.error)throw Error(json.error.message||'GIS API error');if(!Array.isArray(json.features))throw Error('Unexpected data format');
  const byId=new Map();json.features.map(normalize).filter(Boolean).forEach(s=>byId.set(s.id,s));
  schools=[...byId.values()].sort((a,b)=>a.name.localeCompare(b.name));
  if(!schools.length)throw Error('No NYC charter records returned.');
  render();status(`Live state GIS data · ${schools.length} mapped records`);
 }catch(error){console.error('Failed to load school data:',error);status('Data source unavailable',true);el('results').innerHTML=`<div class="loading">Could not reach the New York State GIS service. Please refresh or try again later.<br/><br/><a href="${NYS_LAYER}" target="_blank" rel="noopener">Open data source ↗</a></div>`;el('totalCount').textContent='—';el('resultsCount').textContent='—';}
 finally{clearTimeout(timeout);}
}
el('borough').addEventListener('change',render);el('search').addEventListener('input',render);el('reset').addEventListener('click',()=>{el('search').value='';el('borough').value='all';map.setView(NYC_CENTER,NYC_ZOOM);render();});retrieve();
