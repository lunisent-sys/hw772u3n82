// ================== DATABASE ==================
let db = {
    users: [],
    products: [],
    storeLogo: "",
    storeHeader: "Produk tokokelontongzizuel",
    musicUrl: null,
    musicName: null
};

// admin default
const ADMIN_USERNAME = "ownerzizuel";
const ADMIN_PASSWORD = "tokokelontongzizuel";
const WA_NUMBER = "62895630307497";

// load database
function loadDB() {
    const stored = localStorage.getItem("tokozizuel_db");
    if (stored) {
        try {
            db = JSON.parse(stored);
        } catch (e) {
            console.log("init db");
        }
    }
    
    if (!db.users) db.users = [];
    if (!db.products) db.products = [];
    if (!db.storeLogo) db.storeLogo = "";
    if (!db.storeHeader) db.storeHeader = "Semua produk terbaru dari tokokelontongzizuel";
    
    const adminExists = db.users.some(u => u.username === ADMIN_USERNAME);
    if (!adminExists) {
        db.users.push({
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
            email: "admin@zizuel.local",
            role: "admin"
        });
    }
    
    saveDB();
}

function saveDB() {
    localStorage.setItem("tokozizuel_db", JSON.stringify(db));
    updateLogoDisplay();
}

loadDB();

// ================== STATE ==================
let currentUser = null;
let currentMusic = null;

// ================== DOM ELEMENTS ==================
const navHome = document.getElementById('navHome');
const navLogin = document.getElementById('navLogin');
const navLogout = document.getElementById('navLogout');
const mainEl = document.getElementById('mainContent');

