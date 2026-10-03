export type ThemeMode = 'light'|'dark';

const lightPalette = {
  paper: '#F4EDDF', card: '#EEE0C6', ink: '#28251F', muted: '#746A5B',
  orange: '#C64D18', orangeDark: '#92350C', line: '#D8CCB6', olive: '#566249',
  softOlive: '#E3E4D4', faint: '#EAE2D2', white: '#FFF9EC',
};
const darkPalette = {
  paper: '#191613', card: '#24201C', ink: '#F4EDE2', muted: '#B9AD9C',
  orange: '#E2672B', orangeDark: '#B94616', line: '#51483F', olive: '#9CAA7A',
  softOlive: '#303629', faint: '#211D19', white: '#FFF8EB',
};

// Kept as one mutable object so every component reads the active colours on
// its next render. Theme changes never touch library or launch state.
export const palette = {...lightPalette};
export let themeMode:ThemeMode='light';
export function setThemeMode(mode:ThemeMode){
 themeMode=mode;
 Object.assign(palette,mode==='dark'?darkPalette:lightPalette);
}
export function isDarkTheme(){return themeMode==='dark';}
export const fonts = { display: 'BodoniBold', italic: 'BodoniItalic', body: 'DMSans', medium: 'DMMedium', bold: 'DMBold' };
export const paper = require('../assets/paper.png');
