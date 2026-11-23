const root = document.documentElement;
const preference = matchMedia('(prefers-color-scheme: dark)');
let selected;
try { selected = localStorage.getItem('wear-theme'); } catch {}
function applyTheme() {
  root.dataset.theme = ['light', 'dark'].includes(selected) ? selected : preference.matches ? 'dark' : 'light';
  document.querySelector('#theme-toggle')?.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
}
applyTheme();
preference.addEventListener('change', applyTheme);
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  document.querySelector('#theme-toggle').addEventListener('click', () => {
    selected = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('wear-theme', selected); } catch {}
    applyTheme();
  });
});