// ================== HELPER ==================
function escapeHtml(text) {
    if (!text) return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRupiah(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function updateLogoDisplay() {
    const logoImg = document.getElementById('storeLogo');
    if (logoImg && db.storeLogo) {
        logoImg.src = db.storeLogo;
    }
}

// ================== MUSIC PLAYER ==================
function initMusicPlayer() {
    const existingPlayer = document.getElementById('globalMusicPlayer');
    if (existingPlayer) existingPlayer.remove();
    
    if (!db.musicUrl) return;
    
    const playerDiv = document.createElement('div');
    playerDiv.id = 'globalMusicPlayer';
    playerDiv.className = 'music-player';
    playerDiv.innerHTML = `
        <i class="fas fa-music" style="color:#7f9fff"></i>
        <audio controls autoplay loop>
            <source src="${db.musicUrl}" type="audio/mpeg">
        </audio>
        <span class="text-muted">${escapeHtml(db.musicName || 'musik latar')}</span>
    `;
    
    const footer = document.querySelector('.footer');
    footer.parentNode.insertBefore(playerDiv, footer);
}

// ================== PAGES ==================
function showHome() {
    if (!currentUser) {
        showAuth();
        return;
    }
    
    let html = `
        <div class="card">
            <div style="margin-bottom: 2rem;">
                <h1 style="font-size: 1.8rem; font-weight: 500; margin-bottom: 0.5rem;">${escapeHtml(db.storeHeader)}</h1>
                <p class="text-muted">selamat berbelanja, ${escapeHtml(currentUser.username)}</p>
            </div>
    `;
    
    if (db.products.length === 0) {
        html += `<p class="text-muted" style="text-align: center; padding: 3rem;">belum ada produk</p>`;
    } else {
        html += `<div class="products-grid">`;
        db.products.forEach(prod => {
            const waText = `Permisi, saya ingin membeli ${encodeURIComponent(prod.nama)} senilai Rp ${prod.harga}`;
            html += `
                <div class="product-item">
                    <img class="product-image" src="${prod.image || 'https://via.placeholder.com/240x150/1a2335/7f9fff?text=zizuel'}" 
                         onerror="this.src='https://via.placeholder.com/240x150/1a2335/7f9fff?text=zizuel'">
                    <div class="product-name">${escapeHtml(prod.nama)}</div>
                    <div class="product-desc">${escapeHtml(prod.deskripsi) || '—'}</div>
                    <div class="product-price">Rp ${formatRupiah(prod.harga)}</div>
                    <a class="wa-order" href="https://wa.me/${WA_NUMBER}?text=${waText}" target="_blank">
                        <i class="fab fa-whatsapp"></i> beli via whatsapp
                    </a>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    html += `</div>`;
    mainEl.innerHTML = html;
    
    if (currentUser.role === 'admin') {
        addAdminButton();
    }
}

function addAdminButton() {
    const adminBtn = document.createElement('button');
    adminBtn.className = 'btn';
    adminBtn.style.marginTop = '2rem';
    adminBtn.innerHTML = '<i class="fas fa-cog"></i> panel admin';
    adminBtn.onclick = showAdmin;
    mainEl.querySelector('.card').appendChild(adminBtn);
}

function showAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
        showHome();
        return;
    }
    
    let html = `
        <div class="card">
            <h2 class="section-title">⚙️ panel admin</h2>
            
            <!-- Edit Header -->
            <div class="admin-section">
                <h3 class="section-title">teks halaman</h3>
                <div class="form-group">
                    <input type="text" id="headerText" class="input-field" value="${escapeHtml(db.storeHeader)}" placeholder="teks di atas produk">
                </div>
                <button class="btn" id="saveHeaderBtn">simpan teks</button>
            </div>
            
            <!-- Logo Upload -->
            <div class="admin-section">
                <h3 class="section-title">logo toko</h3>
                <div class="form-group">
                    <label class="file-upload">
                        <i class="fas fa-upload"></i> pilih gambar logo
                        <input type="file" id="logoUpload" accept="image/*">
                    </label>
                    <span class="file-name" id="logoFileName">${db.storeLogo ? 'logo tersedia' : 'belum ada logo'}</span>
                </div>
                <button class="btn" id="saveLogoBtn">simpan logo</button>
            </div>
            
            <!-- Music Upload -->
            <div class="admin-section">
                <h3 class="section-title">musik latar (auto play)</h3>
                <div class="form-group">
                    <label class="file-upload">
                        <i class="fas fa-music"></i> pilih file MP3
                        <input type="file" id="musicUpload" accept="audio/mpeg">
                    </label>
                    <span class="file-name" id="musicFileName">${db.musicName || 'belum ada musik'}</span>
                </div>
                ${db.musicUrl ? `
                    <audio controls style="width:100%; margin-top:1rem;">
                        <source src="${db.musicUrl}" type="audio/mpeg">
                    </audio>
                ` : ''}
                <button class="btn" id="saveMusicBtn" style="margin-top:1rem;">simpan musik</button>
            </div>
            
            <!-- Add Product -->
            <div class="admin-section">
                <h3 class="section-title">tambah produk</h3>
                <div class="form-group">
                    <input type="text" id="prodName" class="input-field" placeholder="nama produk">
                </div>
                <div class="form-row">
                    <input type="number" id="prodPrice" class="input-field" placeholder="harga">
                    <input type="text" id="prodDesc" class="input-field" placeholder="deskripsi singkat">
                </div>
                <div class="form-group">
                    <label class="file-upload">
                        <i class="fas fa-image"></i> gambar produk
                        <input type="file" id="prodImage" accept="image/*">
                    </label>
                    <span class="file-name" id="prodImageName">tidak ada</span>
                </div>
                <button class="btn" id="addProductBtn">tambah produk</button>
            </div>
            
            <!-- Product List -->
            <div class="admin-section">
                <h3 class="section-title">daftar produk</h3>
                <div class="product-list-admin">
    `;
    
    if (db.products.length === 0) {
        html += `<p class="text-muted">belum ada produk</p>`;
    } else {
        db.products.forEach(prod => {
            html += `
                <div class="admin-product-row">
                    <div class="admin-product-info">
                        <span style="font-weight:500;">${escapeHtml(prod.nama)}</span>
                        <span class="text-muted">Rp ${formatRupiah(prod.harga)}</span>
                    </div>
                    <div class="admin-product-actions">
                        <button class="btn-small" onclick="editProduct('${prod.id}')">edit</button>
                        <button class="btn-small" onclick="deleteProduct('${prod.id}')">hapus</button>
                    </div>
                </div>
            `;
        });
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    mainEl.innerHTML = html;
    attachAdminEvents();
}

function attachAdminEvents() {
    // Save header
    document.getElementById('saveHeaderBtn')?.addEventListener('click', () => {
        const newHeader = document.getElementById('headerText').value.trim();
        if (newHeader) {
            db.storeHeader = newHeader;
            saveDB();
            alert('teks berhasil disimpan');
        }
    });
    
    // Logo upload
    document.getElementById('logoUpload')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                db.storeLogo = event.target.result;
                saveDB();
                document.getElementById('logoFileName').textContent = file.name;
                alert('logo berhasil disimpan');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Music upload
    document.getElementById('musicUpload')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'audio/mpeg') {
            const reader = new FileReader();
            reader.onload = (event) => {
                db.musicUrl = event.target.result;
                db.musicName = file.name;
                saveDB();
                document.getElementById('musicFileName').textContent = file.name;
                initMusicPlayer();
                alert('musik berhasil disimpan (auto play untuk semua pengguna)');
            };
            reader.readAsDataURL(file);
        } else {
            alert('hanya file MP3 yang diperbolehkan');
        }
    });
    
    // Add product
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
        const name = document.getElementById('prodName').value.trim();
        const price = document.getElementById('prodPrice').value.trim();
        const desc = document.getElementById('prodDesc').value.trim();
        const imageFile = document.getElementById('prodImage').files[0];
        
        if (!name || !price) {
            alert('nama dan harga harus diisi');
            return;
        }
        
        if (imageFile && imageFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                addProduct(name, price, desc, e.target.result);
            };
            reader.readAsDataURL(imageFile);
        } else {
            addProduct(name, price, desc, null);
        }
    });
}

function addProduct(name, price, desc, imageData) {
    const newProd = {
        id: 'p' + Date.now() + Math.random().toString(36).substr(2, 4),
        nama: name,
        harga: parseInt(price) || 0,
        deskripsi: desc || '',
        image: imageData || 'https://via.placeholder.com/240x150/1a2335/7f9fff?text=zizuel'
    };
    
    db.products.push(newProd);
    saveDB();
    alert('produk ditambahkan');
    showAdmin();
}

// Global functions for admin
window.editProduct = (id) => {
    const prod = db.products.find(p => p.id === id);
    if (!prod) return;
    
    const newName = prompt('nama produk:', prod.nama);
    if (newName === null) return;
    
    const newPrice = prompt('harga:', prod.harga);
    if (newPrice === null) return;
    
    const newDesc = prompt('deskripsi:', prod.deskripsi || '');
    
    prod.nama = newName.trim() || prod.nama;
    prod.harga = parseInt(newPrice) || prod.harga;
    prod.deskripsi = newDesc || prod.deskripsi;
    
    saveDB();
    alert('produk diperbarui');
    showAdmin();
};

window.deleteProduct = (id) => {
    if (confirm('hapus produk ini?')) {
        db.products = db.products.filter(p => p.id !== id);
        saveDB();
        showAdmin();
    }
};

function showAuth() {
    const html = `
        <div class="auth-container">
            <div class="auth-tabs">
                <button class="auth-tab active" id="tabLogin">masuk</button>
                <button class="auth-tab" id="tabRegister">daftar</button>
            </div>
            
            <div id="loginPanel">
                <div class="form-group">
                    <input type="text" id="loginUsername" class="input-field" placeholder="username">
                </div>
                <div class="form-group">
                    <input type="password" id="loginPassword" class="input-field" placeholder="password">
                </div>
                <button class="btn" id="doLogin" style="width:100%;">masuk</button>
                <div id="loginMessage"></div>
            </div>
            
            <div id="registerPanel" class="hidden">
                <div class="form-group">
                    <input type="text" id="regUsername" class="input-field" placeholder="username">
                </div>
                <div class="form-group">
                    <input type="email" id="regEmail" class="input-field" placeholder="email">
                </div>
                <div class="form-group">
                    <input type="password" id="regPassword" class="input-field" placeholder="password">
                </div>
                <button class="btn" id="doRegister" style="width:100%;">daftar</button>
                <div id="registerMessage"></div>
            </div>
        </div>
    `;
    
    mainEl.innerHTML = html;
    
    // Tab switching
    document.getElementById('tabLogin').addEventListener('click', () => {
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabRegister').classList.remove('active');
        document.getElementById('loginPanel').classList.remove('hidden');
        document.getElementById('registerPanel').classList.add('hidden');
    });
    
    document.getElementById('tabRegister').addEventListener('click', () => {
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('tabLogin').classList.remove('active');
        document.getElementById('registerPanel').classList.remove('hidden');
        document.getElementById('loginPanel').classList.add('hidden');
    });
    
    // Login
    document.getElementById('doLogin').addEventListener('click', () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const msg = document.getElementById('loginMessage');
        
        const user = db.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = { username: user.username, role: user.role };
            msg.innerHTML = '<div class="message-box success">berhasil masuk</div>';
            setTimeout(() => {
                showHome();
                updateNav();
                initMusicPlayer();
            }, 500);
        } else {
            msg.innerHTML = '<div class="message-box error">username/password salah</div>';
        }
    });
    
    // Register
    document.getElementById('doRegister').addEventListener('click', () => {
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const msg = document.getElementById('registerMessage');
        
        if (!username || !email || !password) {
            msg.innerHTML = '<div class="message-box error">semua field harus diisi</div>';
            return;
        }
        
        if (db.users.some(u => u.username === username)) {
            msg.innerHTML = '<div class="message-box error">username sudah ada</div>';
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            msg.innerHTML = '<div class="message-box error">email tidak valid</div>';
            return;
        }
        
        db.users.push({
            username,
            password,
            email,
            role: 'user'
        });
        
        saveDB();
        msg.innerHTML = '<div class="message-box success">berhasil daftar, silakan masuk</div>';
        
        document.getElementById('regUsername').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        
        setTimeout(() => {
            document.getElementById('tabLogin').click();
        }, 1500);
    });
}

function logout() {
    currentUser = null;
    const player = document.getElementById('globalMusicPlayer');
    if (player) player.remove();
    showAuth();
    updateNav();
}

function updateNav() {
    if (currentUser) {
        navLogin.classList.add('hidden');
        navLogout.classList.remove('hidden');
    } else {
        navLogin.classList.remove('hidden');
        navLogout.classList.add('hidden');
    }
}

// ================== EVENT LISTENERS ==================
navHome.addEventListener('click', showHome);
navLogin.addEventListener('click', showAuth);
navLogout.addEventListener('click', logout);

// ================== INIT ==================
showAuth();
updateNav();
updateLogoDisplay();
