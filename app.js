let currentUser = null;
let currentUserType = null;
let currentListings = [];
let savedListings = JSON.parse(localStorage.getItem('savedListings') || '[]');

function setUserType(type) {
    currentUserType = type;
    document.querySelectorAll('.user-type').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    const studentFields = document.getElementById('studentFields');
    if (studentFields) {
        studentFields.style.display = type === 'student' ? 'block' : 'none';
    }
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

async function register() {
    const firstName = document.getElementById('regFirstName')?.value;
    const lastName = document.getElementById('regLastName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const phone = document.getElementById('regPhone')?.value;
    const password = document.getElementById('regPassword')?.value;
    
    if (!firstName || !lastName || !email || !phone || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    let endpoint = '';
    let data = {};
    
    if (currentUserType === 'student') {
        const institution = document.getElementById('regInstitution')?.value;
        const course = document.getElementById('regCourse')?.value;
        const budget = document.getElementById('regBudget')?.value;
        const areas = document.getElementById('regAreas')?.value;
        endpoint = '/api/register/student';
        data = { firstName, lastName, email, phoneNumber: phone, password, institution, course, budgetRange: budget, preferredAreas: areas };
    } else if (currentUserType === 'landlord') {
        endpoint = '/api/register/landlord';
        data = { firstName, lastName, email, phoneNumber: phone, password };
    } else {
        showAlert('Admin registration is not available', 'error');
        return;
    }
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            showAlert('Registration successful! Please login.', 'success');
            showLogin();
        } else {
            showAlert(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'error');
    }
}

async function login() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showAlert('Please enter email and password', 'error');
        return;
    }
    
    let endpoint = '';
    if (currentUserType === 'student') {
        endpoint = '/api/login/student';
    } else if (currentUserType === 'landlord') {
        endpoint = '/api/login/landlord';
    } else if (currentUserType === 'admin') {
        if (email === 'admin@safestay.com' && password === 'admin123') {
            currentUser = { email: 'admin@safestay.com', firstName: 'Admin', type: 'admin' };
            currentUserType = 'admin';
            showAlert('Admin login successful!', 'success');
            showAdminPanel();
            return;
        } else {
            showAlert('Invalid admin credentials', 'error');
            return;
        }
    }
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (result.success) {
            currentUser = result.user;
            currentUserType = currentUser.type;
            showAlert(`Welcome ${currentUser.firstName}!`, 'success');
            if (currentUserType === 'landlord') {
                showLandlordDashboard();
            } else {
                showHomeScreen();
            }
        } else {
            showAlert(result.error || 'Login failed', 'error');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'error');
    }
}

function logout() {
    currentUser = null;
    currentUserType = null;
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('savedScreen').style.display = 'none';
    document.getElementById('profileScreen').style.display = 'none';
    showLogin();
}

function showScreen(screenName) {
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('savedScreen').style.display = 'none';
    document.getElementById('profileScreen').style.display = 'none';
    
    if (screenName === 'home') {
        document.getElementById('homeScreen').style.display = 'block';
        loadListings();
    } else if (screenName === 'saved') {
        document.getElementById('savedScreen').style.display = 'block';
        displaySavedListings();
    } else if (screenName === 'profile') {
        document.getElementById('profileScreen').style.display = 'block';
        loadProfile();
    }
    
    document.querySelectorAll('.bottom-nav a, .nav-links a').forEach(link => {
        link.classList.remove('active');
    });
}

function showHomeScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    showScreen('home');
}

function showLandlordDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('savedScreen').style.display = 'none';
    document.getElementById('profileScreen').style.display = 'none';
    
    let dashboardHtml = `
        <div class="dashboard-stats">
            <div class="stat-card">
                <div class="stat-number" id="listingCount">0</div>
                <div class="stat-label">My Listings</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="bookingCount">0</div>
                <div class="stat-label">Total Bookings</div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h3>My Accommodations</h3>
                <button class="btn btn-primary" onclick="showAddListingModal()">+ Add New Listing</button>
            </div>
            <div class="card-body" id="landlordListings"></div>
        </div>
    `;
    
    document.getElementById('app').innerHTML = `
        <div class="container">
            <h2>Landlord Dashboard</h2>
            ${dashboardHtml}
            <button class="btn btn-secondary" onclick="logout()" style="margin-top: 2rem;">Logout</button>
        </div>
    `;
    loadLandlordListings();
}

function showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').innerHTML = `
        <div class="container">
            <h2>Admin Panel</h2>
            <div class="dashboard-stats" id="adminStats"></div>
            <div class="card">
                <div class="card-header">
                    <h3>Pending Verifications</h3>
                </div>
                <div class="card-body" id="pendingVerifications"></div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>Reported Listings</h3>
                </div>
                <div class="card-body" id="reportedListings"></div>
            </div>
            <button class="btn btn-secondary" onclick="logout()" style="margin-top: 2rem;">Logout</button>
        </div>
    `;
    loadAdminStats();
    loadPendingVerifications();
    loadReportedListings();
}

async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();
        document.getElementById('adminStats').innerHTML = `
            <div class="stat-card"><div class="stat-number">${stats.totalListings || 0}</div><div class="stat-label">Total Listings</div></div>
            <div class="stat-card"><div class="stat-number">${stats.verifiedListings || 0}</div><div class="stat-label">Verified Listings</div></div>
            <div class="stat-card"><div class="stat-number">${stats.totalReports || 0}</div><div class="stat-label">Total Reports</div></div>
            <div class="stat-card"><div class="stat-number">${stats.pendingReports || 0}</div><div class="stat-label">Pending Reports</div></div>
            <div class="stat-card"><div class="stat-number">${stats.pendingVerifications || 0}</div><div class="stat-label">Pending Verifications</div></div>
            <div class="stat-card"><div class="stat-number">${stats.totalStudents || 0}</div><div class="stat-label">Total Students</div></div>
            <div class="stat-card"><div class="stat-number">${stats.totalBookings || 0}</div><div class="stat-label">Total Bookings</div></div>
        `;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadPendingVerifications() {
    try {
        const response = await fetch('/api/admin/pending-verifications');
        const verifications = await response.json();
        if (verifications.length === 0) {
            document.getElementById('pendingVerifications').innerHTML = '<p>No pending verifications.</p>';
            return;
        }
        let html = '<table class="data-table"><thead><tr><th>Landlord</th><th>Email</th><th>Status</th><th>Action</th></tr></thead><tbody>';
        verifications.forEach(v => {
            html += `<tr>
                <td>${v.firstName} ${v.lastName}</td>
                <td>${v.email}</td>
                <td><span class="badge badge-warning">${v.status}</span></td>
                <td><button class="btn btn-sm btn-success" onclick="verifyLandlord(${v.verificationID}, 'approved')">Approve</button>
                <button class="btn btn-sm btn-danger" onclick="verifyLandlord(${v.verificationID}, 'rejected')">Reject</button></td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('pendingVerifications').innerHTML = html;
    } catch (error) {
        console.error('Error loading verifications:', error);
    }
}

