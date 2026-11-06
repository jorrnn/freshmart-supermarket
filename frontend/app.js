const $ = (s) => document.querySelector(s);
const naira = n => "₦" + Number(n).toLocaleString("en-NG");
let products = [], cart = JSON.parse(localStorage.getItem("freshmart-cart") || "[]");
let currentUser = null, authMode = "login", visibleCount = 10, currentSlide = 0;

const categories = [
  ["Foodstuffs","🥬"],["Beverages","🥤"],["Wine & Spirits","🍷"],["Baby & Kids","🍼"],["Frozen Foods","🍦"],["Electronics","📺"],["Beauty & Personal Care","🧴"],["Home & Cleaning","🧹"]
];
const slides = [
  {eyebrow:"YOUR EVERYDAY MARKETPLACE",title:"Everything you need.<br><em>All in one place.</em>",text:"From farm-fresh groceries to home appliances, discover quality products at prices you'll love.",image:"https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200",bg:"#eee7f2"},
  {eyebrow:"FRESH PICKS, EVERY DAY",title:"A fresher way<br><em>to shop.</em>",text:"Fill your basket with everyday essentials, family favourites and fresh discoveries.",image:"https://images.unsplash.com/photo-1543168256-418811576931?w=1200",bg:"#e8eee6"},
  {eyebrow:"MORE FOR YOUR HOME",title:"Make home feel<br><em>even better.</em>",text:"Explore trusted appliances, personal care and all the little things that make a house a home.",image:"https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200",bg:"#f1e9df"}
];

