// ================== DATABASE SIM (login.json memory) ==================
let db = {
    users: [],
    products: [],
    storeLogo: "https://via.placeholder.com/42x42/0a1428/9bbaff?text=Z"
};

// inisialisasi admin default (ownerzizuel)
const ADMIN_USERNAME = "ownerzizuel";
const ADMIN_PASSWORD = "tokokelontongzizuel";

// load dari localStorage (sebagai "login.json" memori)
function loadDB() {
    const stored = localStorage.getItem("tokozizuel_db");
    if (stored) {
        try {
            db = JSON.parse(stored);
        } catch (e) { 
            console.warn("db corrupt, menggunakan default"); 
        }
    }
    
    // pastikan struktur benar
    if (!db.users) db.users = [];
    if (!db.products) db.products = [];
    if (!db.storeLogo) db.storeLogo = "https://via.placeholder.com/42x42/0a1428/9bbaff?text=Z";

    // pastikan admin selalu ada
    const adminExists = db.users.some(u => u.username === ADMIN_USERNAME);
    if (!adminExists) {
        db.users.push({
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
            email: "admin@zizuel.local",
            role: "admin"
        });
    }
    
    // pastikan setiap user punya role
    db.users = db.users.map(u => ({ 
        ...u, 
        role: u.username === ADMIN_USERNAME ? 'admin' : (u.role || 'user') 
    }));
    
    saveDB();
}

function saveDB() {
    localStorage.setItem("tokozizuel_db", JSON.stringify(db));
    // update logo jika ada
    const logoImg = document.getElementById('storeLogoImg');
    if (logoImg) logoImg.src = db.storeLogo || "https://via.placeholder.com/42x42/0a1428/9bbaff?text=Z";
}

// inisialisasi database
loadDB();

// state login
let currentUser = null;

// elemen DOM
const navHome = document.getElementById('navHome');
const navAdmin = document.getElementById('navAdminPanel');
const navLogin = document.getElementById('navLogin');
const navLogout = document.getElementById('navLogout');
const mainEl = document.getElementById('mainContent');
const discordLink = document.getElementById('discordLink');

// ================== HELPER FUNCTIONS ==================
function escapeHtml(unsafe) {
    if (!unsafe) return unsafe;
    return unsafe.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// ================== RENDER NAVIGATION ==================
function updateNavigation() {
    if (!currentUser) {
        navLogin.classList.remove('hidden');
        navLogout.classList.add('hidden');
        navAdmin.classList.add('hidden');
    } else {
        navLogin.classList.add('hidden');
        navLogout.classList.remove('hidden');
        if (currentUser.role === 'admin') {
            navAdmin.classList.remove('hidden');
        } else {
            navAdmin.classList.add('hidden');
        }
    }
    
    // hapus active class
    [navHome, navAdmin, navLogin].forEach(b => b.classList.remove('active'));
}

// ================== PRODUCT FUNCTIONS ==================
window.deleteProduct = (id) => {
    if (currentUser?.role !== 'admin') {
        alert('Hanya admin yang dapat menghapus produk');
        return;
    }
    
    if (confirm('Yakin ingin menghapus produk ini?')) {
        db.products = db.products.filter(p => p.id != id);
        saveDB();
        showHome();
    }
};

window.editProduct = (id) => {
    if (currentUser?.role !== 'admin') {
        alert('Hanya admin yang dapat mengedit produk');
        return;
    }
    
    const prod = db.products.find(p => p.id == id);
    if (!prod) return;
    
    // buka panel admin dan isi form
    showAdmin();
    
    // isi form dengan data produk
    setTimeout(() => {
        document.getElementById('prodNama').value = prod.nama || '';
        document.getElementById('prodHarga').value = prod.harga || '';
        document.getElementById('prodDesc').value = prod.deskripsi || '';
        
        // ubah tombol simpan untuk update
        const btn = document.getElementById('saveProductBtn');
        btn.innerHTML = '<i class="fas fa-pen"></i> Update Produk';
        btn.dataset.editId = id;
        
        // hapus event listener lama dan tambah baru
        btn.replaceWith(btn.cloneNode(true));
        const newBtn = document.getElementById('saveProductBtn');
        newBtn.addEventListener('click', function() {
            updateProduct(id);
        });
    }, 100);
};

function updateProduct(id) {
    const prod = db.products.find(p => p.id == id);
    if (!prod) return;
    
    const nama = document.getElementById('prodNama').value.trim();
    const harga = document.getElementById('prodHarga').value.trim();
    const desc = document.getElementById('prodDesc').value.trim();
    
    if (!nama || !harga) {
        alert('Nama dan harga wajib diisi');
        return;
    }
    
    prod.nama = nama;
    prod.harga = parseInt(harga) || 0;
    prod.deskripsi = desc;
    
    // handle image jika ada file baru
    const imgFile = document.getElementById('prodImageInput').files[0];
    if (imgFile && imgFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            prod.image = e.target.result;
            saveDB();
            alert('Produk berhasil diupdate!');
            showAdmin();
        };
        reader.readAsDataURL(imgFile);
    } else {
        saveDB();
        alert('Produk berhasil diupdate!');
        showAdmin();
    }
}

