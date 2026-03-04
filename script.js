/* ============================================================
   script.js – Pizzeria Da Rocco, Quarrata (51039)
   Gestisce: menù dinamico, carrello, checkout, popup CRO
============================================================ */

/* ---- MENU DATA ---- */
const menuData = {
  classiche: [
    { id:1,  name:"Margherita",       emoji:"🍅", price:7.50,  desc:"Pomodoro San Marzano DOP, fior di latte, basilico fresco, olio EVO", badge:"Bestseller" },
    { id:2,  name:"Marinara",         emoji:"🧄", price:6.50,  desc:"Pomodoro, aglio, origano selvatico, olio EVO. Senza formaggio" },
    { id:3,  name:"Napoletana",       emoji:"🫒", price:8.50,  desc:"Pomodoro, mozzarella, alici del Cantabrico, capperi di Pantelleria" },
    { id:4,  name:"Quattro Stagioni", emoji:"🍄", price:9.50,  desc:"Carciofi, funghi porcini, olive taggiasche, prosciutto cotto" },
    { id:5,  name:"Capricciosa",      emoji:"🥚", price:9.50,  desc:"Pomodoro, mozzarella, prosciutto, funghi, carciofi, olive" },
    { id:6,  name:"Diavola",          emoji:"🌶️", price:9.00,  desc:"Pomodoro, mozzarella, salame piccante calabrese, olio al peperoncino", badge:"Piccante" },
  ],
  speciali: [
    { id:7,  name:"Da Rocco",         emoji:"👨‍🍳", price:12.00, desc:"Stracciatella pugliese, mortadella di Bologna IGP, pistacchio di Bronte", badge:"La nostra" },
    { id:8,  name:"Toscana",          emoji:"🥩", price:11.00, desc:"Salsiccia di Prato, fiordilatte, cipolla di Certaldo, rosmarino fresco" },
    { id:9,  name:"Tartufo",          emoji:"🖤", price:13.00, desc:"Crema di tartufo nero, mozzarella, prosciutto crudo San Daniele DOP" },
    { id:10, name:"Verdure Grill",    emoji:"🥦", price:10.50, desc:"Zucchine, melanzane, peperoni, bufala DOP, basilico. 100% vegan" },
  ],
  bianche: [
    { id:11, name:"Bianca Classica",    emoji:"🧀", price:8.00,  desc:"Fior di latte, ricotta fresca, olio EVO, pepe nero, sale marino" },
    { id:12, name:"Gorgonzola e Noci",  emoji:"🫘", price:10.00, desc:"Gorgonzola DOP, mozzarella, noci tostate, miele di acacia" },
    { id:13, name:"Patate e Rosmarino", emoji:"🥔", price:9.50,  desc:"Patate al forno, provola affumicata, rosmarino, lardo di Colonnata" },
  ],
  dolci: [
    { id:14, name:"Nutella",          emoji:"🍫", price:5.50, desc:"Pasta fritta dolce con Nutella, zucchero a velo e nocciole tritate" },
    { id:15, name:"Mele e Cannella",  emoji:"🍎", price:6.00, desc:"Mele Golden, cannella, zucchero di canna, mascarpone" },
  ],
  bevande: [
    { id:16, name:"Coca-Cola",        emoji:"🥤", price:2.50, desc:"Lattina 33cl" },
    { id:17, name:"Acqua Naturale",   emoji:"💧", price:1.50, desc:"0,5 lt" },
    { id:18, name:"Birra Moretti",    emoji:"🍺", price:3.00, desc:"Bottiglia 33cl" },
  ]
};

/* ---- STATE ---- */
let cart            = {};
let deliveryMode    = 'delivery';
let discountApplied = false;
let popupShown      = false;

