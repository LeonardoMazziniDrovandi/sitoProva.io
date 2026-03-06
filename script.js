/* ============================================================
   script.js – Pizzeria Da Rocco, Quarrata (51039)
   SheetDB API: https://sheetdb.io/api/v1/ru78o5h25a0cx
   Colonne Google Sheet: id | email | password | nome | cognome | telefono | data_registrazione | sconto_usato
============================================================ */

const SHEETDB        = 'https://sheetdb.io/api/v1/ru78o5h25a0cx';
const SHEETDB_ORDERS = 'https://sheetdb.io/api/v1/dknnwb5fpszzz';

/* ============================================================
   MENU DATA
============================================================ */
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
    { id:16, name:"Coca-Cola",       emoji:"🥤", price:2.50, desc:"Lattina 33cl" },
    { id:17, name:"Acqua Naturale",  emoji:"💧", price:1.50, desc:"0,5 lt" },
    { id:18, name:"Birra Moretti",   emoji:"🍺", price:3.00, desc:"Bottiglia 33cl" },
  ]
};

/* ============================================================
   STATE
============================================================ */
let cart            = {};
let deliveryMode    = 'delivery';
let discountApplied = false;
let popupShown      = false;
let currentUser     = null;   // oggetto utente loggato

/* ============================================================
   UTILITY
============================================================ */

/** SHA-256 hash – usare bcrypt lato server in produzione */
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Genera un ID univoco semplice */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

