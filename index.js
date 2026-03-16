// ================== SUPABASE CONFIG ==================
const SUPABASE_URL = 'https://pfwhpewpqjbedxxyfxjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmd2hwZXdwcWpiZWR4eHlmeGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjI0ODEsImV4cCI6MjA4OTIzODQ4MX0.TOxdSebeKuciVtVi_ea-LHjKkRg7_cMv5xb60Nk6jhM';

// Inisialisasi Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== KONSTANTA ==================
const WA_NUMBER = '62895630307497';
const ADMIN_USERNAME = 'ownerzizuel';
const ADMIN_PASSWORD = 'tokokelontongzizuel';

// ================== STATE ==================
let currentUser = null;
let products = [];
let settings = {
    description: 'Toko Kelontong Zizuel menyediakan layanan hosting server bot maupun game, bersedia melengkapi kebutuhan hostingmu',
    logo: '',
    music: ''
};
let audioPlayer = null;

// ================== DOM ELEMENTS ==================
const loadingOverlay = document.getElementById('loadingOverlay');
const adminSidebar = document.getElementById('adminSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoContainer = document.getElementById('logoContainer');
const storeLogo = document.getElementById('storeLogo');
const storeDescriptionDisplay = document.getElementById('storeDescriptionDisplay');
const productsGrid = document.getElementById('productsGrid');
const navLogin = document.getElementById('navLogin');
const navLogout = document.getElementById('navLogout');
const bgMusic = document.getElementById('bgMusic');

// ================== HELPER FUNCTIONS ==================
function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function escapeHtml(text) {
    if (!text) return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRupiah(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ================== LOAD DATA FROM SUPABASE ==================
async function loadProducts() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        products = data || [];
        return products;
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

async function loadSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            settings = {
                description: data.store_header || settings.description,
                logo: data.store_logo || '',
                music: data.music_url || ''
            };
            
            if (settings.logo) {
                storeLogo.src = settings.logo;
            }
            
            if (settings.music && currentUser) {
                playMusic(settings.music);
            }
            
            if (settings.description) {
                storeDescriptionDisplay.innerHTML = `<p>${escapeHtml(settings.description)}</p>`;
            }
        }
        
        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        return settings;
    }
}

// ================== SAVE TO SUPABASE ==================
async function saveSettings(updates) {
    try {
        const { error } = await supabaseClient
            .from('settings')
            .upsert({
                id: 1,
                store_header: updates.description || settings.description,
                store_logo: updates.logo || settings.logo,
                music_url: updates.music || settings.music
            });
        
        if (error) throw error;
        
        // Update local settings
        if (updates.description) settings.description = updates.description;
        if (updates.logo) settings.logo = updates.logo;
        if (updates.music) settings.music = updates.music;
        
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Gagal menyimpan: ' + error.message);
        return false;
    }
}

async function saveProduct(product) {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .insert([{
                nama: product.nama,
                harga: product.harga,
                deskripsi: product.deskripsi || '',
                image: product.image || '',
                user_id: currentUser?.username || 'admin'
            }])
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving product:', error);
        throw error;
    }
}

