const logoFix=document.createElement('style');
logoFix.textContent=`.brand img,.footer-brand img{clip-path:circle(43% at 50% 50%);object-fit:cover}.brand{overflow:visible}`;
document.head.appendChild(logoFix);

let pickupPlace=null,destinationPlace=null,lastEstimate=null;
const menu=document.querySelector('.menu'),nav=document.querySelector('.navlinks')||document.querySelector('nav');
menu?.addEventListener('click',()=>{const open=nav?.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});

function norm(v=''){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function includesTerm(value,terms){const v=norm(value);return (terms||[]).some(x=>{const n=norm(x);return !!n&&v.includes(n)})}

function loadMasterPricing(){
  if(window.ROBS_TRAVEL_FIXED_FARES&&window.ROBS_TRAVEL_LONG_DISTANCE_FARES)return Promise.resolve(true);
  return new Promise(resolve=>{const s=document.createElement('script');s.src='https://book.robs-travel.co.uk/fixed-fares.js?v=shared-fares-20260822';s.async=true;s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)});
}
const pricingReady=loadMasterPricing();

function loadMaps(){
  return new Promise((resolve,reject)=>{
    if(window.google?.maps?.places)return resolve();
    const key=String(window.ROBS_TRAVEL_CONFIG?.googleMapsApiKey||'').trim();
    if(!key)return reject(new Error('Google Maps configuration unavailable'));
    window.__sharedRtMapsReady=resolve;
    const s=document.createElement('script');
    s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=__sharedRtMapsReady&v=weekly`;
    s.async=true;s.defer=true;s.onerror=reject;document.head.appendChild(s);
  });
}

const HEATHROW_TERMINALS=[
  {n:'2',label:'Heathrow Airport – Terminal 2',address:'Heathrow Airport Terminal 2, Hounslow TW6, UK',lat:51.4700,lng:-0.4524},
  {n:'3',label:'Heathrow Airport – Terminal 3',address:'Heathrow Airport Terminal 3, Hounslow TW6, UK',lat:51.4715,lng:-0.4565},
  {n:'4',label:'Heathrow Airport – Terminal 4',address:'Heathrow Airport Terminal 4, Hounslow TW6, UK',lat:51.4599,lng:-0.4460},
  {n:'5',label:'Heathrow Airport – Terminal 5',address:'Heathrow Airport Terminal 5, Wallis Road, Longford, Hounslow TW6, UK',lat:51.4722,lng:-0.4889}
];
function isHeathrowSelection(place){
  const s=norm(`${place?.name||''} ${place?.formatted_address||place?.address||''}`);
  return s.includes('heathrow')||s.includes(' lhr ')||s.startsWith('lhr ')||s.includes('tw6')||s.includes('terminal 5 wallis')||s.includes('wallis road longford')||s.includes('terminal 4 nelson');
}
function closeHeathrowPicker(){document.getElementById('rtWebsiteHeathrowPicker')?.remove()}
function openHeathrowPicker(input,setter){
  closeHeathrowPicker();
  const host=document.createElement('div');host.id='rtWebsiteHeathrowPicker';
  host.innerHTML=`<div style="position:fixed;inset:0;z-index:2147483647;background:#020812e8;display:grid;place-items:center;padding:18px"><section role="dialog" aria-modal="true" aria-labelledby="rtHwWebsiteTitle" style="position:relative;width:min(94vw,520px);background:#fff;color:#111827;border-radius:24px;padding:24px 20px 22px;box-shadow:0 24px 70px #000a;text-align:center"><button type="button" data-hw-close aria-label="Close" style="position:absolute;right:10px;top:8px;width:42px;height:42px;border:0;background:transparent;color:#111827;font-size:32px">×</button><div style="font-size:34px;margin:2px 0 8px">✈️</div><h2 id="rtHwWebsiteTitle" style="font-size:26px;line-height:1.1;margin:0 32px 8px;font-weight:900">Which Heathrow terminal?</h2><p style="margin:0 auto 18px;max-width:430px;color:#475569;font-size:15px;line-height:1.4">Heathrow uses the approved fixed fare. Choose Terminal 2, 3, 4 or 5 so the correct terminal and route are used.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${HEATHROW_TERMINALS.map(t=>`<button type="button" data-hw-terminal="${t.n}" style="min-height:82px;border:2px solid #d5a51f;border-radius:17px;background:#111827;color:#fff;padding:12px"><strong style="display:block;font-size:20px">Terminal ${t.n}</strong><span style="font-size:13px;color:#f7d66d;font-weight:750">Heathrow Airport</span></button>`).join('')}</div><small style="display:block;margin-top:14px;color:#64748b;line-height:1.35">Pickups already on the normal Heathrow route corridor use the same fixed fare; genuine detours use the run-out engine.</small></section></div>`;
  document.body.appendChild(host);
  host.querySelector('[data-hw-close]').onclick=closeHeathrowPicker;
  host.firstElementChild.onclick=e=>{if(e.target===e.currentTarget)closeHeathrowPicker()};
  host.querySelectorAll('[data-hw-terminal]').forEach(b=>b.onclick=()=>{
    const t=HEATHROW_TERMINALS.find(x=>x.n===b.dataset.hwTerminal);if(!t)return;
    input.value=t.address;
    setter({address:t.address,location:{lat:()=>t.lat,lng:()=>t.lng},placeId:''});
    closeHeathrowPicker();
    const s=document.getElementById('mapsStatus');if(s)s.textContent=`${t.label} selected. Heathrow fixed-fare pricing will be used.`;
  });
}
function attachPlace(id,setter){
  const input=document.getElementById(id);if(!input)return;
  const ac=new google.maps.places.Autocomplete(input,{componentRestrictions:{country:'gb'},fields:['formatted_address','geometry','name','place_id']});
  ac.addListener('place_changed',()=>{const p=ac.getPlace();if(!p.geometry)return;input.value=p.formatted_address||p.name;const selected={address:input.value,location:p.geometry.location,placeId:p.place_id};setter(selected);if(isHeathrowSelection(p))openHeathrowPicker(input,setter)});
  input.addEventListener('input',()=>setter(null));
}
loadMaps().then(()=>{attachPlace('pickup',p=>pickupPlace=p);attachPlace('destination',p=>destinationPlace=p)}).catch(()=>{const s=document.getElementById('mapsStatus');if(s)s.textContent='Google address search could not load. Please refresh and try again.'});

const fallbackFixed=[
 {label:'Exeter St Davids / Exeter Hospital',from:['bude','stratton','poughill','marhamchurch','widemouth bay','grimscott','poundstock'],to:['exeter st davids','exeter st davids railway station','exeter st davids train station','bonhay road','ex4 4nt','royal devon and exeter hospital','rd e hospital','wonford hospital','ex2 5dw'],bidirectional:true,prices:{day:{'1-4':120,'5-6':150,'7-8':180},night:{'1-4':140,'5-6':180,'7-8':200}}},
 {label:'Exeter Airport',from:['bude','stratton','poughill','marhamchurch','widemouth bay','grimscott','poundstock'],to:['exeter airport','clyst honiton','ex5 2bd'],bidirectional:true,prices:{day:{'1-4':150,'5-6':170,'7-8':190},night:{'1-4':170,'5-6':190,'7-8':200}}},
 {label:'Newquay Airport',from:['bude','stratton','poughill','marhamchurch','widemouth bay','grimscott','poundstock'],to:['newquay airport','cornwall airport newquay','st mawgan','tr8 4rq'],bidirectional:true,prices:{day:{'1-4':90,'5-6':110,'7-8':120},night:{'1-4':120,'5-6':160,'7-8':180}}},
 {label:'Okehampton / Okehampton Railway Station',from:['bude','stratton','poughill','marhamchurch','widemouth bay','grimscott','poundstock','morwenstow','kilkhampton','marsland','welcombe','northcott','sandymouth'],to:['okehampton','okehampton railway station','okehampton train station','station road okehampton','ex20 1ej'],bidirectional:true,zone:{centre:{lat:50.7382,lng:-4.0018},radiusMiles:3},prices:{day:{'1-4':90,'5-6':120,'7-8':150},night:{'1-4':120,'5-6':150,'7-8':190}}}
];
const fallbackLong=[
 {label:'Heathrow Airport',aliases:['heathrow airport','london heathrow','heathrow airport lhr','heathrow terminal 2','heathrow terminal 3','heathrow terminal 4','heathrow terminal 5','terminal 2 hounslow','terminal 3 hounslow','terminal 4 hounslow','terminal 5 hounslow','wallis road longford','tw6'],prices:{standard:400,mpv:460,eight:550}},
 {label:'Gatwick Airport',aliases:['gatwick airport','london gatwick','gatwick north terminal','gatwick south terminal','rh6'],prices:{standard:450,mpv:500,eight:600}},
 {label:'Bristol Airport',aliases:['bristol airport','bristol international airport','bs48 3dy'],prices:{standard:240,mpv:290,eight:340}},
 {label:'Birmingham Airport',aliases:['birmingham airport','bhx airport','b26 3qj'],prices:{standard:380,mpv:420,eight:490}},
 {label:'Manchester Airport',aliases:['manchester airport','man airport','m90 1qx'],prices:{standard:500,mpv:570,eight:660}}
];
const budeTerms=['bude','stratton','poughill','marhamchurch','widemouth bay','grimscott','poundstock','morwenstow','kilkhampton','marsland','welcombe','northcott','sandymouth'];
const runoutBands=[[5,0],[6,10],[7,12],[8,14],[9,16],[10,18],[15,20],[20,30],[25,40],[30,50],[35,60],[40,70],[45,80],[50,90]];
const NORTH_CORNWALL_TARIFFS={
 tariff1:{label:'R1 • daytime',standard:{first:4.20,step:.30},large:{first:6.30,step:.45}},
 tariff2:{label:'R2 • night / weekend / bank holiday',standard:{first:5.00,step:.40},large:{first:7.40,step:.50}},
 tariff4:{label:'R4 • Christmas / New Year',standard:{first:8.20,step:.60},large:{first:12.10,step:.90}}
};

function passengerBand(){const p=String(document.getElementById('passengers')?.value||'1-4');if(p.includes('7')||p.includes('8'))return'7-8';if(p.includes('5')||p.includes('6'))return'5-6';return'1-4'}
function vehicleTier(){const v=document.getElementById('vehicle')?.value||'standard';return v==='minibus'?'eight':v==='mpv'?'mpv':'standard'}
function requiredVehicleForPassengers(){const band=passengerBand();return band==='7-8'?'minibus':band==='5-6'?'mpv':'standard'}
function syncVehicleToPassengers(){const vehicle=document.getElementById('vehicle');if(!vehicle)return;vehicle.value=requiredVehicleForPassengers()}
document.getElementById('passengers')?.addEventListener('change',syncVehicleToPassengers);
syncVehicleToPassengers();

function localDateKey(dt){return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`}
function dateTime(date,time){return new Date(`${date}T${time||'12:00'}:00`)}
function isTariff4Date(dt){
  const y=dt.getFullYear(),m=dt.getMonth();
  const christmasYear=m===0?y-1:y;
  const christmasStart=new Date(christmasYear,11,24,18,0,0,0);
  const normalChristmasEnd=new Date(christmasYear,11,27,7,0,0,0);
  const christmasEnd=normalChristmasEnd.getDay()===0?new Date(christmasYear,11,28,7,0,0,0):normalChristmasEnd;
  if(dt>=christmasStart&&dt<christmasEnd)return true;
  const newYearYear=m===11?y:y-1;
  const newYearStart=new Date(newYearYear,11,31,18,0,0,0);
  const newYearEnd=new Date(newYearYear+1,0,2,7,0,0,0);
  return dt>=newYearStart&&dt<newYearEnd;
}
function bankHolidayWindow(dt){
  const holidays=window.ROBS_TRAVEL_CONFIG?.fareConfig?.bankHolidays||[];
  const today=localDateKey(dt),mins=dt.getHours()*60+dt.getMinutes();
  if(holidays.includes(today))return true;
  const prev=new Date(dt);prev.setDate(prev.getDate()-1);
  return holidays.includes(localDateKey(prev))&&mins<7*60;
}
function weekendWindow(dt){const day=dt.getDay(),mins=dt.getHours()*60+dt.getMinutes();return (day===6&&mins>=19*60)||day===0||(day===1&&mins<7*60)}
function tariffInfo(date,time){
  const dt=dateTime(date,time),mins=dt.getHours()*60+dt.getMinutes();
  if(isTariff4Date(dt))return{key:'tariff4',...NORTH_CORNWALL_TARIFFS.tariff4,meterOnly:true};
  if(bankHolidayWindow(dt))return{key:'tariff2',...NORTH_CORNWALL_TARIFFS.tariff2,meterOnly:true};
  if(weekendWindow(dt))return{key:'tariff2',...NORTH_CORNWALL_TARIFFS.tariff2,meterOnly:true};
  if(mins<7*60||mins>=19*60)return{key:'tariff2',...NORTH_CORNWALL_TARIFFS.tariff2,meterOnly:false};
  return{key:'tariff1',...NORTH_CORNWALL_TARIFFS.tariff1,meterOnly:false};
}
function period(date,time){const dt=dateTime(date,time),mins=dt.getHours()*60+dt.getMinutes();return mins<7*60||mins>=19*60?'night':'day'}
function meterFare(miles,tariffKey){const tariff=NORTH_CORNWALL_TARIFFS[tariffKey],large=passengerBand()!=='1-4',band=tariff[large?'large':'standard'],extraSteps=Math.max(0,Math.ceil((Number(miles)-0.2-1e-9)/0.1));return band.first+(extraSteps*band.step)+1}

function haversine(a,b){const rad=x=>x*Math.PI/180,R=3958.7613,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function point(place){return place?.location?{lat:place.location.lat(),lng:place.location.lng()}:null}
function routeMatch(route,p,d){
  const from=(route.from||[]).map(norm).filter(Boolean),to=(route.to||[]).map(norm).filter(Boolean);
  const f=from.some(x=>p.includes(x))&&to.some(x=>d.includes(x));
  const r=route.bidirectional!==false&&to.some(x=>p.includes(x))&&from.some(x=>d.includes(x));
  if(!(f||r))return false;
  if(route.zone?.centre&&route.zone?.radiusMiles){const target=f?point(destinationPlace):point(pickupPlace);if(!target||haversine(route.zone.centre,target)>Number(route.zone.radiusMiles))return false}
  return true;
}
function endpointFixedMatch(route,p,d){
  const to=(route.to||[]).map(norm).filter(Boolean);
  const pickupIsFixed=to.some(x=>p.includes(x));
  const destinationIsFixed=to.some(x=>d.includes(x));
  if(destinationIsFixed&&!pickupIsFixed)return{matched:true,runoutPlace:'pickup'};
  if(route.bidirectional!==false&&pickupIsFixed&&!destinationIsFixed)return{matched:true,runoutPlace:'destination'};
  return{matched:false,runoutPlace:null};
}
function priced(table,per,key){return Number((table?.[per]||table?.day||table||{})[key])||0}
function masterFixedFare(a,b,date,time){
  const p=norm(a),d=norm(b),all=`${p} ${d}`;
  const per=period(date,time),tier=vehicleTier(),band=passengerBand();
  const masterLongs=Array.isArray(window.ROBS_TRAVEL_LONG_DISTANCE_FARES)?window.ROBS_TRAVEL_LONG_DISTANCE_FARES:[];
  const masterFixeds=Array.isArray(window.ROBS_TRAVEL_FIXED_FARES)?window.ROBS_TRAVEL_FIXED_FARES:[];
  const longMatch=r=>(r.aliases||[]).some(x=>{const n=norm(x);return !!n&&all.includes(n)});
  const masterLong=masterLongs.find(longMatch),localLong=fallbackLong.find(longMatch),long=masterLong||localLong;
  if(long){
    let price=priced(long.prices,per,tier);if(!price&&masterLong&&localLong)price=priced(localLong.prices,per,tier);
    if(price){
      const aliases=[...(long.aliases||[]),...(localLong?.aliases||[])].map(norm).filter(Boolean),pickupIsFixed=aliases.some(x=>p.includes(x)),destinationIsFixed=aliases.some(x=>d.includes(x));
      const runoutPlace=destinationIsFixed&&!pickupIsFixed?'pickup':pickupIsFixed&&!destinationIsFixed?'destination':null;
      return{price,label:long.label||localLong?.label||'Fixed long-distance fare',fixed:true,runoutPlace};
    }
  }
  let fixed=masterFixeds.find(r=>routeMatch(r,p,d))||fallbackFixed.find(r=>routeMatch(r,p,d)),runoutPlace=null;
  if(!fixed){
    const masterEndpoint=masterFixeds.map(r=>({route:r,match:endpointFixedMatch(r,p,d)})).find(x=>x.match.matched);
    const localEndpoint=fallbackFixed.map(r=>({route:r,match:endpointFixedMatch(r,p,d)})).find(x=>x.match.matched);
    const endpoint=masterEndpoint||localEndpoint;
    if(endpoint){fixed=endpoint.route;runoutPlace=endpoint.match.runoutPlace;}
  }
  if(!fixed)return null;
  const localFixed=fallbackFixed.find(r=>r.label===fixed.label)||fallbackFixed.find(r=>endpointFixedMatch(r,p,d).matched)||null;
  let price=priced(fixed.prices,per,band);if(!price&&localFixed)price=priced(localFixed.prices,per,band);
  return price?{price,label:fixed.label||localFixed?.label||'Fixed fare',fixed:true,runoutPlace}:null;
}

function placePoint(place){return{lat:place.location.lat(),lng:place.location.lng(),placeId:place.placeId,address:place.address}}
async function routeBetween(origin,destination,intermediates=[]){
  const response=await fetch('https://book.robs-travel.co.uk/api/route',{method:'POST',headers:{'content-type':'text/plain;charset=UTF-8'},body:JSON.stringify({origin,destination,intermediates})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok||!data.distanceMeters)throw new Error(data.message||'The route service could not calculate this journey. Please try again.');
  return{distanceMeters:data.distanceMeters,durationSeconds:data.durationSeconds||0};
}
async function route(){
  if(!pickupPlace||!destinationPlace)throw new Error('Please choose both addresses from the Google suggestions.');
  return routeBetween(placePoint(pickupPlace),placePoint(destinationPlace));
}
async function runoutCharge(preferredPlace=null,fixedPlace=null){
  const base={lat:50.8308,lng:-4.5460,address:'Bude town centre'},p=norm(pickupPlace.address),d=norm(destinationPlace.address),candidates=[];
  if(preferredPlace&&fixedPlace){
    try{
      const baseline=await routeBetween(base,placePoint(fixedPlace));
      const via=await routeBetween(base,placePoint(fixedPlace),[placePoint(preferredPlace)]);
      const detour=Math.max(0,(Number(via.distanceMeters)-Number(baseline.distanceMeters))/1609.344);
      const band=runoutBands.find(x=>detour<=x[0]);
      return band?{charge:band[1],miles:detour,corridor:true}:{charge:null,miles:detour,corridor:true};
    }catch(error){console.warn('Route-corridor run-out calculation unavailable; using Bude run-out fallback',error)}
  }
  if(preferredPlace)candidates.push(preferredPlace);
  else{
    if(includesTerm(p,budeTerms))candidates.push(pickupPlace);
    if(includesTerm(d,budeTerms))candidates.push(destinationPlace);
    if(!candidates.length)candidates.push(pickupPlace,destinationPlace);
  }
  let best=Infinity;
  for(const c of candidates){
    try{const r=await routeBetween(base,placePoint(c));best=Math.min(best,r.distanceMeters/1609.344)}
    catch{const cp=point(c);if(cp)best=Math.min(best,haversine(base,cp))}
  }
  if(!Number.isFinite(best))return{charge:0,miles:0,corridor:false};
  const band=runoutBands.find(x=>best<=x[0]);return band?{charge:band[1],miles:best,corridor:false}:{charge:null,miles:best,corridor:false};
}

const estimateForm=document.getElementById('estimateForm');
estimateForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const button=document.getElementById('estimateButton'),status=document.getElementById('mapsStatus'),date=document.getElementById('date').value,time=document.getElementById('time').value;
  const box=document.getElementById('estimateResult'),booking=document.getElementById('bookingForm');
  syncVehicleToPassengers();lastEstimate=null;
  if(box){box.hidden=true;box.innerHTML=''}if(booking)booking.hidden=true;
  if(document.getElementById('vehicle').value==='executive'){status.textContent='Executive journeys are individually quoted. Please call or WhatsApp Rob’s Travel.';return}
  button.disabled=true;button.textContent='Calculating route…';
  try{
    await pricingReady;
    const r=await route(),miles=r.distanceMeters/1609.344,minutes=Math.max(1,Math.round(r.durationSeconds/60)),tariff=tariffInfo(date,time);
    const fixed=tariff.meterOnly?null:masterFixedFare(pickupPlace.address,destinationPlace.address,date,time);
    if(!fixed&&miles>50)throw new Error(tariff.meterOnly?'At this tariff/time, journeys over 50 miles are not automatically priced. Please contact us for a price.':'Journeys over 50 miles without an approved fixed fare need a personal quote.');
    const preferredRunout=fixed?.runoutPlace==='pickup'?pickupPlace:fixed?.runoutPlace==='destination'?destinationPlace:null;
    const fixedPlace=preferredRunout===pickupPlace?destinationPlace:preferredRunout===destinationPlace?pickupPlace:null;
    const runout=await runoutCharge(preferredRunout,fixedPlace);
    if(runout.charge===null)throw new Error(runout.corridor?'This pickup/drop-off creates more than 50 miles of extra travel away from the normal fixed-fare route and needs a personal quote.':'This pickup or drop-off is beyond the automatic run-out area and needs a personal quote.');
    const basePrice=fixed?fixed.price:meterFare(miles,tariff.key),price=basePrice+Number(runout.charge||0);
    lastEstimate={pickup:pickupPlace.address,destination:destinationPlace.address,date,time,miles,minutes,price,basePrice,runout:runout.charge,runoutMiles:runout.miles,runoutCorridor:runout.corridor,tariff:tariff.key,passengers:document.getElementById('passengers').selectedOptions[0].text,vehicle:document.getElementById('vehicle').selectedOptions[0].text};
    const fixedText=fixed?fixed.label:`Cornwall Council North Cornwall ${tariff.label} metered fare`;
    const runoutText=runout.charge?runout.corridor?`<span>£${runout.charge} route-corridor run-out (${runout.miles.toFixed(1)} extra mi)</span>`:`<span>£${runout.charge} run-out from Bude (${runout.miles.toFixed(1)} mi)</span>`:fixed&&runout.corridor?'<span>Route-corridor run-out £0 — pickup/drop-off is on the normal fixed-fare route</span>':'';
    box.innerHTML=`<span class="eyebrow">${fixed?'YOUR FIXED FARE':'YOUR METERED FARE'}</span><div class="fare">£${price.toFixed(2).replace(/\.00$/,'')}</div><div class="route-meta"><span>${miles.toFixed(1)} miles</span><span>about ${minutes} minutes</span><span>${fixedText}</span>${runoutText}</div><p>${fixed?`Approved fixed fare £${basePrice}${runout.charge?` + £${runout.charge} ${runout.corridor?'route-corridor ':'out-of-town '}run-out`:''}.`:`${tariff.label} meter calculation${tariff.meterOnly?' — fixed fares are disabled for this period':''}${runout.charge?` + £${runout.charge} run-out`:''}.`}</p>`;
    box.hidden=false;booking.hidden=false;box.scrollIntoView({behavior:'smooth',block:'center'});
    status.textContent=fixed?(runout.corridor?'Approved fixed fare applied with route-corridor run-out logic.':'Approved fixed fare and applicable Bude run-out charge applied.'):`${tariff.label} metered fare applied${tariff.meterOnly?' (fixed fares disabled for this period)':''}.`;
  }catch(err){
    if(box){box.hidden=true;box.innerHTML=''}if(booking)booking.hidden=true;
    status.textContent=err.message||'The route could not be calculated. Please check the addresses and try again.';
  }finally{
    button.disabled=false;
    button.innerHTML='Calculate instant estimate <span>→</span>';
  }
});

const bookingForm=document.getElementById('bookingForm');
bookingForm?.addEventListener('submit',e=>{
  e.preventDefault();if(!lastEstimate)return;
  const isBude=/^(www\.)?budetaxi\.co\.uk$/i.test(location.hostname);
  const params=new URLSearchParams({source:isBude?'budetaxi':'website',pickup:lastEstimate.pickup,destination:lastEstimate.destination,date:lastEstimate.date,time:lastEstimate.time,passengers:document.getElementById('passengers').value,vehicle:document.getElementById('vehicle').value,estimate:String(lastEstimate.price)});
  bookingForm.hidden=true;document.getElementById('pendingConfirmation').hidden=false;
  sessionStorage.setItem(isBude?'budeTaxiWebsiteEstimate':'robsTravelWebsiteEstimate',JSON.stringify(lastEstimate));
  setTimeout(()=>{window.location.href='https://book.robs-travel.co.uk/?'+params.toString()},400);
});

const now=new Date(),date=document.getElementById('date'),time=document.getElementById('time');
if(date&&time){date.min=localDateKey(now);date.value=date.min;const rounded=new Date(now.getTime()+5*60000);rounded.setMinutes(Math.floor(rounded.getMinutes()/5)*5,0,0);time.value=String(rounded.getHours()).padStart(2,'0')+':'+String(rounded.getMinutes()).padStart(2,'0')}