// ================== PAGES ==================
function showHome() {
    let html = `<div class="glass-panel">
        <h2 style="font-size:2.5rem; margin-bottom:0.5rem; font-weight:500;">
            <i class="fas fa-tag"></i> Semua Produk
        </h2>
        <p style="color:#aab9e0;">Koleksi kelontong modern Zizuel — klik WhatsApp untuk order</p>`;

    if (db.products.length === 0) {
        html += `<div style="padding: 3rem; text-align:center; color:#99a9dd">
            <i class="fas fa-box-open" style="font-size:3rem; opacity:0.5;"></i>
            <p>✨ belum ada produk, admin segera tambah</p>
        </div>`;
    } else {
        html += `<div class="product-grid">`;
        db.products.forEach((prod) => {
            const prodId = prod.id || `prod_${Date.now()}_${Math.random()}`;
            if (!prod.id) prod.id = prodId;
            
            html += `<div class="product-card" data-id="${prod.id}">
                <img class="product-img" src="${prod.image || 'https://via.placeholder.com/260x170/1a2540/7d9eff?text=Z+Produk'}" 
                     alt="produk" onerror="this.src='https://via.placeholder.com/260x170/1a2540/7d9eff?text=Z+Produk'">
                <div class="product-title">${escapeHtml(prod.nama) || 'Tanpa Nama'}</div>
                <div class="product-desc">${escapeHtml(prod.deskripsi) || '—'}</div>
                <div class="product-price">Rp ${formatRupiah(prod.harga || 0)}</div>`;

            // whatsapp button per produk
            const waText = `Saya%20tertarik%20dengan%20produk%20${encodeURIComponent(prod.nama)}%20harga%20Rp%20${prod.harga}`;
            html += `<a class="wa-button" href="https://wa.me/?text=${waText}" target="_blank">
                <i class="fab fa-whatsapp"></i> Beli via WA
            </a>`;

            // jika admin tampilkan tombol edit/delete
            if (currentUser && currentUser.role === 'admin') {
                html += `<div class="admin-actions">
                    <button class="small-btn" onclick="editProduct('${prod.id}')">
                        <i class="fas fa-pen"></i> edit
                    </button>
                    <button class="small-btn" onclick="deleteProduct('${prod.id}')">
                        <i class="fas fa-trash"></i> hapus
                    </button>
                </div>`;
            }
            
            // jika ada mp3, tampilkan player sederhana
            if (prod.mp3) {
                html += `<div class="audio-preview">
                    <small><i class="fas fa-music"></i> ${escapeHtml(prod.mp3)}</small>
                </div>`;
            }
            
            html += `</div>`;
        });
        html += `</div>`;
    }
    html += `</div>`;
    
    mainEl.innerHTML = html;
    updateNavigation();
}

function showAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Akses ditolak. Halaman ini hanya untuk administrator.');
        showHome();
        return;
    }
    
    let html = `<div class="glass-panel">
        <h2><i class="fas fa-crown"></i> Panel Administrator</h2>
        
        <div style="background:#0f1b30; border-radius:40px; padding:2rem; margin:2rem 0;">
            <h3>➕ Tambah / Edit Produk</h3>
            <div class="admin-form">
                <input type="text" id="prodNama" class="input-glass" placeholder="Nama produk" value="">
                <input type="number" id="prodHarga" class="input-glass" placeholder="Harga (angka)" value="">
                <input type="text" id="prodDesc" class="input-glass" placeholder="Deskripsi singkat" value="">
                
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <label class="file-label">
                        <i class="fas fa-image"></i> Upload Gambar
                        <input type="file" id="prodImageInput" accept="image/*" style="display:none;">
                    </label>
                    <span id="imageName">tidak ada file</span>
                </div>
                
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <label class="file-label">
                        <i class="fas fa-music"></i> Upload MP3
                        <input type="file" id="prodMp3Input" accept="audio/mpeg" style="display:none;">
                    </label>
                    <span id="mp3Name">tidak ada file</span>
                </div>
            </div>
            
            <button class="btn-glass" id="saveProductBtn">
                <i class="fas fa-save"></i> Simpan produk baru
            </button>
            
            <hr style="border-color:#2f4580; margin:2rem 0;">
            
            <h3>🖼️ Ubah Logo Store (URL)</h3>
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                <input type="text" id="logoUrlInput" class="input-glass" style="flex:3;" 
                       placeholder="https://... gambar logo" value="${db.storeLogo || ''}">
                <button class="btn-glass" id="updateLogoBtn">
                    <i class="fas fa-sync"></i> Ganti
                </button>
            </div>
            
            <hr style="border-color:#2f4580; margin:2rem 0;">
            
            <h3>📦 Daftar produk (kelola)</h3>
        </div>`;

    // list produk untuk admin
    if (db.products.length === 0) {
        html += `<p style="color:#99a9dd; text-align:center;">Belum ada produk</p>`;
    } else {
        db.products.forEach(p => {
            if (!p.id) p.id = `prod_${Date.now()}_${Math.random()}`;
            html += `<div style="background:#0f1d32; margin:1rem 0; padding:1rem 2rem; 
                     border-radius:60px; display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <span><strong>${escapeHtml(p.nama)}</strong> Rp ${formatRupiah(p.harga)}</span>
                <button class="small-btn" onclick="editProduct('${p.id}')">
                    <i class="fas fa-pen"></i> edit
                </button>
                <button class="small-btn" onclick="deleteProduct('${p.id}')">
                    <i class="fas fa-trash"></i> hapus
                </button>
            </div>`;
        });
    }

    html += `</div>`;
    mainEl.innerHTML = html;
    updateNavigation();

    // event listener untuk form admin
    document.getElementById('updateLogoBtn')?.addEventListener('click', function() {
        const newUrl = document.getElementById('logoUrlInput').value.trim();
        if (newUrl) {
            db.storeLogo = newUrl;
            saveDB();
            document.getElementById('storeLogoImg').src = newUrl;
            alert('Logo berhasil diperbarui!');
        }
    });

    // preview file names
    document.getElementById('prodImageInput')?.addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'tidak ada file';
        document.getElementById('imageName').textContent = fileName;
    });

    document.getElementById('prodMp3Input')?.addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'tidak ada file';
        document.getElementById('mp3Name').textContent = fileName;
    });

    // save product button
    document.getElementById('saveProductBtn')?.addEventListener('click', function() {
        saveNewProduct();
    });
}

function saveNewProduct() {
    const nama = document.getElementById('prodNama').value.trim();
    const harga = document.getElementById('prodHarga').value.trim();
    const desc = document.getElementById('prodDesc').value.trim();
    
    if (!nama || !harga) {
        alert('Nama dan harga wajib diisi');
        return;
    }

    const imgFile = document.getElementById('prodImageInput').files[0];
    const mp3File = document.getElementById('prodMp3Input').files[0];

    if (imgFile && imgFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            finalSaveProduct(nama, harga, desc, e.target.result, mp3File ? mp3File.name : null);
        };
        reader.readAsDataURL(imgFile);
    } else {
        finalSaveProduct(nama, harga, desc, null, mp3File ? mp3File.name : null);
    }
}

