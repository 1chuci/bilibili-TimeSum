document.getElementById('calculateBtn').addEventListener('click', () => {
    const timeInput = document.getElementById('timeInput').value;
    const lines = timeInput.split('\n').filter(line => line.trim() !== '');

    let totalSeconds = 0;

    lines.forEach(line => {
        const parts = line.replace(/["',]/g, '').trim().split(':').map(part => parseInt(part, 10));
        
        if (parts.some(isNaN)) {
            return; // Skip invalid lines
        }

        let seconds = 0;
        if (parts.length === 3) { // HH:MM:SS
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) { // MM:SS
            seconds = parts[0] * 60 + parts[1];
        }
        totalSeconds += seconds;
    });

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const format = (num) => num.toString().padStart(2, '0');

    document.getElementById('totalDuration').textContent = 
        `${format(hours)}:${format(minutes)}:${format(seconds)}`;
});