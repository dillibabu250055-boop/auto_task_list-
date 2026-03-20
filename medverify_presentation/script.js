document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    const slides = document.querySelectorAll('.slide');
    const progressBar = document.getElementById('progressBar');
    const slideIndicator = document.getElementById('slideIndicator');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    let currentSlide = 0;
    const totalSlides = slides.length;

    function updatePresentation() {
        // Update Slides
        slides.forEach((slide, index) => {
            slide.classList.remove('active');
            if (index === currentSlide) {
                slide.classList.add('active');
            }
        });

        // Update Progress Bar
        const progress = ((currentSlide + 1) / totalSlides) * 100;
        progressBar.style.width = `${progress}%`;

        // Update Indicator
        slideIndicator.textContent = `${currentSlide + 1} / ${totalSlides}`;

        // Handle Slide-Specific Animations
        const streakCircle = document.getElementById('streakProgress');
        if (streakCircle) {
            streakCircle.style.strokeDashoffset = (currentSlide === 4) ? '70' : '283';
        }

        // Re-trigger animations by cloning/removing classes if needed 
        // (The current CSS handles it via .slide.active .animate-up selector)
    }

    function nextSlide() {
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
            updatePresentation();
        }
    }

    function prevSlide() {
        if (currentSlide > 0) {
            currentSlide--;
            updatePresentation();
        }
    }

    // Event Listeners
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            prevSlide();
        }
    });

    // Optional: Mouse wheel navigation
    let lastWheelTime = 0;
    document.addEventListener('wheel', (e) => {
        const now = Date.now();
        if (now - lastWheelTime < 1000) return; // Debounce wheel
        
        if (e.deltaY > 0) {
            nextSlide();
            lastWheelTime = now;
        } else if (e.deltaY < 0) {
            prevSlide();
            lastWheelTime = now;
        }
    });

    // Initial State
    updatePresentation();
});