/* ============================================================
   MENU RENDERING
============================================================ */
function renderMenu(cat) {
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = '';
  (menuData[cat] || []).forEach(item => {
    const card = document.createElement('article');
    card.className = 'pizza-card';
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <div class="pizza-emoji">${item.emoji}</div>
      <div class="pizza-info">
        <div class="pizza-name">${item.name}</div>
        <div class="pizza-desc">${item.desc}</div>
        ${item.badge ? `<span class="pizza-badge">${item.badge}</span>` : ''}
      </div>
      <div class="pizza-add-col">
        <span class="pizza-price">€${item.price.toFixed(2).replace('.', ',')}</span>
        <button class="btn-add"
          onclick="addToCart(${item.id})"
          aria-label="Aggiungi ${item.name} al carrello">+</button>
      </div>`;
    grid.appendChild(card);
  });
}

function filterMenu(btn, cat) {
  document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderMenu(cat);
}

/* ============================================================
   CART LOGIC
============================================================ */
function addToCart(id) {
  const item = Object.values(menuData).flat().find(i => i.id === id);
  if (!item) return;
  if (!cart[id]) cart[id] = { ...item, qty: 0 };
  cart[id].qty++;
  updateCartUI();
  showStickyBar();
  // Mostra popup sconto al primo articolo aggiunto
  if (!popupShown) setTimeout(showPopup, 800);
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];
  updateCartUI();
}

function getCartCount()    { return Object.values(cart).reduce((s, i) => s + i.qty, 0); }
function getCartSubtotal() { return Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0); }
function getCartTotal() {
  let t = getCartSubtotal();
  if (discountApplied) t *= 0.9;
  return t;
}

function updateCartUI() {
  const count = getCartCount();

  // Badge navbar
  const cc = document.getElementById('cartCount');
  cc.textContent = count;
  cc.style.display = count > 0 ? 'flex' : 'none';

  const container       = document.getElementById('cartItems');
  const empty           = document.getElementById('cartEmpty');
  const checkoutSection = document.getElementById('checkoutSection');

  if (count === 0) {
    empty.style.display = 'block';
    checkoutSection.style.display = 'none';
    container.querySelectorAll('.cart-item').forEach(el => el.remove());
    document.getElementById('cartTotal').textContent = '€0,00';
    return;
  }

  empty.style.display = 'none';
  checkoutSection.style.display = 'block';

  // Rebuild cart item list
  container.querySelectorAll('.cart-item').forEach(el => el.remove());
  Object.values(cart).forEach(item => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <span class="cart-item-emoji">${item.emoji}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">
          €${item.price.toFixed(2).replace('.', ',')} × ${item.qty} =
          €${(item.price * item.qty).toFixed(2).replace('.', ',')}
        </div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty(${item.id}, -1)" aria-label="Rimuovi uno">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id}, 1)"  aria-label="Aggiungi uno">+</button>
      </div>`;
    container.insertBefore(el, document.getElementById('cartEmpty'));
  });

  // Totals
  const total = getCartTotal();
  document.getElementById('cartTotal').textContent = '€' + total.toFixed(2).replace('.', ',');

  const disc = document.getElementById('discountLine');
  disc.innerHTML = discountApplied
    ? `<span style="color:var(--gold)">✓ Sconto ROCCO10 (-10%) applicato</span>`
    : '';

  // Sticky bar price badge
  const sp = document.getElementById('stickyPrice');
  if (sp) sp.textContent = '€' + total.toFixed(2).replace('.', ',');
}

/* ============================================================
   DELIVERY / PICKUP TOGGLE  (Phase 2 – Click & Collect)
============================================================ */
function setMode(mode) {
  deliveryMode = mode;
  document.getElementById('toggleDelivery').classList.toggle('active', mode === 'delivery');
  document.getElementById('togglePickup').classList.toggle('active',   mode === 'pickup');
  document.getElementById('deliveryAddressBlock').style.display = mode === 'delivery' ? 'block' : 'none';
  document.getElementById('pickupTimeBlock').style.display      = mode === 'pickup'   ? 'block' : 'none';
  document.getElementById('estimatedTime').textContent =
    mode === 'delivery' ? '20–30 minuti' : '15–20 minuti';
}

