(()=>{
'use strict';

const $=s=>document.querySelector(s);
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const HOLSWORTHY={lat:50.8118,lng:-4.3532,address:'Holsworthy town centre'};
let pending=false;
let readyKey='';
let extensionMiles=0;

function isBaseSide(text){
  const s=norm(text);
  return ['bude','stratton'].some(x=>s.includes(x));
}
function isHolsworthyExtensionText(text){
  const s=norm(text);
  if(!s.includes('holsworthy'))return false;
  // Exact Holsworthy town remains the normal fixed fare. Villages/hamlets
  // formatted by Google as "X, Holsworthy, ..." use the extension rule.
  return !/^holsworthy(?:\s|$)/.test(s);
}
function extensionSide(a,b){
  if(isBaseSide(a)&&isHolsworthyExtensionText(b))return'destination';
  if(isBaseSide(b)&&isHolsworthyExtensionText(a))return'pickup';
  return null;
}
function keyFor(a,b){return `${norm(a)}>${norm(b)}`}

async function geocodeAddress(address){
  if(!window.google?.maps?.Geocoder)throw new Error('Google Maps is not ready');
  const g=new google.maps.Geocoder();
  const r=await g.geocode({address,region:'gb'});
  const hit=r.results?.[0],loc=hit?.geometry?.location;
  if(!loc)throw new Error('Could not locate the Holsworthy-area address');
  return{lat:loc.lat(),lng:loc.lng(),address:hit.formatted_address||address,placeId:hit.place_id||''};
}
async function routeMiles(origin,destination){
  const r=await fetch('https://book.robs-travel.co.uk/api/route',{
    method:'POST',headers:{'content-type':'text/plain;charset=UTF-8'},
    body:JSON.stringify({origin,destination,intermediates:[]})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok||!d.distanceMeters)throw new Error(d.message||'Could not calculate the Holsworthy extension');
  return Number(d.distanceMeters)/1609.344;
}
async function prepareExtension(){
  const p=$('#pickup')?.value||'',d=$('#destination')?.value||'';
  const side=extensionSide(p,d);
  if(!side){readyKey='';extensionMiles=0;return false;}
  const k=keyFor(p,d);
  if(readyKey===k&&extensionMiles>0)return true;
  const address=side==='pickup'?p:d;
  const point=await geocodeAddress(address);
  extensionMiles=await routeMiles(HOLSWORTHY,point);
  readyKey=k;
  return true;
}

function installFareWrapper(){
  if(window.__rtHolsworthyExtensionWrapped)return true;
  if(typeof window.masterFixedFare!=='function'||typeof window.meterFare!=='function'||typeof window.tariffInfo!=='function')return false;
  const original=window.masterFixedFare;
  window.masterFixedFare=function(a,b,date,time){
    const side=extensionSide(a,b);
    if(!side)return original(a,b,date,time);
    const k=keyFor(a,b);
    if(readyKey!==k||!(extensionMiles>0))return original(a,b,date,time);

    const routes=Array.isArray(window.ROBS_TRAVEL_FIXED_FARES)?window.ROBS_TRAVEL_FIXED_FARES:[];
    const hols=routes.find(r=>norm(r.label)==='holsworthy')||routes.find(r=>(r.to||[]).some(x=>norm(x)==='holsworthy'));
    const per=typeof window.period==='function'?window.period(date,time):'day';
    const band=typeof window.passengerBand==='function'?window.passengerBand():'1-4';
    let base=Number((hols?.prices?.[per]||hols?.prices?.day||{})[band]);
    if(!Number.isFinite(base)||base<=0)base=band==='1-4'?30:band==='5-6'?45:45;
    const tariff=window.tariffInfo(date,time);
    const extension=Number(window.meterFare(extensionMiles,tariff.key)||0);
    return{
      price:base+extension,
      label:`Holsworthy fixed fare £${base.toFixed(2)} + metered extension ${extensionMiles.toFixed(1)} miles (£${extension.toFixed(2)})`,
      fixed:true,
      runoutPlace:null,
      holsworthyExtension:true,
      extensionMiles,
      extensionFare:extension,
      holsworthyBase:base
    };
  };
  window.__rtHolsworthyExtensionWrapped=true;
  return true;
}

function captureEstimate(e){
  const form=e.target?.closest?.('#estimateForm');
  if(!form||form.dataset.holsworthyExtensionBypass==='1')return;
  const p=$('#pickup')?.value||'',d=$('#destination')?.value||'';
  if(!extensionSide(p,d))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if(pending)return;
  pending=true;
  const button=$('#estimateButton'),status=$('#mapsStatus');
  if(button){button.disabled=true;button.textContent='Calculating Holsworthy extension…';}
  if(status)status.textContent='Using the Holsworthy fixed fare, then metering the actual road distance beyond Holsworthy.';
  prepareExtension().then(()=>{
    installFareWrapper();
    form.dataset.holsworthyExtensionBypass='1';
    form.requestSubmit();
    setTimeout(()=>delete form.dataset.holsworthyExtensionBypass,0);
  }).catch(err=>{
    console.error('HOLSWORTHY_EXTENSION_FAILED',err);
    if(status)status.textContent=err.message||'Could not calculate the Holsworthy-area extension. Please try again.';
    if(button){button.disabled=false;button.innerHTML='Calculate instant estimate <span>→</span>';}
  }).finally(()=>{pending=false;});
}

function start(){
  let tries=0;
  const timer=setInterval(()=>{tries++;if(installFareWrapper()||tries>40)clearInterval(timer)},100);
  document.addEventListener('submit',captureEstimate,true);
  ['pickup','destination'].forEach(id=>$("#"+id)?.addEventListener('input',()=>{readyKey='';extensionMiles=0;}));
  document.documentElement.dataset.rtHolsworthyExtension='v1';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();