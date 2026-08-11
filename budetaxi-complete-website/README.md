# Bude Taxi website

Production-ready static site prepared for `www.budetaxi.co.uk`.

Cloudflare Pages root/build directory: `budetaxi-complete-website`

The booking estimator uses the same secure Google configuration and route API as Rob's Travel, but passes `source=budetaxi` into the booking system. Contact number remains 07771 824141 and the site states that bookings are operated by Rob's Travel Taxis.

Before going live, connect both `budetaxi.co.uk` and `www.budetaxi.co.uk` in Cloudflare Pages and redirect the non-www hostname to the www canonical hostname.