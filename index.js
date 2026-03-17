// ================== SUPABASE CONFIG ==================
const SUPABASE_URL = 'https://pfwhpewpqjbedxxyfxjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmd2hwZXdwcWpiZWR4eHlmeGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjI0ODEsImV4cCI6MjA4OTIzODQ4MX0.TOxdSebeKuciVtVi_ea-LHjKkRg7_cMv5xb60Nk6jhM';

// Inisialisasi Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== KONSTANTA ==================
const WA_NUMBER = '62895630307497';
const ADMIN_EMAIL = 'admin@zizuel.local';
const DISCORD_LINK = 'https://discord.gg/VvkJPDstaw';

// ================== STATE ==================
let currentUser = null;
let products = [];
let settings = {
    description: 'Toko Kelontong Zizuel menyediakan layanan hosting server bot maupun game, bersedia melengkapi kebutuhan hostingmu',
    logo: '',
    music: ''
};
let adminSortable = null;

// ================== DOM ELEMENTS ==================
const loadingOverlay = document.getElementById('loadingOverlay');
const adminSidebar = document.getElementById('adminSidebar');
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

function formatHarga(harga) {
    if (!harga && harga !== 0) return 'Rp 0';
    
    if (harga.toString().includes('-')) {
        const parts = harga.toString().split('-');
        const harga1 = parseInt(parts[0]) || 0;
        const harga2 = parseInt(parts[1]) || 0;
        
        if (harga1 && harga2) {
            return `Rp ${harga1.toLocaleString('id-ID')} - Rp ${harga2.toLocaleString('id-ID')}`;
        }
    }
    
    const angka = parseInt(harga) || 0;
    return `Rp ${angka.toLocaleString('id-ID')}`;
}

// ================== FUNGSI TOGGLE DESKRIPSI ==================
window.toggleDesc = function(element) {
    element.style.transform = 'scale(0.98)';
    element.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
        element.classList.toggle('expanded');
        
        if (element.classList.contains('expanded')) {
            element.style.transform = 'scale(1.05)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                element.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }, 150);
        } else {
            element.style.transform = 'scale(1)';
            element.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        }
    }, 100);
};

