// ================== SUPABASE CONFIG ==================
const SUPABASE_URL = 'https://pfwhpewpqjbedxxyfxjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmd2hwZXdwcWpiZWR4eHlmeGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjI0ODEsImV4cCI6MjA4OTIzODQ4MX0.TOxdSebeKuciVtVi_ea-LHjKkRg7_cMv5xb60Nk6jhM';

// Inisialisasi Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== KONSTANTA ==================
const WA_NUMBER = '62895630307497';
const ADMIN_USERNAME = 'ownerzizuel';
const ADMIN_PASSWORD = 'toko';

// ================== STATE ==================
let currentUser = null;
let products = [];
let settings = {
    description: 'Toko Kelontong Zizuel menyediakan layanan hosting server bot maupun game, bersedia melengkapi kebutuhan hostingmu',
    logo: '',
    music: ''
};

// ================== DOM ELEMENTS ==================
const loadingOverlay = document.getElementById('loadingOverlay');
const adminSidebar = document.getElementById('adminSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const mainContainer = document.getElementById('mainContainer');
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

// ================== USER MANAGEMENT ==================
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

// ================== RENDER LOGIN PAGE ==================
function renderLoginPage() {
    // Sembunyikan footer
    document.getElementById('mainFooter').style.display = 'none';
    
    mainContainer.innerHTML = `
        <div class="login-modal" style="position: relative; background: transparent; backdrop-filter: none;">
            <div class="login-container">
                <h2>TOKO <span>KELONTONG</span><br>ZIZUEL</h2>
                
                <div id="loginPanel">
                    <input type="text" id="loginUsername" class="login-input" placeholder="username">
                    <input type="password" id="loginPassword" class="login-input" placeholder="password">
                    <button class="login-btn" id="doLogin">LOGIN</button>
                    <div class="login-switch">
                        Belum punya akun?<br>
                        <span id="showRegister">Buat akun</span>
                    </div>
                    <div id="loginMessage" class="login-message"></div>
                </div>
                
                <div id="registerPanel" style="display: none;">
                    <input type="text" id="regUsername" class="login-input" placeholder="username">
                    <input type="email" id="regEmail" class="login-input" placeholder="email">
                    <input type="password" id="regPassword" class="login-input" placeholder="password">
                    <button class="login-btn" id="doRegister">DAFTAR</button>
                    <div class="login-switch">
                        Sudah punya akun?<br>
                        <span id="showLogin">Login</span>
                    </div>
                    <div id="registerMessage" class="login-message"></div>
                </div>
            </div>
        </div>
    `;
    
    attachLoginEvents();
}

// ================== RENDER MAIN PAGE (SETELAH LOGIN) ==================
async function renderMainPage() {
    showLoading();
    
    // Tampilkan footer
    document.getElementById('mainFooter').style.display = 'block';
    
    await loadProducts();
    await loadSettings();
    
    const header = `
        <header class="header">
            <div class="logo-area" id="logoContainer">
                <img id="storeLogo" class="store-logo" src="${settings.logo || 'https://via.placeholder.com/60x60/3b82f6/ffffff?text=Z'}" alt="Toko Zizuel">
                <div class="store-title">
                    <div class="line1">TOKO KELONTONG</div>
                    <div class="line2">ZIZUEL</div>
                </div>
            </div>
            <button class="btn-logout" id="navLogout">KELUAR</button>
        </header>
        
        <div class="store-description">
            <p>${escapeHtml(settings.description)}</p>
        </div>
        
        <div class="products-grid" id="productsGrid"></div>
    `;
    
    mainContainer.innerHTML = header;
    
    // Render produk
    const productsGrid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Belum ada produk</p>';
    } else {
        productsGrid.innerHTML = products.map(prod => {
            const waText = `Permisi, saya ingin membeli ${encodeURIComponent(prod.nama)} senilai Rp ${prod.harga}`;
            return `
                <div class="product-card">
                    <img class="product-image" src="${prod.image || 'https://via.placeholder.com/280x180/2563eb/ffffff?text=ZIZUEL'}" 
                         onerror="this.src='https://via.placeholder.com/280x180/2563eb/ffffff?text=ZIZUEL'">
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
    
    // Event listeners
    document.getElementById('navLogout').addEventListener('click', logout);
    
    const logoContainer = document.getElementById('logoContainer');
    if (currentUser?.role === 'admin') {
        logoContainer.style.cursor = 'pointer';
        logoContainer.addEventListener('click', openAdminSidebar);
    }
    
    // Set link Discord
    const discordLink = document.getElementById('discordLink');
    discordLink.href = 'https://discord.gg/zizuel';
    
    // Play musik
    if (settings.music) {
        bgMusic.src = settings.music;
        bgMusic.play().catch(e => console.log('Autoplay blocked'));
    }
    
    hideLoading();
}

// ================== LOGIN EVENTS ==================
function attachLoginEvents() {
    document.getElementById('showRegister')?.addEventListener('click', () => {
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('registerPanel').style.display = 'block';
    });
    
    document.getElementById('showLogin')?.addEventListener('click', () => {
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
                renderMainPage();
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

// ================== ADMIN SIDEBAR ==================
function openAdminSidebar() {
    adminSidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    renderAdminProductList();
    
    // Isi form dengan data yang ada
    document.getElementById('storeDescription').value = settings.description;
    document.getElementById('logoFileName').textContent = settings.logo ? 'Logo tersedia' : 'Belum ada file';
    document.getElementById('musicFileName').textContent = settings.music ? 'Musik tersedia' : 'Belum ada file';
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
        listContainer.innerHTML = '<p style="color: #ffffff; text-align: center;">Belum ada produk</p>';
        return;
    }
    
    listContainer.innerHTML = products.map(prod => `
        <div class="admin-product-item">
            <div class="admin-product-info">
                <strong>${escapeHtml(prod.nama)}</strong>
                <small>Rp ${formatRupiah(prod.harga)}</small>
            </div>
            <div class="admin-product-actions">
                <button onclick="editProductHandler('${prod.id}')">EDIT</button>
                <button onclick="deleteProductHandler('${prod.id}')">HAPUS</button>
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
        
        await renderMainPage();
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
        await renderMainPage();
        renderAdminProductList();
        alert('Produk berhasil dihapus');
    } catch (error) {
        alert('Gagal hapus: ' + error.message);
    } finally {
        hideLoading();
    }
};

// ================== LOGOUT ==================
function logout() {
    currentUser = null;
    localStorage.removeItem('tokozizuel_currentUser');
    bgMusic.pause();
    bgMusic.src = '';
    closeAdminSidebar();
    
    // Sembunyikan footer
    document.getElementById('mainFooter').style.display = 'none';
    
    renderLoginPage();
}

// ================== CHECK SESSION ==================
function checkSession() {
    const saved = localStorage.getItem('tokozizuel_currentUser');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            renderMainPage();
        } catch (e) {
            localStorage.removeItem('tokozizuel_currentUser');
            renderLoginPage();
        }
    } else {
        renderLoginPage();
    }
}

