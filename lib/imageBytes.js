const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function detectImageType(buffer) {
    if (!buffer || buffer.length < 12) {
        return null;
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return 'image/png';
    }
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return 'image/webp';
    }
    return null;
}

module.exports = {
    MAX_IMAGE_BYTES,
    detectImageType
};
