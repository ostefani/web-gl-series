export function revealTitle(svgElement) {
    const DURATION = 1000;
    const HTML_STYLES = {
        OPACITY_1: 'opacity-1',
    };

    const titleElement = document.getElementById('title');
    titleElement.classList.add(HTML_STYLES.OPACITY_1);
    const paths = Array.from(svgElement.querySelectorAll('path'));

    paths.forEach((path, index) => {
        const length = path.getTotalLength();

        const maskPath = path.cloneNode();
        maskPath.classList.add('mask');
        maskPath.style.strokeDasharray = length;
        maskPath.style.strokeDashoffset = length;

        const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
        mask.id = `mask-${index}`;

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', 'black');

        mask.appendChild(bg);
        mask.appendChild(maskPath);

        svgElement.insertBefore(mask, svgElement.firstChild);
        path.setAttribute('mask', `url(#mask-${index})`);

        const delay = ((paths.length - 1 - index) * DURATION) / 2;

        maskPath.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
            duration: DURATION,
            delay: delay,
            easing: 'ease-in-out',
            fill: 'forwards',
        });
    });
}
