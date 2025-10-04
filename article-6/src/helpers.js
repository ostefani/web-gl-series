/**
 * Sets up mouse and touch input handlers for fluid interaction
 * @param {HTMLCanvasElement} canvas
 * @param {Object} pointer - Pointer state object with x, y, dx, dy, isDown properties
 */
export function setupInputHandlers(canvas, pointer) {
    function updatePointer(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (pointer.isDown) {
            pointer.dx = (x - pointer.x) * 5.0;
            pointer.dy = (y - pointer.y) * -5.0;
        }

        pointer.x = x;
        pointer.y = y;
    }

    canvas.addEventListener('mousedown', (e) => {
        pointer.isDown = true;
        updatePointer(e);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (pointer.isDown) {
            updatePointer(e);
        }
    });

    window.addEventListener('mouseup', () => {
        pointer.isDown = false;
    });

    canvas.addEventListener(
        'touchstart',
        (e) => {
            e.preventDefault();
            pointer.isDown = true;
            updatePointer(e.touches[0]);
        },
        { passive: false }
    );

    canvas.addEventListener(
        'touchmove',
        (e) => {
            e.preventDefault();
            if (pointer.isDown) {
                updatePointer(e.touches[0]);
            }
        },
        { passive: false }
    );

    window.addEventListener('touchend', () => {
        pointer.isDown = false;
    });
}