async function verifyLandlord(verificationID, status) {
    try {
        const response = await fetch(`/api/admin/verify/${verificationID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, adminID: 1 })
        });
        const result = await response.json();
        if (result.success) {
            showAlert(`Verification ${status}`, 'success');
            loadPendingVerifications();
            loadAdminStats();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadReportedListings() {
    try {
        const response = await fetch('/api/admin/reports');
        const reports = await response.json();
        if (reports.length === 0) {
            document.getElementById('reportedListings').innerHTML = '<p>No reported listings.</p>';
            return;
        }
        let html = '<table class="data-table"><thead><tr><th>Accommodation</th><th>Reported By</th><th>Reason</th><th>Action</th></tr></thead><tbody>';
        reports.forEach(r => {
            html += `<tr>
                <td>${r.accommodationName}</td>
                <td>${r.studentFirstName} ${r.studentLastName}</td>
                <td>${r.reason}</td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteAccommodation(${r.accommodationID})">Remove Listing</button></td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('reportedListings').innerHTML = html;
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

async function deleteAccommodation(accommodationID) {
    if (!confirm('Are you sure you want to remove this listing?')) return;
    try {
        const response = await fetch(`/api/admin/accommodations/${accommodationID}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            showAlert('Listing removed', 'success');
            loadReportedListings();
            loadAdminStats();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadListings() {
    const minPrice = document.getElementById('minPrice')?.value || '';
    const maxPrice = document.getElementById('maxPrice')?.value || '';
    
    let url = '/api/accommodations';
    const params = new URLSearchParams();
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (params.toString()) url += '?' + params.toString();
    
    try {
        const response = await fetch(url);
        const listings = await response.json();
        currentListings = listings;
        displayListings(listings);
    } catch (error) {
        console.error('Error loading listings:', error);
    }
}

function displayListings(listings) {
    const grid = document.getElementById('listingsGrid');
    if (!grid) return;
    
    if (listings.length === 0) {
        grid.innerHTML = '<p style="text-align:center; padding:2rem;">No listings found.</p>';
        return;
    }
    
    grid.innerHTML = listings.map(listing => `
        <div class="listing-card" onclick="viewListing(${listing.accommodationID})">
            <div class="card-image">
                ${listing.verified ? '<div class="verified-badge">Verified</div>' : ''}
                <span>🏠 Accommodation</span>
            </div>
            <div class="card-content">
                <div class="price">R${listing.price} <small>/month</small></div>
                <div class="address">${listing.address || 'Address not specified'}</div>
                <div class="distance">📍 ${listing.distance || '0.5'} km from campus</div>
                <div class="amenities">
                    <span class="amenity">Wi-Fi</span>
                    <span class="amenity">Security</span>
                    <span class="amenity">Water Included</span>
                </div>
                <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); saveListing(${listing.accommodationID})">❤️ Save</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); showReportModal(${listing.accommodationID})">🚨 Report</button>
            </div>
        </div>
    `).join('');
}

function saveListing(accommodationID) {
    if (!savedListings.includes(accommodationID)) {
        savedListings.push(accommodationID);
        localStorage.setItem('savedListings', JSON.stringify(savedListings));
        showAlert('Listing saved!', 'success');
    } else {
        showAlert('Listing already saved', 'info');
    }
}

function displaySavedListings() {
    const savedGrid = document.getElementById('savedGrid');
    if (!savedGrid) return;
    
    const saved = currentListings.filter(l => savedListings.includes(l.accommodationID));
    if (saved.length === 0) {
        savedGrid.innerHTML = '<p style="text-align:center; padding:2rem;">No saved listings.</p>';
        return;
    }
    
    savedGrid.innerHTML = saved.map(listing => `
        <div class="listing-card" onclick="viewListing(${listing.accommodationID})">
            <div class="card-image">
                ${listing.verified ? '<div class="verified-badge">Verified</div>' : ''}
                <span>🏠 Accommodation</span>
            </div>
            <div class="card-content">
                <div class="price">R${listing.price} <small>/month</small></div>
                <div class="address">${listing.address || 'Address not specified'}</div>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); removeSavedListing(${listing.accommodationID})">Remove</button>
            </div>
        </div>
    `).join('');
}

function removeSavedListing(accommodationID) {
    savedListings = savedListings.filter(id => id !== accommodationID);
    localStorage.setItem('savedListings', JSON.stringify(savedListings));
    displaySavedListings();
    showAlert('Listing removed from saved', 'success');
}

function viewListing(accommodationID) {
    const listing = currentListings.find(l => l.accommodationID === accommodationID);
    if (!listing) return;
    
    const modalHtml = `
        <div class="modal" id="listingModal" style="display:flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${listing.name || 'Accommodation Details'}</h3>
                    <span class="close-modal" onclick="closeModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong>Price:</strong> R${listing.price}/month</p>
                    <p><strong>Address:</strong> ${listing.address || 'Not specified'}</p>
                    <p><strong>Landlord:</strong> ${listing.landlordFirstName || ''} ${listing.landlordLastName || ''}</p>
                    <p><strong>Status:</strong> ${listing.availabilityStatus || 'Available'}</p>
                    <hr>
                    <h4>Leave a Review</h4>
                    <div class="form-group">
                        <label>Safety Rating</label>
                        <div class="rating-input" id="safetyStars">
                            ${generateStars('safety')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Cleanliness Rating</label>
                        <div class="rating-input" id="cleanlinessStars">
                            ${generateStars('cleanliness')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Wi-Fi Rating</label>
                        <div class="rating-input" id="wifiStars">
                            ${generateStars('wifi')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Comment</label>
                        <textarea id="reviewComment" rows="3"></textarea>
                    </div>
                    <button class="btn btn-primary" onclick="submitReview(${listing.accommodationID})">Submit Review</button>
                    <hr>
                    <h4>Book This Accommodation</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" id="startDate">
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" id="endDate">
                        </div>
                    </div>
                    <button class="btn btn-success" onclick="bookAccommodation(${listing.accommodationID})">Request Booking</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function generateStars(prefix) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star" data-value="${i}" onclick="setRating('${prefix}', ${i})">★</span>`;
    }
    return stars;
}

let ratings = { safety: 0, cleanliness: 0, wifi: 0, landlord: 0 };

function setRating(category, value) {
    ratings[category] = value;
    const container = document.getElementById(`${category}Stars`);
    if (container) {
        const stars = container.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
}

async function submitReview(accommodationID) {
    if (!currentUser || currentUserType !== 'student') {
        showAlert('Please login as a student to leave a review', 'error');
        closeModal();
        return;
    }
    
    const reviewData = {
        studentID: currentUser.studentID,
        accommodationID: accommodationID,
        safetyRating: ratings.safety || 3,
        cleanlinessRating: ratings.cleanliness || 3,
        wifiRating: ratings.wifi || 3,
        landlordBehaviorRating: ratings.landlord || 3,
        comment: document.getElementById('reviewComment')?.value || ''
    };
    
    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reviewData)
        });
        const result = await response.json();
        if (result.success) {
            showAlert('Review submitted!', 'success');
            closeModal();
        } else {
            showAlert('Failed to submit review', 'error');
        }
    } catch (error) {
        showAlert('Network error', 'error');
    }
}

async function bookAccommodation(accommodationID) {
    if (!currentUser || currentUserType !== 'student') {
        showAlert('Please login as a student to book', 'error');
        return;
    }
    
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    if (!startDate || !endDate) {
        showAlert('Please select start and end dates', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentID: currentUser.studentID,
                accommodationID: accommodationID,
                startDate: startDate,
                endDate: endDate
            })
        });
        const result = await response.json();
        if (result.success) {
            showAlert('Booking request sent!', 'success');
            closeModal();
            loadListings();
        } else {
            showAlert('Booking failed', 'error');
        }
    } catch (error) {
        showAlert('Network error', 'error');
    }
}

