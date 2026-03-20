/* =============================================================
   STATE
   Shared variables used across the whole module.
   ============================================================= */
let isMoving = false;        // Locks movement while a slide animation is in progress
let startX = 0;              // Stores the X position where a drag/swipe started
let autoplayInterval = null; // Holds the setInterval reference so it can be cleared

const base = window.location.pathname.replace(/\/$/, '');    // document.location.pathname to build the correct base URL dynamically
const JSON_PATH = `${base}/manifest.json`;                   // Path of the JSON file
const AUTO_PLAY = 5000                                       // Interval between automatic slides in ms. Default: 5000 ms / 5s.


/* =============================================================
   INIT
   Entry point. Runs when the DOM is ready.
   Fetches the image manifest, builds the slides,
   then hands off to updateLayout() and initControls().
   ============================================================= */
document.addEventListener('DOMContentLoaded', initGallery);

async function initGallery() {
    const track = document.getElementById('inlineSliderTrack');
    if (!track) return;

    try {
        // 1. Fetch the JSON file that lists all gallery images
        const res  = await fetch(JSON_PATH);
        const data = await res.json();

        // 2. Normalise each entry into a plain { url, caption } object
        const galleryData = data.images.map(img => ({
            url: `${base}/${img.path}`,
            caption: img.caption
        }));

        // 3. Build the slide HTML and inject it into the track
        track.innerHTML = galleryData.map(img => `
            <div class="slide-item" onclick="handleSlideClick(this)">
                <div class="img-container">
                    <img src="${img.url}" alt="${img.caption}" draggable="false">
                </div>
            </div>
        `).join('');

        // Set the center index to 0 (first image in the JSON)
        const startIndex = 0;
        const { centerIdx } = getSettings();
        const rotations = (startIndex - centerIdx + galleryData.length) % galleryData.length;
        for (let i = 0; i < rotations; i++) {
            track.appendChild(track.firstElementChild);
        }

        updateLayout(track); // Position the track and mark the center slide as active
        initControls(track); // Attach drag, touch, resize, keyboard, and autoplay logic
    } catch (e) {
        console.error("Gallery failed to load:", e);
    }
}


/* =============================================================
   CLICK HANDLER
   Called when the user clicks any slide.
   - Clicking the center (active) slide opens the fullscreen modal.
   - Clicking a side slide first moves it to center, then opens the modal.
   ============================================================= */
window.handleSlideClick = function(el) {
    const track = document.getElementById('inlineSliderTrack');
    const slides = Array.from(track.children);
    const elementIndex = slides.indexOf(el);
    const { centerIdx } = getSettings();

    if (elementIndex === centerIdx) {
        // Already in center → open fullscreen immediately
        openFullscreenGallery();
    } else {
        // Side slide clicked → move it to center, then open modal showing that image
        const dir = elementIndex > centerIdx ? 1 : -1;
        const clickedImg = el.querySelector('img');
        window.moveInline(dir);
        openFullscreenGallery();
        // Force the modal to show the clicked image right away,
        // before the track animation has fully settled
        if (clickedImg) {
            document.getElementById('modalImg').src = clickedImg.src;
            document.getElementById('modalImg').alt = clickedImg.alt;
            document.getElementById('modalCaptionText').textContent = clickedImg.alt;
        }
    }
};


/* =============================================================
   RESPONSIVE SETTINGS
   Returns the correct values depending on viewport width:
   - Mobile  → 1 slide at 100%, center index = 0
   - Desktop → 3 slides at 33.3%, center index = 1
   ============================================================= */
function getSettings() {
    const isMobile = window.innerWidth < 768;
    return {
        widthPercent: isMobile ? 100 : 33.333,
        centerIdx:    isMobile ? 0   : 1
    };
}


/* =============================================================
   LAYOUT
   Positions the track so the center slide is visually centered,
   and applies the `.is-active` class to the correct slide.
   Called on init and on every window resize.
   ============================================================= */
   function updateLayout(track) {
    const { widthPercent, centerIdx } = getSettings();
    // Calculate the translateX offset that places the center slide in view
    const offset = -(centerIdx * widthPercent) + (100 - widthPercent) / 2;

    track.classList.add('no-transition');    // Snap without animation
    track.style.transform = `translateX(${offset}%)`;
    Array.from(track.children).forEach((s, i) =>
        s.classList.toggle('is-active', i === centerIdx)
    );
    track.offsetHeight;                      // Force reflow so the class change is applied
    track.classList.remove('no-transition'); // Re-enable animation for future moves
}


/* =============================================================
   MOVE
   Core sliding logic. Shifts the track left or right by one slide.

   Direction -1 (previous):
     Instantly moves the last slide to the front (DOM prepend),
     jumps the track back one step without animation, then
     animates it forward to the center position.

   Direction +1 (next):
     Animates the track left by one step, then moves the first
     slide to the end (DOM append) and snaps back to center.

   A safety timeout ensures isMoving is always unlocked even if
   the transitionend event misfires.
   ============================================================= */
