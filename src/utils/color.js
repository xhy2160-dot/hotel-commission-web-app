import chroma from 'chroma-js';

// Generate a smooth gradient scale array between two nice colors
export const scale = chroma.scale(['#2A0845', '#64B5F6']).colors(5);

// Export as a function so a NEW random color is generated on every call
export const getRandomHexColor = () => chroma.random().saturate(1.5).hex();



/**
 * Generates an array of hex colors from light blue to dark blue.
 * @param {number} steps - Number of colors in the palette (default: 6)
 * @return {string[]} Array of hex color strings
 */
export function oneColor(steps = 7) {
    // Start with a soft light blue and end with a deep navy
    const lightBlue = '#AECDF2'; // Tailwind Sky-100
    const darkBlue = '#0000FF';  // Deep Navy

    return chroma
        .scale([lightBlue, darkBlue])
        .mode('lch') // 'lch' or 'lab' ensures smooth perceptual transition
        .colors(steps);
}