/* ============================================================
   PAYMENT SELECTION  (Phase 2 – gateway diretti)
============================================================ */
function selectPayment(btn) {
  document.querySelectorAll('#paymentMethods .pay-pill').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

/* ============================================================
   COUPON  (Phase 3 – CRO)
============================================================ */
function applyCoupon() {
  const code = document.getElementById('coupon').value.trim().toUpperCase();
  const msg  = document.getElementById('couponMsg');
  if (code === 'ROCCO10' && !discountApplied) {
    discountApplied = true;
    msg.innerHTML = '<span style="color:var(--gold)">✓ Sconto del 10% applicato!</span>';
    updateCartUI();
  } else if (discountApplied) {
    msg.innerHTML = '<span style="color:var(--ash)">Sconto già applicato.</span>';
  } else {
    msg.innerHTML = '<span style="color:var(--ember)">Codice non valido.</span>';
  }
}

/* ============================================================
   CART DRAWER
============================================================ */
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================================
   STICKY ORDER BAR
============================================================ */
function showStickyBar() {
  document.getElementById('stickyBar').classList.add('visible');
}

// Nascondi la sticky bar quando l'hero è visibile
const heroObserver = new IntersectionObserver(([entry]) => {
  document.getElementById('stickyBar')
    .classList.toggle('visible', !entry.isIntersecting && getCartCount() > 0);
}, { threshold: 0.1 });
heroObserver.observe(document.querySelector('.hero'));

/* ============================================================
   POPUP SCONTO PRIMO ORDINE  (Phase 3 – lead capture)
============================================================ */
function showPopup() {
  if (popupShown) return;
  popupShown = true;
  document.getElementById('popupOverlay').classList.add('open');
}

function closePopup() {
  document.getElementById('popupOverlay').classList.remove('open');
}

function claimDiscount() {
  const emailInput = document.getElementById('popupEmail');
  const email = emailInput.value.trim();
  if (!email || !email.includes('@')) {
    emailInput.style.borderColor = 'var(--ember)';
    return;
  }

  // → In produzione: POST a CRM / Mailchimp / Klaviyo endpoint
  console.log('Lead email captured:', email);

  // Mostra conferma inline
  document.getElementById('popupOverlay').innerHTML = `
    <div class="popup-card" style="text-align:center; padding:40px 24px;">
      <span style="font-size:4rem; display:block; margin-bottom:16px;">🎉</span>
      <h2 style="font-family:var(--font-display); font-size:1.6rem; font-weight:900;
          color:var(--mozzarella); margin-bottom:10px;">Codice inviato!</h2>
      <p style="color:var(--ash); font-size:0.88rem; line-height:1.6; margin-bottom:24px;">
        Controlla la tua email. Il tuo codice è
        <strong style="color:var(--gold)">ROCCO10</strong> —
        inseriscilo al checkout per il 10% di sconto.
      </p>
      <button class="btn-primary" onclick="closePopup()" style="width:100%;">
        Vai al Menù 🍕
      </button>
    </div>`;
  document.getElementById('popupOverlay').classList.add('open');
  // Chiudi automaticamente dopo 5 secondi
  setTimeout(closePopup, 5000);
}

/* ============================================================
   PLACE ORDER  (Phase 2 + Phase 3 – acquisizione dati)
============================================================ */
function placeOrder() {
  if (getCartCount() === 0) {
    alert('Aggiungi almeno un articolo al carrello.');
    return;
  }

  const firstName = document.getElementById('firstName').value.trim();
  const phone     = document.getElementById('phone').value.trim();
  const email     = document.getElementById('email').value.trim();

  if (!firstName || !phone || !email) {
    alert('Compila i campi obbligatori: nome, cellulare ed email.');
    return;
  }

  // → In produzione: POST a backend ordini (Node/PHP) + Stripe / PayPal SDK
  console.log('ORDER PLACED', {
    cart,
    deliveryMode,
    phone,
    email,
    total: getCartTotal(),
    discountApplied
  });

  closeCart();

  // Mostra schermata di conferma
  document.body.insertAdjacentHTML('beforeend', `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:900;
        display:flex;align-items:center;justify-content:center;padding:24px;"
        onclick="this.remove()">
      <div style="background:#1e160a;border-radius:24px;padding:36px 28px;
          text-align:center;max-width:360px;width:100%;">
        <span style="font-size:4rem;display:block;margin-bottom:16px;">✅</span>
        <h2 style="font-family:var(--font-display);font-size:1.7rem;font-weight:900;
            color:var(--mozzarella);margin-bottom:10px;">Ordine Confermato!</h2>
        <p style="color:var(--ash);font-size:0.88rem;line-height:1.6;margin-bottom:8px;">
          Grazie <strong style="color:var(--cream)">${firstName}</strong>!
          Riceverai un SMS al <strong style="color:var(--cream)">${phone}</strong>
          con aggiornamenti sull'ordine.
        </p>
        <p style="color:var(--gold);font-size:0.82rem;font-weight:700;">
          ⏱ Tempo stimato: ${deliveryMode === 'pickup' ? '15–20 min' : '25–35 min'}
        </p>
        <button style="margin-top:20px;background:var(--ember);color:#fff;border-radius:50px;
            padding:14px 32px;font-weight:700;font-size:0.95rem;width:100%;"
            onclick="this.closest('div[style*=fixed]').remove()">
          Perfetto!
        </button>
      </div>
    </div>`);

  // Reset stato
  cart = {};
  discountApplied = false;
  updateCartUI();
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Render menù iniziale
  renderMenu('classiche');

  // CTA hero → scroll al menù
  document.getElementById('heroOrderBtn')
    .addEventListener('click', () => {
      document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
    });

  // Apri carrello dal pulsante navbar
  document.getElementById('cartBtn')
    .addEventListener('click', openCart);

  // Popup sconto dopo 8 secondi se carrello vuoto (Phase 3 – retargeting on-site)
  setTimeout(() => {
    if (!popupShown && getCartCount() === 0) showPopup();
  }, 8000);
});