function finalSaveProduct(nama, harga, deskripsi, imageBase64, mp3Name) {
    const newProd = {
        id: 'prod_' + Date.now() + Math.random().toString(36).substr(2, 6),
        nama: nama,
        harga: parseInt(harga) || 0,
        deskripsi: deskripsi || '',
        image: imageBase64 || 'https://via.placeholder.com/260x170/1a2540/7d9eff?text=Z+Produk',
        mp3: mp3Name
    };
    
    db.products.push(newProd);
    saveDB();
    alert('Produk berhasil ditambahkan!');
    
    // reset form
    document.getElementById('prodNama').value = '';
    document.getElementById('prodHarga').value = '';
    document.getElementById('prodDesc').value = '';
    document.getElementById('prodImageInput').value = '';
    document.getElementById('prodMp3Input').value = '';
    document.getElementById('imageName').textContent = 'tidak ada file';
    document.getElementById('mp3Name').textContent = 'tidak ada file';
    
    showAdmin();
}

function showAuth() {
    const html = `<div class="auth-box glass-panel">
        <div class="auth-toggle">
            <button class="btn-glass" id="toggleLogin">Login</button>
            <button class="btn-glass" id="toggleRegister">Register</button>
        </div>
        
        <div id="loginForm">
            <h3>Login</h3>
            <input type="text" id="loginUsername" class="input-glass" placeholder="Username"><br><br>
            <input type="password" id="loginPassword" class="input-glass" placeholder="Password"><br><br>
            <button class="btn-glass" id="doLogin"><i class="fas fa-sign-in-alt"></i> Masuk</button>
            <div id="loginMessage"></div>
        </div>
        
        <div id="registerForm" class="hidden">
            <h3>Register</h3>
            <input type="text" id="regUsername" class="input-glass" placeholder="Username"><br><br>
            <input type="email" id="regEmail" class="input-glass" placeholder="Email"><br><br>
            <input type="password" id="regPassword" class="input-glass" placeholder="Password"><br><br>
            <button class="btn-glass" id="doRegister"><i class="fas fa-user-plus"></i> Daftar</button>
            <div id="registerMessage"></div>
        </div>
    </div>`;
    
    mainEl.innerHTML = html;
    updateNavigation();

    // toggle login/register
    document.getElementById('toggleLogin').addEventListener('click', () => {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    });

    document.getElementById('toggleRegister').addEventListener('click', () => {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
    });

    // login
    document.getElementById('doLogin').addEventListener('click', () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const msgBox = document.getElementById('loginMessage');

        if (!username || !password) {
            msgBox.innerHTML = '<div class="error-msg">Username dan password harus diisi</div>';
            return;
        }

        const user = db.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = { username: user.username, role: user.role };
            msgBox.innerHTML = '<div class="success-msg">Login berhasil! Redirecting...</div>';
            setTimeout(() => showHome(), 1000);
        } else {
            msgBox.innerHTML = '<div class="error-msg">Username atau password salah</div>';
        }
    });

    // register
    document.getElementById('doRegister').addEventListener('click', () => {
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const msgBox = document.getElementById('registerMessage');

        if (!username || !email || !password) {
            msgBox.innerHTML = '<div class="error-msg">Semua field harus diisi</div>';
            return;
        }

        if (db.users.some(u => u.username === username)) {
            msgBox.innerHTML = '<div class="error-msg">Username sudah digunakan</div>';
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            msgBox.innerHTML = '<div class="error-msg">Email tidak valid</div>';
            return;
        }

        const newUser = {
            username: username,
            password: password,
            email: email,
            role: 'user'
        };

        db.users.push(newUser);
        saveDB();
        
        msgBox.innerHTML = '<div class="success-msg">Registrasi berhasil! Silakan login.</div>';
        
        // reset form
        document.getElementById('regUsername').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        
        // switch ke login
        setTimeout(() => {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('registerForm').classList.add('hidden');
        }, 1500);
    });
}

function logout() {
    currentUser = null;
    showHome();
}

// ================== EVENT LISTENERS ==================
navHome.addEventListener('click', showHome);
navAdmin.addEventListener('click', showAdmin);
navLogin.addEventListener('click', showAuth);
navLogout.addEventListener('click', logout);

// discord link
discordLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://discord.gg/VvkJPDstaw', '_blank');
});

// ================== INITIAL RENDER ==================
showHome();

// auto-save database setiap ada perubahan (via tombol sudah handle)
window.addEventListener('load', () => {
    // update logo
    document.getElementById('storeLogoImg').src = db.storeLogo;
});