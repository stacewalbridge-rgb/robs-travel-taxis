
const menuBtn = document.querySelector('.menu');
const navLinks = document.querySelector('.navlinks');
if(menuBtn) menuBtn.addEventListener('click',()=>navLinks.classList.toggle('open'));

function sendBooking(e){
  e.preventDefault();
  const f = e.target;
  const data = new FormData(f);
  const lines = [
    "Hello Rob's Travel Taxis, I'd like a quote:",
    "",
    "Name: " + (data.get('name')||''),
    "Phone: " + (data.get('phone')||''),
    "Pickup: " + (data.get('pickup')||''),
    "Destination: " + (data.get('destination')||''),
    "Date: " + (data.get('date')||''),
    "Time: " + (data.get('time')||''),
    "Passengers: " + (data.get('passengers')||''),
    "Vehicle: " + (data.get('vehicle')||''),
    "Notes: " + (data.get('notes')||'')
  ];
  window.open("https://wa.me/447771824141?text="+encodeURIComponent(lines.join("\n")),"_blank");
  return false;
}