// ================== LOAD DATA FROM SUPABASE ==================
async function loadProducts() {
    try {
        // Ambil produk dengan urutan sort_order, kalau null berarti 0
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('sort_order', { ascending: true, nullsFirst: false })
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
        const { data: existing } = await supabaseClient
            .from('settings')
            .select('id')
            .eq('id', 1)
            .maybeSingle();
        
        let result;
        if (existing) {
            result = await supabaseClient
                .from('settings')
                .update({
                    store_header: updates.description || settings.description,
                    store_logo: updates.logo || settings.logo,
                    music_url: updates.music || settings.music
                })
                .eq('id', 1);
        } else {
            result = await supabaseClient
                .from('settings')
                .insert([{
                    id: 1,
                    store_header: updates.description || settings.description,
                    store_logo: updates.logo || settings.logo,
                    music_url: updates.music || settings.music
                }]);
        }
        
        if (result.error) throw result.error;
        
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
        // Dapatkan sort_order tertinggi + 1
        const maxSort = products.length > 0 
            ? Math.max(...products.map(p => p.sort_order || 0)) + 1 
            : 0;
        
        const { data, error } = await supabaseClient
            .from('products')
            .insert([{
                nama: product.nama,
                harga: product.harga.toString(),
                deskripsi: product.deskripsi || '',
                image: product.image || '',
                user_id: currentUser?.email || 'admin',
                sort_order: maxSort
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

// ================== FUNGSI UPDATE URUTAN PRODUK (DI ADMIN) ==================
async function updateProductOrder(newOrder) {
    showLoading();
    
    try {
        // Update setiap produk dengan sort_order baru (urutan dari array)
        for (let i = 0; i < newOrder.length; i++) {
            const productId = newOrder[i].dataset.id;
            await supabaseClient
                .from('products')
                .update({ sort_order: i })
                .eq('id', productId);
        }
        
        // Reload produk untuk halaman utama
        await loadProducts();
        
        // Render ulang halaman utama agar urutan berubah
        await renderMainPage();
        
    } catch (error) {
        console.error('Error updating order:', error);
        alert('Gagal mengupdate urutan: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ================== INIT SORTABLE DI ADMIN ==================
function initAdminSortable() {
    const list = document.getElementById('adminProductList');
    if (!list) return;
    
    if (adminSortable) {
        adminSortable.destroy();
    }
    
    adminSortable = new Sortable(list, {
        animation: 300,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        handle: '.drag-handle', // Optional: handle khusus
        onEnd: function(evt) {
            const newOrder = Array.from(list.children);
            // Update urutan di database
            updateProductOrder(newOrder);
        }
    });
}

// ================== RENDER LOGIN PAGE ==================
function renderLoginPage() {
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
    
    document.getElementById('doLogin').addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const msg = document.getElementById('loginMessage');
        
        if (!username || !password) {
            msg.className = 'login-message error';
            msg.textContent = 'Username dan password harus diisi';
            msg.style.display = 'block';
            return;
        }
        
        showLoading();
        
        try {
            const email = username.includes('@') ? username : username + '@zizuel.local';
            
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            if (data.user) {
                const role = data.user.email === ADMIN_EMAIL ? 'admin' : 'user';
                
                currentUser = {
                    username: username,
                    email: data.user.email,
                    role: role,
                    id: data.user.id
                };
                
                localStorage.setItem('tokozizuel_currentUser', JSON.stringify({
                    username: username,
                    role: role,
                    email: data.user.email
                }));
                
                msg.className = 'login-message success';
                msg.textContent = 'Berhasil masuk!';
                msg.style.display = 'block';
                
                setTimeout(() => {
                    renderMainPage();
                }, 500);
            }
        } catch (error) {
            console.error('Login error:', error);
            msg.className = 'login-message error';
            msg.textContent = 'Username/password salah';
            msg.style.display = 'block';
        } finally {
            hideLoading();
        }
    });
    
    document.getElementById('doRegister').addEventListener('click', async () => {
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
        
        if (!email.includes('@') || !email.includes('.')) {
            msg.className = 'login-message error';
            msg.textContent = 'Email tidak valid';
            msg.style.display = 'block';
            return;
        }
        
        showLoading();
        
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username,
                        role: 'user'
                    }
                }
            });
            
            if (error) throw error;
            
            msg.className = 'login-message success';
            msg.textContent = 'Registrasi berhasil! Silakan cek email untuk verifikasi.';
            msg.style.display = 'block';
            
            document.getElementById('regUsername').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            
            setTimeout(() => {
                document.getElementById('registerPanel').style.display = 'none';
                document.getElementById('loginPanel').style.display = 'block';
            }, 3000);
            
        } catch (error) {
            console.error('Register error:', error);
            msg.className = 'login-message error';
            msg.textContent = error.message || 'Gagal registrasi';
            msg.style.display = 'block';
        } finally {
            hideLoading();
        }
    });
}

// ================== RENDER MAIN PAGE ==================
async function renderMainPage() {
    showLoading();
    
    document.getElementById('mainFooter').style.display = 'block';
    
    await loadProducts();
    await loadSettings();
    
    const header = `
        <header class="header">
            <!-- LOGO FULL WIDTH 1:1 DI ATAS SENDIRI -->
            <div class="logo-full" id="logoContainer">
                <img id="storeLogo" class="store-logo-full" src="${settings.logo || 'https://via.placeholder.com/1200x1200/3b82f6/ffffff?text=Z'}" alt="Toko Zizuel">
            </div>
            
            <!-- NAMA TOKO BESAR DI BAWAH LOGO -->
            <div class="store-title-full">
                <h1>TOKO KELONTONG<br><span>ZIZUEL</span></h1>
            </div>
            
            <!-- TOMBOL LOGOUT DI POJOK -->
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
            const waText = `Permisi, saya ingin membeli ${encodeURIComponent(prod.nama)} senilai ${formatHarga(prod.harga)}`;
            return `
                <div class="product-card" data-id="${prod.id}">
                    <img class="product-image" src="${prod.image || 'https://via.placeholder.com/280x180/2563eb/ffffff?text=ZIZUEL'}" 
                         onerror="this.src='https://via.placeholder.com/280x180/2563eb/ffffff?text=ZIZUEL'">
                    <div class="product-info">
                        <div class="product-name">${escapeHtml(prod.nama)}</div>
                        <div class="product-desc" onclick="toggleDesc(this)">${escapeHtml(prod.deskripsi) || '—'}</div>
                        <div class="product-price">${formatHarga(prod.harga)}</div>
                        <a class="btn-wa" href="https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waText)}" target="_blank">
                            <i class="fab fa-whatsapp"></i> BELI VIA WA
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Event logout
    document.getElementById('navLogout').addEventListener('click', logout);
    
    // Klik logo untuk buka admin panel (khusus admin)
    const logoContainer = document.getElementById('logoContainer');
    if (currentUser?.role === 'admin') {
        logoContainer.style.cursor = 'pointer';
        logoContainer.addEventListener('click', openAdminSidebar);
    }
    
    // Set link Discord
    const discordLink = document.getElementById('discordLink');
    discordLink.href = DISCORD_LINK;
    
    // Play musik
    if (settings.music) {
        bgMusic.src = settings.music;
        bgMusic.play().catch(e => console.log('Autoplay blocked'));
    }
    
    hideLoading();
}

// ================== ADMIN SIDEBAR ==================
function openAdminSidebar() {
    adminSidebar.classList.add('active');
    renderAdminProductList().then(() => {
        // Init sortable setelah list dirender
        initAdminSortable();
    });
    
    document.getElementById('storeDescription').value = settings.description;
    document.getElementById('logoFileName').textContent = settings.logo ? 'Logo tersedia' : 'Belum ada file';
    document.getElementById('musicFileName').textContent = settings.music ? 'Musik tersedia' : 'Belum ada file';
}

function closeAdminSidebar() {
    adminSidebar.classList.remove('active');
    if (adminSortable) {
        adminSortable.destroy();
        adminSortable = null;
    }
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
        <div class="admin-product-item" data-id="${prod.id}">
            <div style="display: flex; align-items: center; width: 100%;">
                <span class="drag-handle">☰</span>
                <div class="admin-product-info" style="flex: 1;">
                    <strong>${escapeHtml(prod.nama)}</strong>
                    <small>${formatHarga(prod.harga)}</small>
                </div>
                <div class="admin-product-actions">
                    <button onclick="editProductHandler('${prod.id}')">EDIT</button>
                    <button onclick="deleteProductHandler('${prod.id}')">HAPUS</button>
                </div>
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
    
    const newPrice = prompt('Harga (bisa range 5000-20000):', prod.harga);
    if (newPrice === null) return;
    
    const newDesc = prompt('Deskripsi (gunakan Enter untuk baris baru):', prod.deskripsi || '');
    
    showLoading();
    
    try {
        await updateProduct(id, {
            nama: newName.trim() || prod.nama,
            harga: newPrice.trim() || prod.harga,
            deskripsi: newDesc || prod.deskripsi
        });
        
        await renderMainPage();
        await renderAdminProductList();
        alert('Produk berhasil diupdate');
        closeAdminSidebar();
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
        await renderAdminProductList();
        alert('Produk berhasil dihapus');
        closeAdminSidebar();
    } catch (error) {
        alert('Gagal hapus: ' + error.message);
    } finally {
        hideLoading();
    }
};

// ================== ADMIN SIDEBAR EVENTS ==================
function initAdminEvents() {
    document.getElementById('closeSidebar').addEventListener('click', closeAdminSidebar);
    
    document.getElementById('saveDescriptionBtn').addEventListener('click', async () => {
        const desc = document.getElementById('storeDescription').value.trim();
        if (desc) {
            showLoading();
            await saveSettings({ description: desc });
            await renderMainPage();
            hideLoading();
            alert('Deskripsi berhasil disimpan');
            closeAdminSidebar();
        }
    });
    
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
                closeAdminSidebar();
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
                await renderMainPage();
                hideLoading();
                alert('Musik berhasil disimpan');
                closeAdminSidebar();
            };
            reader.readAsDataURL(file);
        } else {
            alert('Hanya file MP3 yang diperbolehkan');
        }
    });
    
    document.getElementById('addProductBtn').addEventListener('click', () => {
        const name = document.getElementById('productName').value.trim();
        const price = document.getElementById('productPrice').value.trim();
        const desc = document.getElementById('productDesc').value;
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
                    harga: price,
                    deskripsi: desc || '',
                    image: imageData || ''
                });
                
                await renderMainPage();
                await renderAdminProductList();
                
                document.getElementById('productName').value = '';
                document.getElementById('productPrice').value = '';
                document.getElementById('productDesc').value = '';
                document.getElementById('productImage').value = '';
                document.getElementById('productImageName').textContent = 'Tidak ada';
                
                alert('Produk berhasil ditambahkan');
                closeAdminSidebar();
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
    
    document.getElementById('productImage').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'Tidak ada';
        document.getElementById('productImageName').textContent = fileName;
    });
}

// ================== LOGOUT ==================
async function logout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    localStorage.removeItem('tokozizuel_currentUser');
    bgMusic.pause();
    bgMusic.src = '';
    closeAdminSidebar();
    
    document.getElementById('mainFooter').style.display = 'none';
    
    renderLoginPage();
}

// ================== CHECK SESSION ==================
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session?.user) {
        const user = session.user;
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
        const role = user.email === ADMIN_EMAIL ? 'admin' : 'user';
        
        currentUser = {
            username: username,
            email: user.email,
            role: role,
            id: user.id
        };
        
        localStorage.setItem('tokozizuel_currentUser', JSON.stringify({
            username: username,
            role: role,
            email: user.email
        }));
        
        renderMainPage();
    } else {
        renderLoginPage();
    }
}

// ================== INIT ==================
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    initAdminEvents();
});