function move(direction) {
    if (isMoving) return;
    isMoving = true;

    const track = document.getElementById('inlineSliderTrack');
    const { widthPercent, centerIdx } = getSettings();
    const baseOffset = -(centerIdx * widthPercent) + (100 - widthPercent) / 2;

    if (direction === -1) {
        // — Previous slide —
        // Move last slide to front instantly, then animate to center
        track.classList.add('no-transition');
        track.insertBefore(track.lastElementChild, track.firstElementChild);
        track.style.transform = `translateX(${baseOffset - widthPercent}%)`;
        Array.from(track.children).forEach((s, i) =>
            s.classList.toggle('is-active', i === centerIdx)
        );
        track.offsetHeight; // Force reflow
        track.classList.remove('no-transition');
    } else {
        // — Next slide —
        // Highlight the incoming slide before animating
        Array.from(track.children).forEach((s, i) =>
            s.classList.toggle('is-active', i === centerIdx + 1)
        );
    }

    // Apply the slide animation
    track.style.transform = `translateX(${baseOffset + (direction === -1 ? 0 : -widthPercent)}%)`;

    // Safety net: unlock after 350ms in case transitionend doesn't fire
    const safetyTimer = setTimeout(() => {
        isMoving = false;
        if (direction === 1) {
            track.removeEventListener('transitionend', onEnd);
            track.classList.add('no-transition');
            track.appendChild(track.firstElementChild); // Move first slide to end
            track.style.transform = `translateX(${baseOffset}%)`;
            Array.from(track.children).forEach((s, i) =>
                s.classList.toggle('is-active', i === centerIdx)
            );
            track.offsetHeight;
            track.classList.remove('no-transition');
        }
    }, 350);

    // Clean-up after the CSS transition ends
    const onEnd = (e) => {
        if (e.target !== track || e.propertyName !== 'transform') return;
        clearTimeout(safetyTimer);
        track.removeEventListener('transitionend', onEnd);

        if (direction === 1) {
            track.classList.add('no-transition');
            track.appendChild(track.firstElementChild); // Move first slide to end
            track.style.transform = `translateX(${baseOffset}%)`;
            Array.from(track.children).forEach((s, i) =>
                s.classList.toggle('is-active', i === centerIdx)
            );
            track.offsetHeight;
            track.classList.remove('no-transition');
        }

        isMoving = false;
    };
    track.addEventListener('transitionend', onEnd);
}


/* =============================================================
   CONTROLS
   Wires up all interactions on the inline slider:
   - Arrow buttons (via window.moveInline, called from HTML onclick)
   - Mouse drag (click and drag left/right)
   - Touch swipe
   - Window resize (re-calculates layout)
   - Autoplay (auto-advances every 5 seconds)
   ============================================================= */
function initControls(track) {

    // Expose moveInline globally so the HTML buttons can call it
    window.moveInline = dir => {
        if (!document.body.classList.contains('modal-open')) clearAutoplay();
        move(dir);
        if (!document.body.classList.contains('modal-open')) startAutoplay();
    };

    // — Mouse drag —
    let isDragging = false;
    track.addEventListener('mousedown', e => {
        startX = e.clientX;
        isDragging = true;
        clearAutoplay();
    });
    window.addEventListener('mouseup', e => {
        if (!isDragging) return;
        isDragging = false;
        const diff = startX - e.clientX;
        if (Math.abs(diff) > 50) moveInline(diff > 0 ? 1 : -1); // 50px threshold
        if (!document.body.classList.contains('modal-open')) startAutoplay();
    });

    // — Touch swipe —
    track.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        clearAutoplay();
    }, { passive: true });

    track.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) moveInline(diff > 0 ? 1 : -1);
        if (!document.body.classList.contains('modal-open')) startAutoplay();
    }, { passive: true });

    // — Resize: recalculate layout when viewport changes —
    window.addEventListener('resize', () => updateLayout(track));

    startAutoplay();
}


/* =============================================================
   AUTOPLAY
   Advances the slider by one every 5 seconds.
   Paused on user interaction and when the modal is open.
   ============================================================= */
function startAutoplay() {
    clearAutoplay();
    autoplayInterval = setInterval(() => move(1), AUTO_PLAY);
}

function clearAutoplay() {
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
    }
}


/* =============================================================
   FULLSCREEN MODAL
   Builds and injects the modal HTML into #mediaModal,
   syncs it with the current center slide image,
   and sets up navigation, keyboard, and swipe support.
   ============================================================= */