/** Formatta la data di oggi come YYYY-MM-DD */
function today() {
  return new Date().toISOString().slice(0, 10);
}

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
        <button class="btn-add" onclick="addToCart(${item.id})" aria-label="Aggiungi ${item.name}">+</button>
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
  cc.classList.toggle('visible', count > 0);

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

  // Mostra login gate oppure checkout in base allo stato login
  const loginGate = document.getElementById('loginGate');
  if (!currentUser) {
    loginGate.style.display    = 'block';
    checkoutSection.style.display = 'none';
  } else {
    loginGate.style.display    = 'none';
    checkoutSection.style.display = 'block';
  }

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
        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
      </div>`;
    container.insertBefore(el, document.getElementById('cartEmpty'));
  });

  const total = getCartTotal();
  document.getElementById('cartTotal').textContent = '€' + total.toFixed(2).replace('.', ',');
  const disc = document.getElementById('discountLine');
  disc.innerHTML = discountApplied ? `<span style="color:var(--gold)">✓ Sconto ROCCO10 (-10%) applicato</span>` : '';
  const sp = document.getElementById('stickyPrice');
  if (sp) sp.textContent = '€' + total.toFixed(2).replace('.', ',');
}

/* ============================================================
   DELIVERY / PICKUP
============================================================ */
function setMode(mode) {
  deliveryMode = mode;
  document.getElementById('toggleDelivery').classList.toggle('active', mode === 'delivery');
  document.getElementById('togglePickup').classList.toggle('active',   mode === 'pickup');
  document.getElementById('deliveryAddressBlock').style.display = mode === 'delivery' ? 'block' : 'none';
  document.getElementById('pickupTimeBlock').style.display      = mode === 'pickup'   ? 'block' : 'none';
  document.getElementById('estimatedTime').textContent = mode === 'delivery' ? '20–30 minuti' : '15–20 minuti';
}

/* ============================================================
   PAYMENT
============================================================ */
function selectPayment(btn) {
  document.querySelectorAll('#paymentMethods .pay-pill').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

/* ============================================================
   COUPON
============================================================ */
async function applyCoupon() {
  const code  = document.getElementById('coupon').value.trim().toUpperCase();
  const msg   = document.getElementById('couponMsg');
  const phone = document.getElementById('checkPhone').value.trim();

  if (code !== 'ROCCO10') {
    msg.innerHTML = '<span style="color:var(--ember)">❌ Codice non valido.</span>';
    return;
  }
  if (discountApplied) {
    msg.innerHTML = '<span style="color:var(--ash)">Sconto già applicato.</span>';
    return;
  }

  // Il numero di telefono è obbligatorio per usare il coupon
  if (!phone) {
    msg.innerHTML = '<span style="color:var(--ember)">⚠️ Inserisci prima il numero di cellulare.</span>';
    document.getElementById('checkPhone').focus();
    return;
  }

  msg.innerHTML = '<span style="color:var(--gold)">⏳ Verifica in corso…</span>';

  try {
    // Controlla su SheetDB se questo numero ha già usato lo sconto
    const res  = await fetch(`${SHEETDB}/search?telefono=${encodeURIComponent(phone)}`);
    const rows = await res.json();

    if (Array.isArray(rows) && rows.length > 0 && rows[0].sconto_usato === 'true') {
      msg.innerHTML = '<span style="color:var(--ember)">❌ Questo numero ha già usato il codice ROCCO10.</span>';
      return;
    }

    // Sconto valido
    discountApplied = true;
    msg.innerHTML = '<span style="color:var(--gold)">✓ Sconto del 10% applicato!</span>';
    updateCartUI();

  } catch (err) {
    console.error(err);
    msg.innerHTML = '<span style="color:var(--ember)">❌ Errore di connessione. Riprova.</span>';
  }
}

/* ============================================================
   CART DRAWER
============================================================ */
function openCart() {
  closeAuth();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  document.getElementById('overlay').onclick = closeCart;
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================================
   STICKY BAR
============================================================ */
function showStickyBar() {
  document.getElementById('stickyBar').classList.add('visible');
}

/* ============================================================
   POPUP SCONTO
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
  console.log('Lead email popup:', email);
  document.getElementById('popupOverlay').innerHTML = `
    <div class="popup-card" style="text-align:center;padding:40px 24px;">
      <span style="font-size:4rem;display:block;margin-bottom:16px;">🎉</span>
      <h2 style="font-family:var(--font-display);font-size:1.6rem;font-weight:900;color:var(--mozzarella);margin-bottom:10px;">Codice inviato!</h2>
      <p style="color:var(--ash);font-size:0.88rem;line-height:1.6;margin-bottom:24px;">
        Controlla la tua email. Usa il codice <strong style="color:var(--gold)">ROCCO10</strong> al checkout.
      </p>
      <button class="btn-primary" onclick="closePopup()" style="width:100%;">Vai al Menù 🍕</button>
    </div>`;
  document.getElementById('popupOverlay').classList.add('open');
  setTimeout(closePopup, 5000);
}

/* ============================================================
   PLACE ORDER
============================================================ */
/* ---- Helper: metodo di pagamento selezionato ---- */
function getSelectedPayment() {
  const selected = document.querySelector('#paymentMethods .pay-pill.selected');
  return selected ? (selected.dataset.method || selected.textContent.trim()) : 'Non specificato';
}

/* ---- Helper: riepilogo articoli come stringa leggibile ---- */
function cartItemsToString() {
  return Object.values(cart)
    .map(i => `${i.name} x${i.qty} (€${(i.price * i.qty).toFixed(2)})`)
    .join(' | ');
}

async function placeOrder() {
  // 1. GATE: solo utenti loggati
  if (!currentUser) {
    closeCart();
    openAuth();
    return;
  }

  if (getCartCount() === 0) { alert('Aggiungi almeno un articolo al carrello.'); return; }

  // 2. Validazione campi obbligatori
  const firstName = document.getElementById('firstName').value.trim();
  const lastName  = document.getElementById('lastName').value.trim();
  const phone     = document.getElementById('checkPhone').value.trim();
  const email     = document.getElementById('checkEmail').value.trim();
  const notes     = document.getElementById('notes').value.trim();
  const payment   = getSelectedPayment();

  let address = '';
  let orario  = '';
  if (deliveryMode === 'delivery') {
    const via  = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const cap  = document.getElementById('cap').value.trim();
    if (!via) { alert("Inserisci l'indirizzo di consegna."); return; }
    address = `${via}, ${city} ${cap}`;
  } else {
    orario = document.getElementById('pickupTime').value;
  }

  if (!firstName || !phone || !email) {
    alert('Compila i campi obbligatori: nome, cellulare ed email.');
    return;
  }

  // 3. Disabilita bottone durante l'invio
  const btn = document.querySelector('.btn-checkout');
  btn.disabled = true;
  btn.textContent = '⏳ Invio ordine…';

  const orderId = 'ORD-' + genId().toUpperCase();
  const total   = getCartTotal();

  try {
    // 4. Salva ordine su SheetDB foglio "Ordini"
    const orderPayload = {
      data: [{
        id_ordine:    orderId,
        utente_id:    currentUser.uid || currentUser.telefono,
        nome:         firstName,
        cognome:      lastName,
        telefono:     phone,
        email:        email,
        modalita:     deliveryMode === 'delivery' ? 'Consegna' : 'Ritiro',
        indirizzo:    deliveryMode === 'delivery' ? address : ('Ritiro ore ' + orario),
        note:         notes,
        items:        cartItemsToString(),
        totale:       '€' + total.toFixed(2),
        sconto:       discountApplied ? 'ROCCO10 -10%' : 'Nessuno',
        pagamento:    payment,
        stato:        'In attesa',
        data_ordine:  new Date().toISOString().slice(0, 16).replace('T', ' ')
      }]
    };

    const orderRes = await fetch(SHEETDB_ORDERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    if (!orderRes.ok) throw new Error('Errore salvataggio ordine');

    // 5. Se coupon usato → segna sconto_usato su foglio Utenti
    if (discountApplied) {
      try {
        await fetch(`${SHEETDB}/uid/${encodeURIComponent(currentUser.uid)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { sconto_usato: 'true' } })
        });
        currentUser.sconto_usato = 'true';
        updateScontoStatus();
      } catch(e) { console.warn('Patch sconto_usato fallita:', e); }
    }

    // 6. Successo
    closeCart();
    btn.disabled = false;
    btn.textContent = '🍕 Conferma Ordine';

    document.body.insertAdjacentHTML('beforeend', `
      <div id="orderConfirm" style="position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:900;display:flex;align-items:center;justify-content:center;padding:24px;">
        <div style="background:#1e160a;border-radius:24px;padding:36px 24px;text-align:center;max-width:380px;width:100%;">
          <span style="font-size:4rem;display:block;margin-bottom:16px;">✅</span>
          <h2 style="font-family:var(--font-display);font-size:1.7rem;font-weight:900;color:var(--mozzarella);margin-bottom:10px;">Ordine Confermato!</h2>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px;margin-bottom:16px;">
            <p style="color:var(--gold);font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;">Numero ordine</p>
            <p style="font-family:'Courier New',monospace;font-size:1.1rem;font-weight:900;color:var(--cream);">${orderId}</p>
          </div>
          <p style="color:var(--ash);font-size:0.85rem;line-height:1.6;margin-bottom:6px;">
            Ciao <strong style="color:var(--cream)">${firstName}</strong>! Il tuo ordine è stato ricevuto.
          </p>
          <p style="color:var(--ash);font-size:0.82rem;margin-bottom:6px;">
            📱 SMS di conferma al <strong style="color:var(--cream)">${phone}</strong>
          </p>
          <p style="color:var(--ash);font-size:0.82rem;margin-bottom:4px;">
            💳 Pagamento: <strong style="color:var(--cream)">${payment}</strong>
          </p>
          <p style="color:var(--ash);font-size:0.82rem;margin-bottom:16px;">
            ${deliveryMode === 'delivery'
              ? '🛵 Consegna a: <strong style="color:var(--cream)">' + address + '</strong>'
              : '🏪 Ritiro: <strong style="color:var(--cream)">' + orario + '</strong>'}
          </p>
          <p style="color:var(--gold);font-size:0.9rem;font-weight:700;margin-bottom:20px;">
            ⏱ Tempo stimato: ${deliveryMode === 'pickup' ? '15–20 min' : '25–35 min'}
          </p>
          <button style="background:var(--ember);color:#fff;border-radius:50px;padding:14px 32px;font-weight:700;font-size:0.95rem;width:100%;cursor:pointer;border:none;"
            onclick="document.getElementById('orderConfirm').remove()">Perfetto! 🍕</button>
        </div>
      </div>`);

    cart = {};
    discountApplied = false;
    updateCartUI();

  } catch(err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = '🍕 Conferma Ordine';
    alert("❌ Errore durante l'invio dell'ordine. Controlla la connessione e riprova.");
  }
}