function showReportModal(accommodationID) {
    const modalHtml = `
        <div class="modal" id="reportModal" style="display:flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Report Suspicious Listing</h3>
                    <span class="close-modal" onclick="closeModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Reason for Report</label>
                        <select id="reportReason">
                            <option value="Fake listing">Fake listing</option>
                            <option value="Misleading information">Misleading information</option>
                            <option value="Scam attempt">Scam attempt</option>
                            <option value="Harassment">Harassment</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="reportDescription" rows="4"></textarea>
                    </div>
                    <button class="btn btn-danger" onclick="submitReport(${accommodationID})">Submit Report</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function submitReport(accommodationID) {
    if (!currentUser || currentUserType !== 'student') {
        showAlert('Please login as a student to report', 'error');
        closeModal();
        return;
    }
    
    const reason = document.getElementById('reportReason')?.value;
    const description = document.getElementById('reportDescription')?.value;
    
    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentID: currentUser.studentID,
                accommodationID: accommodationID,
                reason: reason,
                description: description
            })
        });
        const result = await response.json();
        if (result.success) {
            showAlert('Report submitted. Admin will review.', 'success');
            closeModal();
        } else {
            showAlert('Failed to submit report', 'error');
        }
    } catch (error) {
        showAlert('Network error', 'error');
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.remove());
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '2000';
    alertDiv.style.maxWidth = '300px';
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

function searchListings() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
    if (!searchTerm) {
        loadListings();
        return;
    }
    const filtered = currentListings.filter(l => 
        (l.name && l.name.toLowerCase().includes(searchTerm)) ||
        (l.address && l.address.toLowerCase().includes(searchTerm))
    );
    displayListings(filtered);
}

function applyFilters() {
    loadListings();
}

function loadProfile() {
    if (!currentUser) return;
    const profileHtml = `
        <div class="auth-container">
            <h2>My Profile</h2>
            <div class="form-group">
                <label>Name</label>
                <input type="text" value="${currentUser.firstName || ''}" readonly>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" value="${currentUser.email || ''}" readonly>
            </div>
            <button class="btn btn-secondary" onclick="logout()">Logout</button>
        </div>
    `;
    document.getElementById('profileScreen').innerHTML = profileHtml;
}

function showAddListingModal() {
    const modalHtml = `
        <div class="modal" id="addListingModal" style="display:flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Listing</h3>
                    <span class="close-modal" onclick="closeModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Property Name</label>
                        <input type="text" id="listingName">
                    </div>
                    <div class="form-group">
                        <label>Address</label>
                        <input type="text" id="listingAddress">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Price (R/month)</label>
                            <input type="number" id="listingPrice">
                        </div>
                        <div class="form-group">
                            <label>Number of Rooms</label>
                            <input type="number" id="listingRooms">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="listingDescription" rows="3"></textarea>
                    </div>
                    <button class="btn btn-primary" onclick="addListing()">Submit Listing</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function addListing() {
    const name = document.getElementById('listingName')?.value;
    const address = document.getElementById('listingAddress')?.value;
    const price = document.getElementById('listingPrice')?.value;
    const numberOfRooms = document.getElementById('listingRooms')?.value;
    const description = document.getElementById('listingDescription')?.value;
    
    if (!name || !address || !price) {
        showAlert('Please fill in required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/accommodations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                landlordID: currentUser.landlordID,
                name: name,
                address: address,
                price: parseFloat(price),
                numberOfRooms: parseInt(numberOfRooms) || 1,
                description: description
            })
        });
        const result = await response.json();
        if (result.success) {
            showAlert('Listing added! Pending admin approval.', 'success');
            closeModal();
            loadLandlordListings();
        } else {
            showAlert('Failed to add listing', 'error');
        }
    } catch (error) {
        showAlert('Network error', 'error');
    }
}

async function loadLandlordListings() {
    if (!currentUser || currentUserType !== 'landlord') return;
    try {
        const response = await fetch(`/api/landlord/${currentUser.landlordID}/accommodations`);
        const listings = await response.json();
        const container = document.getElementById('landlordListings');
        document.getElementById('listingCount').innerText = listings.length;
        
        if (listings.length === 0) {
            container.innerHTML = '<p>No listings yet. Click "Add New Listing" to get started.</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="listings-grid">
                ${listings.map(listing => `
                    <div class="listing-card">
                        <div class="card-content">
                            <div class="price">R${listing.price}/month</div>
                            <div class="address">${listing.address}</div>
                            <p>Status: ${listing.verified ? '✅ Verified' : '⏳ Pending Approval'}</p>
                            <p>Availability: ${listing.availabilityStatus}</p>
                            <button class="btn btn-sm btn-danger" onclick="deleteLandlordListing(${listing.accommodationID})">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteLandlordListing(accommodationID) {
    if (!confirm('Delete this listing?')) return;
    try {
        const response = await fetch(`/api/admin/accommodations/${accommodationID}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            showAlert('Listing deleted', 'success');
            loadLandlordListings();
        }
    } catch (error) {
        showAlert('Error deleting listing', 'error');
    }
}
