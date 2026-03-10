document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("alumni-container");
    const searchInput = document.getElementById("searchInput");
    const sortNameBtn = document.getElementById("sortName");
    const sortBatchBtn = document.getElementById("sortBatch");
    const loadMoreBtn = document.getElementById("loadMoreBtn"); 
    const filterPublicBtn = document.getElementById("filterPublic"); 
    
    // Grab the dropdown menus
    const universityFilter = document.getElementById("universityFilter");
    const batchFilter = document.getElementById("batchFilter");
    
    let alumniData = [];
    let currentDisplayData = []; 
    
    let itemsPerPage = 12; 
    let currentlyShowing = itemsPerPage;
    
    let isPublicFilterActive = false; 

    // --- BULLETPROOF FETCH WITH CACHE-BUSTER ---
    const cacheBuster = new Date().getTime();

    // 🟢 FIX 1: Added strict cache-control headers to bypass the Service Worker
    fetch(`data.json?v=${cacheBuster}`, { 
        cache: "no-store",
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Could not find data.json");
            }
            return response.json();
        })
        .then(data => {
            alumniData = data;
            currentDisplayData = [...alumniData];
            
            const spinner = document.getElementById('loadingSpinner');
            if(spinner) spinner.style.display = 'none';
            
            populateDropdowns(alumniData);
            displayAlumni(currentDisplayData, false); // initial load is not appending
            updateDashboard(alumniData);
            
            // Give the map a moment to load before plotting points
            setTimeout(() => {
                if(typeof window.plotAlumniOnMap === 'function') {
                    window.plotAlumniOnMap(currentDisplayData);
                }
            }, 500);
        })
        .catch(error => {
            console.error("🚨 CRITICAL ERROR in data.json:", error);
            
            const spinner = document.getElementById('loadingSpinner');
            if (spinner) spinner.style.display = 'none';

            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px; width: 100%;">
                        <h2 style="color: #e63946;">Oops! Database Updating 🛠️</h2>
                        <p>We are currently doing some quick maintenance on the alumni database.<br>Please check back in a few minutes!</p>
                        <p style="font-size: 0.8rem; color: #666; margin-top: 20px;">Developer note: Check data.json for missing commas or quotes.</p>
                    </div>
                `;
            }
        });

   // Automatically fill dropdowns with unique data
    function populateDropdowns(data) {
        if (!universityFilter || !batchFilter) return;

        universityFilter.innerHTML = '<option value="">🏫 All Institutions</option>';
        batchFilter.innerHTML = '<option value="">📅 All Batches</option>';

        const universities = [...new Set(data.map(a => a.university || a.college).filter(Boolean))].sort();
        universities.forEach(uni => {
            const option = document.createElement("option");
            option.value = uni;
            option.textContent = uni;
            universityFilter.appendChild(option);
        });

        const batches = [...new Set(data.map(a => a.hscBatch).filter(Boolean))].sort((a, b) => b - a);
        batches.forEach(batch => {
            const option = document.createElement("option");
            option.value = batch;
            option.textContent = batch;
            batchFilter.appendChild(option);
        });
    }

    // 🟢 FIX 2: Added "isAppending" logic and DocumentFragment for blazing fast rendering
    function displayAlumni(data, isAppending = false) {
        if (!container) return; 

        // Only clear the container if we are filtering or sorting (NOT loading more)
        if (!isAppending) {
            container.innerHTML = ""; 
            if (data.length === 0) {
                container.innerHTML = "<p class='empty-msg'>No alumni found matching your criteria.</p>";
                if(loadMoreBtn) loadMoreBtn.style.display = "none"; 
                return;
            }
        }

        // Figure out which slice of data to show
        const startIndex = isAppending ? currentlyShowing - itemsPerPage : 0;
        const dataToShow = data.slice(startIndex, currentlyShowing);

        // Smart DOM Batching - builds all cards in memory first to prevent mobile lag
        const fragment = document.createDocumentFragment();

        dataToShow.forEach(alumnus => {
            const card = document.createElement("div");
            
            if (alumnus.isDeveloper) {
                card.className = "alumni-card developer-card";
            } else {
                card.className = "alumni-card";
            }
            
            // ==========================================
            // 🟢 FIXED SMART LOGIC: Exact match to fix the CSE bug
            // ==========================================
            let studyLabel = "Department"; 
            let studyValue = alumnus.department || alumnus.group || "N/A"; 
            let lowerStudy = studyValue.toLowerCase().trim();

            if (lowerStudy === "science" || lowerStudy === "commerce" || lowerStudy === "business studies" || lowerStudy === "arts" || lowerStudy === "humanities") {
                studyLabel = "Group";
            }
            // ==========================================
            
            const emailButton = (alumnus.emailUser && alumnus.emailDomain) ? 
                `<button class="contact-btn" onclick="window.location.href='mailto:${alumnus.emailUser}@${alumnus.emailDomain}'">✉️ Email</button>` : "";

            const whatsappText = `Hello ${alumnus.name}, I am a current student. I found your profile on the Alumni Directory and would love to ask you a quick question!`;
            const whatsappButton = (alumnus.whatsappCode && alumnus.whatsappNum) ? 
                `<button class="whatsapp-btn" onclick="window.open('https://wa.me/${alumnus.whatsappCode}${alumnus.whatsappNum}?text=${encodeURIComponent(whatsappText)}', '_blank')">💬 WhatsApp</button>` : "";

            const callButton = (alumnus.phoneCode && alumnus.phoneNum) ? 
                `<button class="contact-btn call-btn" onclick="window.location.href='tel:${alumnus.phoneCode}${alumnus.phoneNum}'">📞 Call</button>` : "";

            const mentoringBadge = alumnus.mentoring ? `<div class="mentoring-badge"><span class="glow-dot"></span>Mentoring</div>` : "";
            const newArrivalBadge = alumnus.isNew ? `<div class="new-badge">✨ NEW</div>` : "";
            const publicTag = alumnus.isPublic ? `<span class="public-badge">🏛️ Public</span>` : "";
            const developerBadge = alumnus.isDeveloper ? `<div class="developer-badge">👨‍💻 Lead Developer</div><br>` : "";

            const institutionValue = alumnus.university || alumnus.college || "N/A";

            // --- SANITIZE STRINGS FOR BUTTONS ---
            const safeName = alumnus.name ? alumnus.name.replace(/'/g, "\\'") : "Alumnus";
            const safeUni = institutionValue ? institutionValue.replace(/'/g, "\\'") : "N/A";
            const safeDept = studyValue ? studyValue.replace(/'/g, "\\'") : "N/A";
            const safeBatch = alumnus.hscBatch || "N/A";
            const safeAdmission = alumnus.admissionYear || "N/A";
            const safePhoto = alumnus.photo || 'images/default-avatar.png';

            // --- ACTION BUTTONS ---
            const actionButtons = `
                <div class="card-action-buttons">
                    <button class="btn-share" onclick="shareProfile(this, '${safeName}', '${safeUni}')">🔗 Share</button>
                    <button class="btn-digital-id" onclick="generateIDCard('${safeName}', '${safePhoto}', '${safeUni}', '${safeDept}', '${safeBatch}', '${safeAdmission}', this)">🪪 Digital ID</button>
                </div>
            `;

            // 🟢 FIX 3: Added loading="lazy" to the <img> tag
            card.innerHTML = `
                ${newArrivalBadge}
                ${mentoringBadge}
                <img src="${alumnus.photo}" alt="Photo of ${alumnus.name}" loading="lazy" onerror="this.src='images/default-avatar.png'">
                <h2>${alumnus.name}</h2>
                ${developerBadge}
                <p><strong>Institution:</strong> ${institutionValue} ${publicTag}</p>
                <p><strong>${studyLabel}:</strong> ${studyValue}</p>
                <p><strong>Admission:</strong> ${alumnus.admissionYear}</p>
                <div class="badge">HSC Batch: ${alumnus.hscBatch}</div>
                <br>
                <div class="button-group">
                    ${emailButton}
                    ${whatsappButton}
                    ${callButton}
                </div>
                ${actionButtons} 
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment); // Appends everything at once smoothly

        if (loadMoreBtn) {
            if (currentlyShowing < data.length) {
                loadMoreBtn.style.display = "inline-block";
            } else {
                loadMoreBtn.style.display = "none";
            }
        }
    }

    // The Master Filter!
    function applyFilters() {
        const searchString = searchInput ? searchInput.value.toLowerCase() : "";
        const selectedUni = universityFilter ? universityFilter.value : "";
        const selectedBatch = batchFilter ? batchFilter.value.toString() : "";

        let filteredData = isPublicFilterActive ? alumniData.filter(a => a.isPublic) : alumniData;

        currentDisplayData = filteredData.filter(alumnus => {
            const institution = (alumnus.university || alumnus.college || "");
            const name = (alumnus.name || "").toLowerCase();
            const batch = (alumnus.hscBatch || "").toString();

            const matchesSearch = name.includes(searchString) || institution.toLowerCase().includes(searchString) || batch.includes(searchString);
            const matchesUni = selectedUni === "" || institution === selectedUni;
            const matchesBatch = selectedBatch === "" || batch === selectedBatch;

            return matchesSearch && matchesUni && matchesBatch;
        });

        currentlyShowing = itemsPerPage; 
        displayAlumni(currentDisplayData, false); // Filter changes mean we reset and don't append
        
        if(typeof window.plotAlumniOnMap === 'function') {
            window.plotAlumniOnMap(currentDisplayData); 
        }
    }

    // Event Listeners for Filters
    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (universityFilter) universityFilter.addEventListener("change", applyFilters);
    if (batchFilter) batchFilter.addEventListener("change", applyFilters);

    if (filterPublicBtn) {
        filterPublicBtn.addEventListener("click", () => {
            isPublicFilterActive = !isPublicFilterActive; 
            filterPublicBtn.classList.toggle("active-filter");
            applyFilters(); 
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            currentlyShowing += itemsPerPage; 
            displayAlumni(currentDisplayData, true); // 🟢 FIX 4: true means we APPEND instead of reset!
        });
    }

    if (sortNameBtn) {
        sortNameBtn.addEventListener("click", () => {
            currentDisplayData.sort((a, b) => a.name.localeCompare(b.name));
            currentlyShowing = itemsPerPage; 
            displayAlumni(currentDisplayData, false);
        });
    }

    if (sortBatchBtn) {
        sortBatchBtn.addEventListener("click", () => {
            currentDisplayData.sort((a, b) => b.hscBatch - a.hscBatch);
            currentlyShowing = itemsPerPage; 
            displayAlumni(currentDisplayData, false);
        });
    }

    // --- DARK MODE LOGIC ---
    const darkModeToggle = document.getElementById("darkModeToggle");
    const body = document.body;

    if (darkModeToggle) {
        if (localStorage.getItem("theme") === "dark") {
            body.classList.add("dark-mode");
            darkModeToggle.textContent = "☀️"; 
        }

        darkModeToggle.addEventListener("click", () => {
            body.classList.toggle("dark-mode");
            if (body.classList.contains("dark-mode")) {
                darkModeToggle.textContent = "☀️";
                localStorage.setItem("theme", "dark");
            } else {
                darkModeToggle.textContent = "🌙";
                localStorage.setItem("theme", "light");
            }
        });
    }

    // --- SCROLL TO TOP LOGIC ---
    const scrollToTopBtn = document.getElementById("scrollToTopBtn");
    
    if (scrollToTopBtn) {
        window.addEventListener("scroll", () => {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                scrollToTopBtn.style.display = "block";
            } else {
                scrollToTopBtn.style.display = "none";
            }
        });

        scrollToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    function updateDashboard(data) {
        const totalAlumniElement = document.getElementById("total-alumni");
        const totalUniversitiesElement = document.getElementById("total-universities");
        const totalDepartmentsElement = document.getElementById("total-departments");

        const totalAlumni = data.length;
        const uniqueInstitutions = new Set(data.map(a => a.university || a.college).filter(Boolean)).size;
        const uniqueStudy = new Set(data.map(a => a.department || a.group).filter(Boolean)).size;

        if (totalAlumniElement) totalAlumniElement.textContent = totalAlumni;
        if (totalUniversitiesElement) totalUniversitiesElement.textContent = uniqueInstitutions;
        if (totalDepartmentsElement) totalDepartmentsElement.textContent = uniqueStudy;
    }
});