/* ============================================================
   AUTH – Apri / Chiudi drawer
============================================================ */
function openAuth() {
  closeCart();
  if (currentUser) {
    showLoggedPanel();
  } else {
    switchTab('login');
  }
  document.getElementById('authDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  document.getElementById('overlay').onclick = closeAuth;
  document.body.style.overflow = 'hidden';
}

function closeAuth() {
  document.getElementById('authDrawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================================
   AUTH – Switch tab
============================================================ */
function switchTab(tab) {
  document.getElementById('panelLogin').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('panelRegister').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('panelLogged').style.display   = 'none';
  document.getElementById('authTabs').style.display      = 'flex';
  document.getElementById('tabLogin').classList.toggle('active',    tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  clearAuthMsgs();
}

function clearAuthMsgs() {
  ['loginMsg','registerMsg'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = '';
    el.className = 'auth-msg';
  });
}

function setMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'auth-msg ' + type;
}

/* ============================================================
   AUTH – Panel loggato
============================================================ */
function showLoggedPanel() {
  document.getElementById('panelLogin').style.display    = 'none';
  document.getElementById('panelRegister').style.display = 'none';
  document.getElementById('panelLogged').style.display   = 'block';
  document.getElementById('authTabs').style.display      = 'none';
  if (currentUser) {
    document.getElementById('loggedName').textContent  = currentUser.nome + (currentUser.cognome ? ' ' + currentUser.cognome : '');
    document.getElementById('loggedEmail').textContent = '✉️ ' + currentUser.email;
    document.getElementById('loggedPhone').textContent = currentUser.telefono ? '📱 ' + currentUser.telefono : '';
    updateScontoStatus();
  }
}

function updateScontoStatus() {
  const el = document.getElementById('scontoStatus');
  if (!el) return;
  if (currentUser && currentUser.sconto_usato === 'true') {
    el.textContent = '✓ Sconto già utilizzato';
    el.style.color = 'var(--ash)';
  } else {
    el.textContent = '🎁 Non ancora utilizzato — usalo al prossimo ordine!';
    el.style.color = 'var(--gold)';
  }
}

function updateAuthButton() {
  const btn   = document.getElementById('authBtn');
  const label = document.getElementById('authBtnLabel');
  if (currentUser) {
    label.textContent = '👤 ' + currentUser.nome;
    btn.classList.add('logged-in');
  } else {
    label.textContent = '👤 Accedi';
    btn.classList.remove('logged-in');
  }
}

/* ============================================================
   AUTH – REGISTRAZIONE
   Campi inviati: id | email | password | nome | cognome | telefono | data_registrazione | sconto_usato
============================================================ */
async function handleRegister() {
  const nome     = document.getElementById('regNome').value.trim();
  const cognome  = document.getElementById('regCognome').value.trim();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const telefono = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!nome || !email || !telefono || !password) {
    setMsg('registerMsg', '⚠️ Compila tutti i campi obbligatori.', 'error'); return;
  }
  if (!email.includes('@')) {
    setMsg('registerMsg', '⚠️ Email non valida.', 'error'); return;
  }
  if (password.length < 6) {
    setMsg('registerMsg', '⚠️ Password troppo corta (min. 6 caratteri).', 'error'); return;
  }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Verifica in corso…';
  setMsg('registerMsg', '⏳ Controllo disponibilità…', 'loading');

  try {
    // 1. Controlla email duplicata
    const checkEmail = await fetch(`${SHEETDB}/search?email=${encodeURIComponent(email)}`);
    const byEmail    = await checkEmail.json();
    if (Array.isArray(byEmail) && byEmail.length > 0) {
      setMsg('registerMsg', '❌ Email già registrata. Accedi.', 'error');
      btn.disabled = false; btn.textContent = '🍕 Crea Account'; return;
    }

    // 2. Controlla numero di telefono duplicato
    const checkPhone = await fetch(`${SHEETDB}/search?telefono=${encodeURIComponent(telefono)}`);
    const byPhone    = await checkPhone.json();
    if (Array.isArray(byPhone) && byPhone.length > 0) {
      setMsg('registerMsg', '❌ Numero di cellulare già registrato.', 'error');
      btn.disabled = false; btn.textContent = '🍕 Crea Account'; return;
    }

    const hashedPw = await sha256(password);
    const newId    = genId();

    const res = await fetch(SHEETDB, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          uid:                newId,
          email:              email,
          password:           hashedPw,
          nome:               nome,
          cognome:            cognome,
          telefono:           telefono,
          data_registrazione: today(),
          sconto_usato:       'false'
        }]
      })
    });

    const result = await res.json();
    if (result.created === 1 || res.ok) {
      currentUser = { uid: newId, nome, cognome, email, telefono, sconto_usato: 'false' };
      updateAuthButton();
      prefillCheckout();
      updateCartUI();   // aggiorna login gate nel carrello
      setMsg('registerMsg', '✅ Benvenuto/a ' + nome + '! Account creato.', 'success');
      setTimeout(showLoggedPanel, 1200);
    } else {
    alert("❌ Errore durante l'invio dell'ordine. Controlla la connessione e riprova.");
    }
  } catch (err) {
    console.error(err);
    setMsg('registerMsg', '❌ Errore di connessione. Controlla la rete.', 'error');
  }

  btn.disabled = false;
  btn.textContent = '🍕 Crea Account';
}