function openFullscreenGallery() {
    clearAutoplay();
    const modal = document.getElementById('mediaModal');
    if (!modal) return;

    document.body.classList.add('modal-open');

    modal.innerHTML = `
        <div id="modalOverlay" class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center cursor-zoom-out">
            <div id="modalContainer" class="relative z-[110] max-w-[85vw] animate-fadeIn cursor-default" onclick="event.stopPropagation()">
                <button id="modalClose" class="fullscreen-close-btn">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <button id="modalPrev" class="slider-nav-btn left-btn modal-arrow">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
                        <path d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <button id="modalNext" class="slider-nav-btn right-btn modal-arrow">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
                        <path d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
                <div class="rounded-2xl overflow-hidden shadow-2xl bg-black flex flex-col" style="position:relative;">
                    <img id="modalImg" src="" alt="" style="display:block;width:auto;max-height:80vh;object-fit:contain;margin:0 auto;">
                    <div class="modal-caption">
                        <p id="modalCaptionText" class="text-white font-medium tracking-widest uppercase text-sm"></p>
                    </div>
                </div>
            </div>
        </div>
    `;

    updateModalData(); // Populate image and caption from the current center slide

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Button event listeners
    document.getElementById('modalOverlay').onclick = closeModal;
    document.getElementById('modalPrev').onclick  = (e) => { e.stopPropagation(); modalNav(-1); };
    document.getElementById('modalNext').onclick  = (e) => { e.stopPropagation(); modalNav(1);  };
    document.getElementById('modalClose').onclick = (e) => { e.stopPropagation(); closeModal(); };

    document.addEventListener('keydown', handleKeydown);

    // — Mouse drag inside modal —
    let modalStartX = 0;
    let modalIsDragging = false;
    const modalContainer = document.getElementById('modalContainer');

    modalContainer.addEventListener('mousedown', e => {
        modalStartX = e.clientX;
        modalIsDragging = true;
    });
    window.addEventListener('mouseup', function modalMouseUp(e) {
        if (!modalIsDragging) return;
        modalIsDragging = false;
        const diff = modalStartX - e.clientX;
        if (Math.abs(diff) > 50) modalNav(diff > 0 ? 1 : -1);
        window.removeEventListener('mouseup', modalMouseUp);
    });

    // — Touch swipe inside modal —
    modalContainer.addEventListener('touchstart', e => {
        modalStartX = e.touches[0].clientX;
    }, { passive: true });

    modalContainer.addEventListener('touchend', e => {
        const diff = modalStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) modalNav(diff > 0 ? 1 : -1);
    }, { passive: true });
}


/* =============================================================
   MODAL DATA SYNC
   Reads the current center slide's image and updates the modal.
   ============================================================= */
function updateModalData() {
    const { centerIdx } = getSettings();
    const track = document.getElementById('inlineSliderTrack');
    if (!track || !track.children[centerIdx]) return;

    const activeImg   = track.children[centerIdx].querySelector('img');
    const modalImg    = document.getElementById('modalImg');
    const modalCaption = document.getElementById('modalCaptionText');

    if (modalImg && activeImg) {
        modalImg.src = activeImg.src;
        modalImg.alt = activeImg.alt;
        modalCaption.textContent = activeImg.alt;
    }
}


/* =============================================================
   MODAL NAVIGATION
   Moves both the underlying inline slider and the modal image
   in sync so they never go out of step.
   ============================================================= */
window.modalNav = function(dir) {
    if (isMoving) return;

    const track  = document.getElementById('inlineSliderTrack');
    const { centerIdx } = getSettings();
    const slides = Array.from(track.children);

    // Figure out which slide will become center after the move
    const incomingIdx = dir === 1
        ? (centerIdx + 1) % slides.length
        : (centerIdx - 1 + slides.length) % slides.length;

    // Update the modal image immediately (before the track animation)
    const incomingImg = slides[incomingIdx]?.querySelector('img');
    if (incomingImg) {
        document.getElementById('modalImg').src = incomingImg.src;
        document.getElementById('modalImg').alt = incomingImg.alt;
        document.getElementById('modalCaptionText').textContent = incomingImg.alt;
    }

    move(dir); // Move the underlying inline slider
};


/* =============================================================
   KEYBOARD HANDLER
   Arrow keys navigate; Escape closes the modal.
   Attached only while the modal is open, removed on close.
   ============================================================= */
function handleKeydown(e) {
    if (e.key === 'ArrowLeft')  modalNav(-1);
    if (e.key === 'ArrowRight') modalNav(1);
    if (e.key === 'Escape')     closeModal();
}


/* =============================================================
   CLOSE MODAL
   Hides and empties the modal, restores page scroll,
   removes the keyboard listener, and restarts autoplay.
   ============================================================= */
window.closeModal = function() {
    const modal = document.getElementById('mediaModal');
    if (modal) {
        document.body.classList.remove('modal-open');
        modal.style.display = 'none';
        modal.classList.add('hidden');
        modal.innerHTML = '';
        document.removeEventListener('keydown', handleKeydown);
        startAutoplay();
    }
};