// --- SHARE PROFILE LOGIC ---
window.shareProfile = function(buttonElement, name, institution) {
    const websiteUrl = window.location.href.split('?')[0]; 
    
    // Write ONLY the URL to the clipboard
    navigator.clipboard.writeText(websiteUrl).then(() => {
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = "✅ Copied!";
        buttonElement.classList.add("btn-success-state");
        
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.classList.remove("btn-success-state");
        }, 2000);
    });
};

// --- BKASH/NAGAD POP-UP LOGIC ---
document.addEventListener("DOMContentLoaded", () => {
    const paymentModal = document.getElementById("paymentModal");
    const supportBtn = document.getElementById("supportBtn");
    const closePaymentModal = document.getElementById("closePaymentModal");

    if (supportBtn && paymentModal && closePaymentModal) {
        supportBtn.addEventListener("click", () => {
            paymentModal.style.display = "flex";
        });

        closePaymentModal.addEventListener("click", () => {
            paymentModal.style.display = "none";
        });

        window.addEventListener("click", (e) => {
            if (e.target === paymentModal) {
                paymentModal.style.display = "none";
            }
        });
    }
});

window.copyPaymentNumber = function(number, buttonElement) {
    navigator.clipboard.writeText(number).then(() => {
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = "✅ Copied!";
        buttonElement.classList.add("btn-success-state");
        
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.classList.remove("btn-success-state");
        }, 2000);
    });
};