/* ============================================================
   AUTH – LOGIN
============================================================ */
async function handleLogin() {
  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    setMsg('loginMsg', '⚠️ Inserisci email e password.', 'error'); return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Accesso…';
  setMsg('loginMsg', '⏳ Verifica credenziali…', 'loading');

  try {
    const hashedPw = await sha256(password);
    const res      = await fetch(`${SHEETDB}/search?email=${encodeURIComponent(email)}`);
    const rows     = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      setMsg('loginMsg', '❌ Email non trovata. Registrati prima.', 'error');
      btn.disabled = false;
      btn.textContent = '🔑 Accedi';
      return;
    }

    const user = rows[0];
    if (user.password !== hashedPw) {
      setMsg('loginMsg', '❌ Password errata.', 'error');
      btn.disabled = false;
      btn.textContent = '🔑 Accedi';
      return;
    }

    // Login OK
    console.log('[AUTH] user da SheetDB:', user);  // debug
    currentUser = {
      uid:          user.uid || '',
      nome:         user.nome || '',
      cognome:      user.cognome || '',
      email:        user.email,
      telefono:     user.telefono || '',
      sconto_usato: user.sconto_usato || 'false'
    };

    updateAuthButton();
    prefillCheckout();
    updateCartUI();   // aggiorna login gate nel carrello
    setMsg('loginMsg', '✅ Bentornato/a ' + currentUser.nome + '!', 'success');
    setTimeout(showLoggedPanel, 900);

  } catch (err) {
    console.error(err);
    setMsg('loginMsg', '❌ Errore di connessione. Controlla la rete.', 'error');
  }

  btn.disabled = false;
  btn.textContent = '🔑 Accedi';
}

