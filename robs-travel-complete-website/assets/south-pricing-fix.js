(() => {
  const SOUTH=['widemouth','widemouth bay','crackington','crackington haven','boscastle','tintagel','camelford'];
  const BASE={lat:50.8308,lng:-4.5460,address:'Bude town centre'};
  const RUNOUT=[[5,0],[6,10],[7,12],[8,14],[9,16],[10,18],[15,20],[20,30],[25,40],[30,50],[35,60],[40,70],[45,80],[50,90]];
  const clean=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const southPlace=place=>SOUTH.some(x=>clean(place?.address).includes(clean(x)));
  const point=place=>place?.location?{lat:place.location.lat(),lng:place.location.lng(),placeId:place.placeId||'',address:place.address||''}:null;

  async function apiRoute(origin,destination){
    const r=await fetch('https://book.robs-travel.co.uk/api/route',{method:'POST',headers:{'content-type':'text/plain;charset=UTF-8'},body:JSON.stringify({origin,destination,intermediates:[]})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.ok||!data.distanceMeters)throw new Error(data.message||'Route could not be calculated');
    return {miles:data.distanceMeters/1609.344,minutes:Math.max(1,Math.round(Number(data.durationSeconds||0)/60))};
  }

  function tariff(date,time,large){
    const dt=new Date(`${date}T${time||'12:00'}:00`),mins=dt.getHours()*60+dt.getMinutes();
    const night=dt.getDay()===0||mins<420||mins>=1140;
    return large ? (night?{first:7.4,step:.5,label:'Tariff 2'}:{first:6.3,step:.45,label:'Tariff 1'})
                 : (night?{first:5,step:.4,label:'Tariff 2'}:{first:4.2,step:.3,label:'Tariff 1'});
  }
  function meterFare(miles,date,time,large){
    const t=tariff(date,time,large);
    const steps=Math.max(0,Math.ceil((Number(miles)-0.2-1e-9)/0.1));
    return {fare:t.first+(steps*t.step)+1,label:t.label};
  }
  function runoutForMiles(miles){const b=RUNOUT.find(x=>miles<=x[0]);return b?{charge:b[1],miles}:{charge:null,miles};}

  window.addEventListener('submit',async e=>{
    if(e.target?.id!=='estimateForm')return;
    let pp,dp;
    try{pp=pickupPlace;dp=destinationPlace;}catch{return;}
    if(!pp||!dp||(!southPlace(pp)&&!southPlace(dp)))return;

    e.preventDefault();e.stopImmediatePropagation();
    const button=document.getElementById('estimateButton'),status=document.getElementById('mapsStatus');
    const date=document.getElementById('date').value,time=document.getElementById('time').value;
    if(document.getElementById('vehicle').value==='executive'){status.textContent='Executive journeys are individually quoted. Please call or WhatsApp Rob’s Travel.';return;}
    button.disabled=true;button.textContent='Calculating route…';
    try{
      const origin=point(pp),destination=point(dp);
      const journey=await apiRoute(origin,destination);
      const south= southPlace(pp)?origin:destination;
      const runRoute=await apiRoute(BASE,south);
      const runout=runoutForMiles(runRoute.miles);
      if(runout.charge===null)throw new Error('This journey is beyond the automatic run-out area and needs a personal quote.');
      const vehicle=document.getElementById('vehicle').value;
      const passengers=document.getElementById('passengers').value;
      const large=vehicle==='mpv'||vehicle==='minibus'||passengers==='5-6'||passengers==='7-8';
      const meter=meterFare(journey.miles,date,time,large);
      const price=meter.fare+runout.charge;
      lastEstimate={pickup:pp.address,destination:dp.address,date,time,miles:journey.miles,minutes:journey.minutes,price,basePrice:meter.fare,runout:runout.charge,passengers:document.getElementById('passengers').selectedOptions[0].text,vehicle:document.getElementById('vehicle').selectedOptions[0].text};
      const box=document.getElementById('estimateResult');
      box.innerHTML=`<span class="eyebrow">YOUR ESTIMATED FARE</span><div class="fare">£${price.toFixed(2)}</div><div class="route-meta"><span>${journey.miles.toFixed(1)} miles</span><span>about ${journey.minutes} minutes</span><span>${meter.label} North Cornwall meter</span><span>£${runout.charge.toFixed(2)} Bude run-out (${runout.miles.toFixed(1)} mi)</span></div><p>South-of-Bude pricing: meter fare £${meter.fare.toFixed(2)} + £${runout.charge.toFixed(2)} run-out charge. Subject to booking confirmation.</p>`;
      box.hidden=false;document.getElementById('bookingForm').hidden=false;box.scrollIntoView({behavior:'smooth',block:'center'});
      status.textContent='South-of-Bude meter and run-out pricing applied.';
    }catch(err){status.textContent=err.message||'The route could not be calculated. Please check the addresses and try again.';}
    finally{button.disabled=false;button.innerHTML='Calculate instant estimate <span>→</span>';}
  },true);
})();