async function updateProduct(id, updates) {
    try {
        const { error } = await supabaseClient
            .from('products')
            .update(updates)
            .eq('id', id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
}

async function deleteProduct(id) {
    try {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
}

// ================== MUSIC PLAYER ==================
function playMusic(url) {
    if (!url) return;
    
    bgMusic.src = url;
    bgMusic.play().catch(e => console.log('Autoplay blocked:', e));
    
    // Coba play lagi setelah interaksi user
    document.addEventListener('click', function playOnClick() {
        bgMusic.play();
        document.removeEventListener('click', playOnClick);
    }, { once: true });
}

// ================== RENDER PRODUCTS ==================
async function renderProducts() {
    showLoading();
    
    await loadProducts();
    await loadSettings();
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<p style="text-align: center; color: #a0a8c0; padding: 40px;">Belum ada produk</p>';
    } else {
        productsGrid.innerHTML = products.map(prod => {
            const waText = `Permisi, saya ingin membeli ${encodeURIComponent(prod.nama)} senilai Rp ${prod.harga}`;
            return `
                <div class="product-card">
                    <img class="product-image" src="${prod.image || 'https://via.placeholder.com/280x200/1a1f2c/4a80f0?text=ZIZUEL'}" 
                         onerror="this.src='https://via.placeholder.com/280x200/1a1f2c/4a80f0?text=ZIZUEL'">
                    <div class="product-info">
                        <div class="product-name">${escapeHtml(prod.nama)}</div>
                        <div class="product-desc">${escapeHtml(prod.deskripsi) || '—'}</div>
                        <div class="product-price">Rp ${formatRupiah(prod.harga)}</div>
                        <a class="btn-wa" href="https://wa.me/${WA_NUMBER}?text=${waText}" target="_blank">
                            <i class="fab fa-whatsapp"></i> BELI VIA WA
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    hideLoading();
}

// ================== ADMIN SIDEBAR ==================
function openAdminSidebar() {
    adminSidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    renderAdminProductList();
}

function closeAdminSidebar() {
    adminSidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
}

async function renderAdminProductList() {
    const listContainer = document.getElementById('adminProductList');
    if (!listContainer) return;
    
    await loadProducts();
    
    if (products.length === 0) {
        listContainer.innerHTML = '<p style="color: #a0a8c0; text-align: center;">Belum ada produk</p>';
        return;
    }
    
    listContainer.innerHTML = products.map(prod => `
        <div class="admin-product-item">
            <div class="admin-product-info">
                <strong>${escapeHtml(prod.nama)}</strong>
                <small>Rp ${formatRupiah(prod.harga)}</small>
            </div>
            <div class="admin-product-actions">
                <button onclick="editProductHandler('${prod.id}')">Edit</button>
                <button onclick="deleteProductHandler('${prod.id}')">Hapus</button>
            </div>
        </div>
    `).join('');
}

// ================== PRODUCT HANDLERS ==================
window.editProductHandler = async (id) => {
    const prod = products.find(p => p.id == id);
    if (!prod) return;
    
    const newName = prompt('Nama produk:', prod.nama);
    if (newName === null) return;
    
    const newPrice = prompt('Harga:', prod.harga);
    if (newPrice === null) return;
    
    const newDesc = prompt('Deskripsi:', prod.deskripsi || '');
    
    showLoading();
    
    try {
        await updateProduct(id, {
            nama: newName.trim() || prod.nama,
            harga: parseInt(newPrice) || prod.harga,
            deskripsi: newDesc || prod.deskripsi
        });
        
        await renderProducts();
        renderAdminProductList();
        alert('Produk berhasil diupdate');
    } catch (error) {
        alert('Gagal update: ' + error.message);
    } finally {
        hideLoading();
    }
};

window.deleteProductHandler = async (id) => {
    if (!confirm('Hapus produk ini?')) return;
    
    showLoading();
    
    try {
        await deleteProduct(id);
        await renderProducts();
        renderAdminProductList();
        alert('Produk berhasil dihapus');
    } catch (error) {
        alert('Gagal hapus: ' + error.message);
    } finally {
        hideLoading();
    }
};

// ================== LOGIN SYSTEM ==================
let users = [];

function loadUsers() {
    const stored = localStorage.getItem('tokozizuel_users');
    if (stored) {
        try {
            users = JSON.parse(stored);
        } catch (e) {}
    }
    
    if (!users) users = [];
    
    const adminExists = users.some(u => u.username === ADMIN_USERNAME);
    if (!adminExists) {
        users.push({
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
            email: 'admin@zizuel.local',
            role: 'admin'
        });
    }
    
    saveUsers();
}

function saveUsers() {
    localStorage.setItem('tokozizuel_users', JSON.stringify(users));
}

loadUsers();

// ================== CHECK SAVED SESSION ==================
function checkSavedSession() {
    const saved = localStorage.getItem('tokozizuel_currentUser');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            updateAuthUI();
            renderProducts();
            
            if (currentUser.role === 'admin') {
                logoContainer.style.cursor = 'pointer';
            }
            
            return true;
        } catch (e) {
            localStorage.removeItem('tokozizuel_currentUser');
        }
    }
    return false;
}

// ================== AUTH UI ==================
function updateAuthUI() {
    if (currentUser) {
        navLogin.classList.add('hidden');
        navLogout.classList.remove('hidden');
    } else {
        navLogin.classList.remove('hidden');
        navLogout.classList.add('hidden');
        logoContainer.style.cursor = 'default';
    }
}

// ================== LOGIN MODAL ==================
function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'login-modal active';
    modal.id = 'loginModal';
    modal.innerHTML = `
        <div class="login-container">
            <button class="close-login" id="closeLogin"><i class="fas fa-times"></i></button>
            <h2>LOGIN</h2>
            <div id="loginPanel">
                <input type="text" id="loginUsername" class="login-input" placeholder="username" autocomplete="off">
                <input type="password" id="loginPassword" class="login-input" placeholder="password">
                <button class="login-btn" id="doLogin">MASUK</button>
                <div class="login-switch">
                    Belum punya akun? <span id="showRegister">Buat akun</span>
                </div>
                <div id="loginMessage" class="login-message"></div>
            </div>
            <div id="registerPanel" style="display: none;">
                <input type="text" id="regUsername" class="login-input" placeholder="username">
                <input type="email" id="regEmail" class="login-input" placeholder="email">
                <input type="password" id="regPassword" class="login-input" placeholder="password">
                <button class="login-btn" id="doRegister">DAFTAR</button>
                <div class="login-switch">
                    Sudah punya akun? <span id="showLogin">Masuk</span>
                </div>
                <div id="registerMessage" class="login-message"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('closeLogin').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('showRegister').addEventListener('click', () => {
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('registerPanel').style.display = 'block';
    });
    
    document.getElementById('showLogin').addEventListener('click', () => {
        document.getElementById('registerPanel').style.display = 'none';
        document.getElementById('loginPanel').style.display = 'block';
    });
    
    document.getElementById('doLogin').addEventListener('click', () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const msg = document.getElementById('loginMessage');
        
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = { username: user.username, role: user.role };
            localStorage.setItem('tokozizuel_currentUser', JSON.stringify(currentUser));
            
            msg.className = 'login-message success';
            msg.textContent = 'Berhasil masuk!';
            msg.style.display = 'block';
            
            setTimeout(() => {
                modal.remove();
                updateAuthUI();
                renderProducts();
                
                if (currentUser.role === 'admin') {
                    logoContainer.style.cursor = 'pointer';
                }
            }, 500);
        } else {
            msg.className = 'login-message error';
            msg.textContent = 'Username/password salah';
            msg.style.display = 'block';
        }
    });
    
    document.getElementById('doRegister').addEventListener('click', () => {
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const msg = document.getElementById('registerMessage');
        
        if (!username || !email || !password) {
            msg.className = 'login-message error';
            msg.textContent = 'Semua field harus diisi';
            msg.style.display = 'block';
            return;
        }
        
        if (users.some(u => u.username === username)) {
            msg.className = 'login-message error';
            msg.textContent = 'Username sudah digunakan';
            msg.style.display = 'block';
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            msg.className = 'login-message error';
            msg.textContent = 'Email tidak valid';
            msg.style.display = 'block';
            return;
        }
        
        users.push({
            username,
            password,
            email,
            role: 'user'
        });
        
        saveUsers();
        
        msg.className = 'login-message success';
        msg.textContent = 'Registrasi berhasil! Silakan login.';
        msg.style.display = 'block';
        
        document.getElementById('regUsername').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        
        setTimeout(() => {
            document.getElementById('registerPanel').style.display = 'none';
            document.getElementById('loginPanel').style.display = 'block';
        }, 1500);
    });
}

// ================== LOGOUT ==================
function logout() {
    currentUser = null;
    localStorage.removeItem('tokozizuel_currentUser');
    updateAuthUI();
    renderProducts();
    closeAdminSidebar();
    bgMusic.pause();
    bgMusic.src = '';
}

// ================== INITIALIZE ==================
async function init() {
    // Check session
    checkSavedSession();
    
    // Load initial data
    await renderProducts();
    
    // Event listeners
    navLogin.addEventListener('click', showLoginModal);
    
    navLogout.addEventListener('click', logout);
    
    logoContainer.addEventListener('click', () => {
        if (currentUser?.role === 'admin') {
            openAdminSidebar();
        }
    });
    
    sidebarOverlay.addEventListener('click', closeAdminSidebar);
    document.getElementById('closeSidebar').addEventListener('click', closeAdminSidebar);
    
    // Admin panel events
    document.getElementById('saveDescriptionBtn').addEventListener('click', async () => {
        const desc = document.getElementById('storeDescription').value.trim();
        if (desc) {
            showLoading();
            await saveSettings({ description: desc });
            storeDescriptionDisplay.innerHTML = `<p>${escapeHtml(desc)}</p>`;
            hideLoading();
            alert('Deskripsi berhasil disimpan');
        }
    });
    
    document.getElementById('logoUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                showLoading();
                await saveSettings({ logo: event.target.result });
                storeLogo.src = event.target.result;
                document.getElementById('logoFileName').textContent = file.name;
                hideLoading();
                alert('Logo berhasil disimpan');
            };
            reader.readAsDataURL(file);
        }
    });
    
    document.getElementById('musicUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'audio/mpeg') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                showLoading();
                await saveSettings({ music: event.target.result });
                document.getElementById('musicFileName').textContent = file.name;
                
                if (currentUser) {
                    playMusic(event.target.result);
                }
                
                hideLoading();
                alert('Musik berhasil disimpan');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Hanya file MP3 yang diperbolehkan');
        }
    });
    
    document.getElementById('addProductBtn').addEventListener('click', () => {
        const name = document.getElementById('productName').value.trim();
        const price = document.getElementById('productPrice').value.trim();
        const desc = document.getElementById('productDesc').value.trim();
        const imageFile = document.getElementById('productImage').files[0];
        
        if (!name || !price) {
            alert('Nama dan harga harus diisi');
            return;
        }
        
        if (imageFile && imageFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                showLoading();
                try {
                    await saveProduct({
                        nama: name,
                        harga: parseInt(price) || 0,
                        deskripsi: desc || '',
                        image: e.target.result
                    });
                    
                    await renderProducts();
                    renderAdminProductList();
                    
                    document.getElementById('productName').value = '';
                    document.getElementById('productPrice').value = '';
                    document.getElementById('productDesc').value = '';
                    document.getElementById('productImage').value = '';
                    document.getElementById('productImageName').textContent = 'Tidak ada';
                    
                    alert('Produk berhasil ditambahkan');
                } catch (error) {
                    alert('Gagal: ' + error.message);
                } finally {
                    hideLoading();
                }
            };
            reader.readAsDataURL(imageFile);
        } else {
            (async () => {
                showLoading();
                try {
                    await saveProduct({
                        nama: name,
                        harga: parseInt(price) || 0,
                        deskripsi: desc || '',
                        image: ''
                    });
                    
                    await renderProducts();
                    renderAdminProductList();
                    
                    document.getElementById('productName').value = '';
                    document.getElementById('productPrice').value = '';
                    document.getElementById('productDesc').value = '';
                    
                    alert('Produk berhasil ditambahkan');
                } catch (error) {
                    alert('Gagal: ' + error.message);
                } finally {
                    hideLoading();
                }
            })();
        }
    });
    
    document.getElementById('productImage').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'Tidak ada';
        document.getElementById('productImageName').textContent = fileName;
    });
}

// Start the app
init();