// --- PWA SERVICE WORKER REGISTRATION ---
// ==========================================
// 💣 NUCLEAR CACHE KILLER (Replaces old Service Worker)
// ==========================================
if ('serviceWorker' in navigator) {
    // 1. Unregister all stuck Service Workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (let registration of registrations) {
            registration.unregister().then(function(boolean) {
                console.log("Old Service Worker destroyed.");
            });
        }
    });

    // 2. Wipe the Cache Storage API clean
    if ('caches' in window) {
        caches.keys().then(function(names) {
            for (let name of names) {
                caches.delete(name);
                console.log("Old cache deleted: " + name);
            }
        });
    }
}

// ==========================================
// 🗺️ SMART AUTOMATIC MAP LOGIC
// ==========================================

const bangladeshBounds = [
    [20.3, 87.8], 
    [26.9, 92.9]  
];

const map = L.map('alumniMap', {
    center: [23.6850, 90.3563],
    zoom: 7,
    minZoom: 6,
    maxBounds: bangladeshBounds,
    maxBoundsViscosity: 1.0
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let markersGroup = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
});

map.addLayer(markersGroup);

let geoCache = JSON.parse(localStorage.getItem("geoCache")) || {
    "DEFAULT": [23.7500, 90.3900] 
};

const delay = ms => new Promise(res => setTimeout(res, ms));
window.plotAlumniOnMap = async function(data) {
    let mapContainer = document.getElementById('alumniMap');
    let mapLoadingOverlay = document.getElementById('mapLoadingOverlay');
    
    if (!mapLoadingOverlay && mapContainer) {
        mapLoadingOverlay = document.createElement('div');
        mapLoadingOverlay.id = 'mapLoadingOverlay';
        mapLoadingOverlay.className = 'map-loading-overlay';
        mapLoadingOverlay.innerHTML = `
            <div class="map-spinner"></div>
            <span class="map-overlay-text">Updating Map...</span>
        `;
        mapContainer.appendChild(mapLoadingOverlay);
    }
    
    if (mapLoadingOverlay) mapLoadingOverlay.style.display = 'flex';

    markersGroup.clearLayers();

    try {
        for (const alumnus of data) {
            const uniName = alumnus.university || alumnus.college;
            const locationName = alumnus.location || ""; 
            
            if (!uniName) continue;

            let searchQuery = locationName ? `${uniName}, ${locationName}` : `${uniName}, Bangladesh`;
            let coords = geoCache[searchQuery];

            if (!coords) {
                try {
                    await delay(1000); 
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
                    const result = await response.json();

                    if (result && result.length > 0) {
                        coords = [parseFloat(result[0].lat), parseFloat(result[0].lon)];
                        geoCache[searchQuery] = coords; 
                        localStorage.setItem("geoCache", JSON.stringify(geoCache)); 
                    } else if (locationName) {
                        const fallbackQuery = locationName;
                        await delay(1000);
                        const fbResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}`);
                        const fbResult = await fbResponse.json();
                        
                        if (fbResult && fbResult.length > 0) {
                            coords = [parseFloat(fbResult[0].lat), parseFloat(fbResult[0].lon)];
                            geoCache[searchQuery] = coords; 
                            localStorage.setItem("geoCache", JSON.stringify(geoCache));
                        }
                    }
                } catch (error) {
                    console.warn(`Could not find coordinates for: ${uniName}`);
                }
            }

            if (!coords) coords = geoCache["DEFAULT"];

            const pinBorderColor = alumnus.isDeveloper ? '#FFD700' : '#004aad'; 
            const pinNeedleColor = alumnus.isDeveloper ? '#FFD700' : '#004aad';
            const popupWrapperClass = alumnus.isDeveloper ? 'map-popup-container dev-popup' : 'map-popup-container';
            const popupImageBorder = alumnus.isDeveloper ? '#FFD700' : '#004aad';

            const customIcon = L.divIcon({
                className: 'custom-profile-pin',
                html: `
                    <div class="pin-img-wrapper" style="border-color: ${pinBorderColor};">
                        <img src="${alumnus.photo || 'images/default-avatar.png'}" class="pin-img" onerror="this.src='images/default-avatar.png'">
                    </div>
                    <div class="pin-needle" style="border-top-color: ${pinNeedleColor};"></div>
                `,
                iconSize: [46, 54], 
                iconAnchor: [23, 54], 
                popupAnchor: [0, -50] 
            });

            const marker = L.marker(coords, { icon: customIcon });
            
            const popupContent = `
                <div class="${popupWrapperClass}">
                    <img src="${alumnus.photo || 'images/default-avatar.png'}" class="map-popup-img" style="border-color: ${popupImageBorder};" onerror="this.src='images/default-avatar.png'">
                    <br>
                    <strong class="map-popup-name" style="color: ${pinBorderColor};">${alumnus.name}</strong>
                    ${alumnus.isDeveloper ? '<div class="map-popup-dev-badge">👨‍💻 Lead Developer</div><br>' : ''}
                    <span class="map-popup-uni">${uniName}</span>
                    <span class="map-popup-batch">Batch: ${alumnus.hscBatch}</span>
                </div>
            `;

            marker.bindPopup(popupContent, {
                maxWidth: 220,     
                minWidth: 140,     
                autoPanPaddingTopLeft: [50, 50], 
                autoPanPaddingBottomRight: [50, 50],
                autoPan: false
            });

            markersGroup.addLayer(marker);
        }
    } finally {
        if (mapLoadingOverlay) {
            mapLoadingOverlay.style.display = 'none';
        }
    }
};

// ==========================================
// 🪪 DIGITAL ID CARD GENERATOR LOGIC 
// ==========================================
window.generateIDCard = function(name, photo, uni, dept, batch, admitted, buttonElement) {
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = "⏳ Generating...";
    buttonElement.disabled = true;
    buttonElement.style.opacity = "0.7";

    document.getElementById('id-card-name').textContent = name;
    document.getElementById('id-card-uni').textContent = uni;
    document.getElementById('id-card-dept').textContent = dept;
    document.getElementById('id-card-batch').textContent = batch;
    document.getElementById('id-card-admitted').textContent = admitted;
    
    const qrContainer = document.getElementById('id-card-qrcode');
    qrContainer.innerHTML = ""; 
    
    const vCardData = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${uni}\nNOTE:Dept: ${dept} | Batch: ${batch}\nEND:VCARD`;
    
    new QRCode(qrContainer, {
        text: vCardData,
        width: 45,  
        height: 45, 
        colorDark : "#004aad", 
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });

    const photoElement = document.getElementById('id-card-photo');
    photoElement.src = photo;

    photoElement.onload = function() {
        setTimeout(takeScreenshotAndDownload, 100);
    };
    
    photoElement.onerror = function() {
        photoElement.src = 'images/default-avatar.png';
        setTimeout(takeScreenshotAndDownload, 100);
    };

    if (photoElement.complete) {
        setTimeout(takeScreenshotAndDownload, 100);
    }

    function takeScreenshotAndDownload() {
        const cardTemplate = document.getElementById('id-card-template');

        html2canvas(cardTemplate, {
            scale: 2, 
            useCORS: true, 
            backgroundColor: null 
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${name.replace(/\s+/g, '_')}_Alumni_ID.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            buttonElement.innerHTML = "✅ Downloaded!";
            buttonElement.classList.add("btn-success-state");
            
            setTimeout(() => {
                buttonElement.innerHTML = originalText;
                buttonElement.classList.remove("btn-success-state");
                buttonElement.style.opacity = "1";
                buttonElement.disabled = false;
            }, 2500);
        }).catch(err => {
            console.error("Error generating ID card:", err);
            buttonElement.innerHTML = "❌ Error";
            
            setTimeout(() => {
                buttonElement.innerHTML = originalText;
                buttonElement.style.opacity = "1";
                buttonElement.disabled = false;
            }, 2000);
        });
    }
};

/* =========================================
   MEMORY VAULT MODAL LOGIC (Live Data)
   ========================================= */
const memoryVaultModal = document.getElementById('memoryVaultModal');
const openGlobalVaultBtn = document.getElementById('openGlobalVaultBtn');
const closeVaultModal = document.getElementById('closeVaultModal');
const vaultGallery = document.getElementById('vaultGallery');

const MEMORY_API_URL = "https://script.google.com/macros/s/AKfycbz4avBwCQ3N4twDBZazuyUvinTz0am9eyr8IcGGkPlm84v1ILNSL5lAQd3qlwRYuO_w/exec";
let memoriesLoaded = false; 

if (openGlobalVaultBtn) {
    openGlobalVaultBtn.addEventListener('click', () => {
        memoryVaultModal.style.display = 'flex'; 
        
        if (!memoriesLoaded) {
            vaultGallery.innerHTML = "<p style='text-align: center; padding: 20px;'>⏳ Loading memories...</p>";
            
            fetch(MEMORY_API_URL)
                .then(response => response.json())
                .then(data => {
                    vaultGallery.innerHTML = ""; 
                    
                    let memoryArray = [];
                    if (Array.isArray(data)) {
                        memoryArray = data;
                    } else if (data && Array.isArray(data.data)) { 
                        memoryArray = data.data; 
                    } else if (data && Array.isArray(data.items)) {
                        memoryArray = data.items;
                    } else {
                        vaultGallery.innerHTML = "<p style='text-align: center; color: red;'>⚠️ Data format error. Check console for details.</p>";
                        return;
                    }

                    if (memoryArray.length === 0) {
                        vaultGallery.innerHTML = "<p style='text-align: center;'>No memories yet. Be the first to add one! 📸</p>";
                        return;
                    }
                    
                    memoryArray.reverse().forEach(memory => {
                        const name = memory["Name"] || "Anonymous";
                        const batch = memory["HSC Batch"] ? ` (Batch ${memory["HSC Batch"]})` : "";
                        const text = memory["The Memory / Story"] || "";
                        const photoUrl = memory["Upload your photo"] || "";

                        if (!text && !photoUrl) return;

                        const card = document.createElement("div");
                        card.className = "memory-card";
                        
                        let htmlContent = "";
                        if (photoUrl) {
                            htmlContent += `<img src="${photoUrl}" alt="Memory photo" class="memory-img" loading="lazy">`;
                        }
                        if (text) {
                            htmlContent += `<p class="memory-text">"${text}"</p>`;
                        }
                        htmlContent += `<span class="memory-author">- ${name}${batch}</span>`;
                        
                        card.innerHTML = htmlContent;
                        vaultGallery.appendChild(card);
                    });
                    
                    memoriesLoaded = true;
                })
                .catch(error => {
                    console.error("Error fetching memories:", error);
                    vaultGallery.innerHTML = "<p style='text-align: center; color: red;'>⚠️ Failed to load memories. Please try again later.</p>";
                });
        }
    });
}

if (closeVaultModal) {
    closeVaultModal.addEventListener('click', () => {
        memoryVaultModal.style.display = 'none';
    });
}

window.addEventListener('click', (event) => {
    if (event.target === memoryVaultModal) {
        memoryVaultModal.style.display = 'none';
    }
});
