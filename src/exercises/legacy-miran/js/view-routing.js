/* ================= VIEW ROUTING ================= */
function show(v){ document.querySelectorAll('.view').forEach(x=>x.classList.remove('active')); $('view-'+v).classList.add('active'); window.scrollTo(0,0); }