/* ============================================================
   AUTH – LOGOUT
============================================================ */
function handleLogout() {
  currentUser = null;
  updateAuthButton();
  closeAuth();
  // Pulisce il checkout
  ['firstName','lastName','checkPhone','checkEmail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/* ============================================================
   PREFILL CHECKOUT dai dati utente
============================================================ */
function prefillCheckout() {
  if (!currentUser) return;
  const map = {
    firstName:  currentUser.nome,
    lastName:   currentUser.cognome,
    checkPhone: currentUser.telefono,
    checkEmail: currentUser.email
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  renderMenu('classiche');

  document.getElementById('heroOrderBtn').addEventListener('click', () => {
    document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('cartBtn').addEventListener('click', openCart);

  // Sticky bar: mostra/nascondi in base all'hero
  const heroObserver = new IntersectionObserver(([entry]) => {
    const bar = document.getElementById('stickyBar');
    if (!entry.isIntersecting && getCartCount() > 0) {
      bar.classList.add('visible');
    } else {
      bar.classList.remove('visible');
    }
  }, { threshold: 0.1 });
  heroObserver.observe(document.querySelector('.hero'));

  // Popup sconto dopo 8 secondi se carrello vuoto
  setTimeout(() => {
    if (!popupShown && getCartCount() === 0) showPopup();
  }, 8000);
});
