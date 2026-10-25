// Lumio Watches: privacy-conscious Google Analytics 4 measurement.
// The site does not send names, payment details or other personal fields.
const gtagLoader = document.createElement('script');
gtagLoader.async = true;
gtagLoader.src = 'https://www.googletagmanager.com/gtag/js?id=G-922MMRPYF8';
document.head.appendChild(gtagLoader);

window.dataLayer = window.dataLayer || [];
function gtag(){ window.dataLayer.push(arguments); }
window.gtag = window.gtag || gtag;
gtag('js', new Date());
gtag('config', 'G-922MMRPYF8', {
  anonymize_ip: true,
  send_page_view: true
});