async function api(url, options={}) {
  const response = await fetch(url, {headers:{"Content-Type":"application/json",...(options.headers||{})},credentials:"same-origin",...options});
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2500)}
function saveCart(){localStorage.setItem("freshmart-cart",JSON.stringify(cart));renderCart()}
function renderCategories(){
  $("#categoryGrid").innerHTML=categories.map(([name,icon])=>`<button class="category-card" data-category="${name}"><span class="category-icon">${icon}</span><b>${name}</b><small>Explore collection →</small></button>`).join("");
  const options=categories.map(([name])=>`<option value="${name}">${name}</option>`).join("");
  $("#categoryFilter").insertAdjacentHTML("beforeend",options);
  $("#searchCategory").insertAdjacentHTML("beforeend",options);
  $("#categoryGrid").addEventListener("click",e=>{const card=e.target.closest("[data-category]");if(card){$("#categoryFilter").value=card.dataset.category;renderProducts();$("#featured").scrollIntoView({behavior:"smooth"})}});
}
function productCard(p){
  const liked=JSON.parse(localStorage.getItem("freshmart-likes")||"[]").includes(p.id);
  return `<article class="product-card"><div class="product-image"><img loading="lazy" src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.parentElement.insertAdjacentHTML('beforeend','<span style=&quot;font-size:42px&quot;>🛍️</span>')">${p.tag?`<span class="product-tag">${p.tag}</span>`:""}<button class="heart ${liked?"liked":""}" data-like="${p.id}" aria-label="Save ${p.name}">${liked?"♥":"♡"}</button></div><p class="product-category">${p.category} · ${p.unit}</p><h3>${p.name}</h3><div class="rating">★★★★★ <span>${p.rating.toFixed(1)}</span></div><div class="product-price">${naira(p.price)} ${p.oldPrice?`<span class="old-price">${naira(p.oldPrice)}</span>`:""}</div><button class="add-btn" data-add="${p.id}">＋ Add to cart</button></article>`;
}
function getFiltered(){
  let list=[...products], query=$("#searchInput").value.trim().toLowerCase(), cat=$("#categoryFilter").value, type=$("#orderType").value, max=Number($("#priceFilter").value);
  if(query)list=list.filter(p=>(p.name+" "+p.category).toLowerCase().includes(query));
  if(cat)list=list.filter(p=>p.category===cat);
  if(type==="deal")list=list.filter(p=>p.oldPrice);
  if(type==="popular")list=list.filter(p=>p.rating>=4.8);
  list=list.filter(p=>p.price<=max);
  const sort=$("#sortFilter").value;
  if(sort==="low")list.sort((a,b)=>a.price-b.price);if(sort==="high")list.sort((a,b)=>b.price-a.price);if(sort==="rating")list.sort((a,b)=>b.rating-a.rating);
  return list;
}
function renderProducts(){
  const list=getFiltered();
  $("#productGrid").innerHTML=list.slice(0,visibleCount).map(productCard).join("")||`<div class="empty-state">No products match those filters. Try another search or category.</div>`;
  $("#loadMore").style.display=list.length>visibleCount?"inline-flex":"none";
  $("#priceLabel").textContent=naira($("#priceFilter").value);
  $("#trendingGrid").innerHTML=[...products].sort((a,b)=>b.rating-a.rating).slice(0,5).map(productCard).join("");
}
function addToCart(id){const p=products.find(x=>x.id===Number(id));if(!p)return;const found=cart.find(x=>x.id===p.id);if(found)found.quantity++;else cart.push({id:p.id,quantity:1});saveCart();toast(`${p.name} added to your cart`)}
function changeQty(id,delta){const item=cart.find(x=>x.id===Number(id));if(!item)return;item.quantity+=delta;if(item.quantity<1)cart=cart.filter(x=>x.id!==item.id);saveCart()}
function renderCart(){
  $("#cartCount").textContent=cart.reduce((s,x)=>s+x.quantity,0);
  const rows=cart.map(item=>{const p=products.find(x=>x.id===item.id);if(!p)return "";return `<div class="cart-line"><img src="${p.image}" alt=""><div><b>${p.name}</b><small>${naira(p.price)} each</small><div class="qty"><button data-qty="${p.id}" data-delta="-1">−</button><span>${item.quantity}</span><button data-qty="${p.id}" data-delta="1">+</button></div></div><b>${naira(p.price*item.quantity)}</b></div>`}).join("");
  $("#cartItems").innerHTML=rows||`<p class="muted" style="text-align:center;padding:35px 5px">Your cart is waiting for something good.</p>`;
  const subtotal=cart.reduce((sum,item)=>{const p=products.find(x=>x.id===item.id);return sum+(p?p.price*item.quantity:0)},0);
  $("#cartSubtotal").textContent=naira(subtotal);$("#checkoutTotal").textContent=naira(subtotal+(subtotal>=100000?0:2500));
}
function openPanel(el){$("#overlay").classList.add("show");el.classList.add("open","show")}
function closePanels(){$("#overlay").classList.remove("show");document.querySelectorAll(".drawer,.modal").forEach(x=>x.classList.remove("open","show"))}
function openAuth(mode="login"){authMode=mode;updateAuth();openPanel($("#authModal"))}
function updateAuth(){
  const signup=authMode==="signup";$("#authTitle").textContent=signup?"Create your account":"Welcome back";$("#authIntro").textContent=signup?"Join FreshMart for a smoother shopping experience.":"Log in to your account to continue shopping.";
  $("#nameField").classList.toggle("hidden",!signup);$("#phoneField").classList.toggle("hidden",!signup);
  $("#authForm [name=name]").required=signup;$("#authForm [name=phone]").required=false;
  $("#authSubmit").textContent=signup?"Create account →":"Log in →";
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===authMode));$("#authMessage").textContent="";
}
function updateAccount(){const b=$("#accountBtn");b.innerHTML=currentUser?`♙ <span>${currentUser.name.split(" ")[0]} · Log out</span>`:`♙ <span>Account</span>`}
async function init(){
  try{products=await api("/api/products");}catch(e){toast("Could not load products. Please refresh.");}
  renderCategories();renderProducts();renderCart();
  try{currentUser=(await api("/api/me")).user;updateAccount()}catch(e){}
  updateHours();
}
document.addEventListener("click",async e=>{
  const add=e.target.closest("[data-add]");if(add)addToCart(add.dataset.add);
  const qty=e.target.closest("[data-qty]");if(qty)changeQty(qty.dataset.qty,Number(qty.dataset.delta));
  const like=e.target.closest("[data-like]");if(like){let likes=JSON.parse(localStorage.getItem("freshmart-likes")||"[]");const id=Number(like.dataset.like);likes=likes.includes(id)?likes.filter(x=>x!==id):[...likes,id];localStorage.setItem("freshmart-likes",JSON.stringify(likes));renderProducts()}
  if(e.target.closest("#cartBtn"))openPanel($("#cartDrawer"));
  if(e.target.closest("#accountBtn")){if(currentUser){if(confirm("Log out of your FreshMart account?")){await api("/api/logout",{method:"POST"});currentUser=null;updateAccount();toast("You have logged out.")}}else openAuth("login")}
  if(e.target.closest("[data-close]"))closePanels();
  if(e.target.matches("[data-tab]")){authMode=e.target.dataset.tab;updateAuth()}
});
$("#overlay").addEventListener("click",closePanels);
$("#menuToggle").addEventListener("click",()=>$("#mainNav").classList.toggle("open"));
$("#mainNav").addEventListener("click",e=>{if(e.target.tagName==="A")$("#mainNav").classList.remove("open")});
$("#searchBtn").addEventListener("click",()=>{visibleCount=20;renderProducts();$("#featured").scrollIntoView({behavior:"smooth"})});
$("#searchInput").addEventListener("keydown",e=>{if(e.key==="Enter"){$("#searchBtn").click()}});
["categoryFilter","orderType","sortFilter","priceFilter","searchCategory"].forEach(id=>$("#"+id).addEventListener("change",()=>{if(id==="searchCategory")$("#categoryFilter").value=$("#searchCategory").value;visibleCount=10;renderProducts()}));
$("#loadMore").addEventListener("click",()=>{visibleCount+=10;renderProducts()});
$("#checkoutBtn").addEventListener("click",()=>{if(!cart.length){toast("Your cart is empty.");return}closePanels();if(!currentUser){openAuth("login");toast("Please log in before checkout.");return}renderCart();openPanel($("#checkoutModal"))});
$("#authForm").addEventListener("submit",async e=>{
  e.preventDefault();const form=new FormData(e.target),payload=Object.fromEntries(form.entries());
  try{const data=await api(authMode==="signup"?"/api/signup":"/api/login",{method:"POST",body:JSON.stringify(payload)});currentUser=data.user;updateAccount();closePanels();toast(`Welcome${currentUser.name?" back, "+currentUser.name.split(" ")[0]:""}!`);e.target.reset()}
  catch(err){$("#authMessage").textContent=err.message}
});
$("#checkoutForm").addEventListener("submit",async e=>{
  e.preventDefault();const form=new FormData(e.target),payload=Object.fromEntries(form.entries());
  $("#checkoutMessage").textContent="Creating your order...";
  try{const data=await api("/api/orders",{method:"POST",body:JSON.stringify({items:cart,customer:{address:payload.address,phone:payload.phone},paymentMethod:payload.paymentMethod})});cart=[];saveCart();closePanels();$("#successOrderId").textContent=data.order.id;openPanel($("#successModal"));e.target.reset();$("#checkoutMessage").textContent=""}
  catch(err){$("#checkoutMessage").textContent=err.message}
});
$("#trackForm").addEventListener("submit",async e=>{e.preventDefault();const out=$("#trackingResult");out.textContent="Checking...";try{const data=await api("/api/track/"+encodeURIComponent($("#trackingId").value.trim()));out.innerHTML=`<b>${data.id}</b> — ${data.status}<br><small>${data.timeline.join(" · ")}</small>`}catch(err){out.textContent=err.message}});
function updateHours(){const now=new Date(),day=now.getDay(),mins=now.getHours()*60+now.getMinutes(),open=day===0?600:480,close=day===0?1140:1260,isOpen=mins>=open&&mins<close;$("#openStatus").textContent=isOpen?"● We are open right now":"● We are currently closed";$("#openStatus").style.color=isOpen?"#477b65":"#b46a55"}
setInterval(()=>{currentSlide=(currentSlide+1)%slides.length;showSlide()},5500);
function showSlide(){const s=slides[currentSlide];$("#slideEyebrow").textContent=s.eyebrow;$("#slideTitle").innerHTML=s.title;$("#slideText").textContent=s.text;$(".hero").style.background=s.bg;$(".hero-photo").style.backgroundImage=`url("${s.image}")`;$("#slideDots").querySelectorAll("button").forEach((b,i)=>b.classList.toggle("active",i===currentSlide))}
$("#slideDots").addEventListener("click",e=>{const i=[...$("#slideDots").children].indexOf(e.target);if(i>=0){currentSlide=i;showSlide()}});
$("#chatLaunch").addEventListener("click",()=>$("#chatBox").classList.toggle("show"));$("#chatClose").addEventListener("click",()=>$("#chatBox").classList.remove("show"));
$("#chatForm").addEventListener("submit",async e=>{e.preventDefault();const input=$("#chatInput"),message=input.value.trim();if(!message)return;$("#chatMessages").insertAdjacentHTML("beforeend",`<div class="user-message">${escapeHTML(message)}</div>`);input.value="";try{const data=await api("/api/chat",{method:"POST",body:JSON.stringify({message})});$("#chatMessages").insertAdjacentHTML("beforeend",`<div class="bot-message">${escapeHTML(data.reply)}</div>`)}catch(err){$("#chatMessages").insertAdjacentHTML("beforeend",`<div class="bot-message">Sorry, chat is temporarily unavailable.</div>`)}$("#chatMessages").scrollTop=$("#chatMessages").scrollHeight});
function escapeHTML(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
init();