// ================== INIT ADMIN SIDEBAR EVENTS ==================
function initAdminEvents() {
    document.getElementById('closeSidebar').addEventListener('click', closeAdminSidebar);
    sidebarOverlay.addEventListener('click', closeAdminSidebar);
    
    // Save description
    document.getElementById('saveDescriptionBtn').addEventListener('click', async () => {
        const desc = document.getElementById('storeDescription').value.trim();
        if (desc) {
            showLoading();
            await saveSettings({ description: desc });
            await renderMainPage();
            hideLoading();
            alert('Deskripsi berhasil disimpan');
        }
    });
    
    // Logo upload
    document.getElementById('logoUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                showLoading();
                await saveSettings({ logo: event.target.result });
                document.getElementById('logoFileName').textContent = file.name;
                await renderMainPage();
                hideLoading();
                alert('Logo berhasil disimpan');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Music upload
    document.getElementById('musicUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'audio/mpeg') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                showLoading();
                await saveSettings({ music: event.target.result });
                document.getElementById('musicFileName').textContent = file.name;
                await renderMainPage();
                hideLoading();
                alert('Musik berhasil disimpan');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Hanya file MP3 yang diperbolehkan');
        }
    });
    
    // Add product
    document.getElementById('addProductBtn').addEventListener('click', () => {
        const name = document.getElementById('productName').value.trim();
        const price = document.getElementById('productPrice').value.trim();
        const desc = document.getElementById('productDesc').value.trim();
        const imageFile = document.getElementById('productImage').files[0];
        
        if (!name || !price) {
            alert('Nama dan harga harus diisi');
            return;
        }
        
        const processAdd = async (imageData) => {
            showLoading();
            try {
                await saveProduct({
                    nama: name,
                    harga: parseInt(price) || 0,
                    deskripsi: desc || '',
                    image: imageData || ''
                });
                
                await renderMainPage();
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
        
        if (imageFile && imageFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => processAdd(e.target.result);
            reader.readAsDataURL(imageFile);
        } else {
            processAdd(null);
        }
    });
    
    // Product image name display
    document.getElementById('productImage').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'Tidak ada';
        document.getElementById('productImageName').textContent = fileName;
    });
}

// ================== START APP ==================
checkSession();

// Initialize admin events after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initAdminEvents();
});
 
