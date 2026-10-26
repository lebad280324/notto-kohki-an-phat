'use strict';

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');
function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Mở menu');
  mainNav.classList.remove('is-open');
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  mainNav.classList.toggle('is-open', open);
});
mainNav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => { if (!event.target.closest('.header-inner')) closeMenu(); });
window.matchMedia('(min-width: 901px)').addEventListener('change', closeMenu);

// Observe the top marker once per crossing; CSS keeps the header pinned.
const siteHeader = document.querySelector('.site-header');
const headerMarker = document.querySelector('.header-scroll-marker');
if ('IntersectionObserver' in window) {
  const headerObserver = new IntersectionObserver(([entry]) => {
    siteHeader.classList.toggle('is-scrolled', !entry.isIntersecting);
  });
  headerObserver.observe(headerMarker);
}

// Nitto Kohki's official product pages are documented in README.md.
const models = {
  '45': { model: 'DLV45C', torque: '0,6 – 4,5 Nm', speed: '1.200 vòng/phút' },
  '70': { model: 'DLV70C', torque: '2,0 – 7,0 Nm', speed: '650 vòng/phút' },
};
const modelTabs = [...document.querySelectorAll('[data-model]')];
function selectModel(tab) {
  const selected = models[tab.dataset.model];
  modelTabs.forEach(item => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  for (const [key, value] of Object.entries(selected)) document.querySelector(`[data-spec="${key}"]`).textContent = value;
  document.querySelector('#spec-panel').setAttribute('aria-labelledby', tab.id);
  document.dispatchEvent(new CustomEvent('delvo:modelchange'));
}
modelTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectModel(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? modelTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + modelTabs.length) % modelTabs.length;
    selectModel(modelTabs[nextIndex]);
    modelTabs[nextIndex].focus();
  });
});

const certificateDialog = document.querySelector('#certificate-dialog');
document.querySelector('[data-open-certificate]').addEventListener('click', () => certificateDialog.showModal());
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});

const form = document.querySelector('#demo-form');
const phoneInput = form.elements.phone;
function validatePhone() {
  const digits = phoneInput.value.replace(/\D/g, '');
  const valid = /^[+0-9() .-]*$/.test(phoneInput.value) && digits.length >= 9 && digits.length <= 15;
  phoneInput.setCustomValidity(phoneInput.value && !valid ? 'Vui lòng nhập số điện thoại hợp lệ (9–15 chữ số).' : '');
}
phoneInput.addEventListener('input', validatePhone);
form.addEventListener('input', () => { document.querySelector('#form-result').hidden = true; });
form.addEventListener('submit', event => {
  event.preventDefault();
  validatePhone();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  for (const name of ['name', 'company']) {
    if (!values[name].trim()) {
      form.elements[name].setCustomValidity('Vui lòng điền thông tin.');
      form.elements[name].reportValidity();
      form.elements[name].addEventListener('input', () => form.elements[name].setCustomValidity(''), { once: true });
      return;
    }
  }
  const body = [
    'Kính gửi An Phát,', '',
    'Tôi muốn đăng ký khảo sát và demo Delvo C-Series.', '',
    `Họ và tên: ${values.name.trim()}`,
    `Số điện thoại: ${values.phone.trim()}`,
    `Email: ${values.email.trim()}`,
    `Doanh nghiệp: ${values.company.trim()}`,
    `Nhu cầu: ${values.message.trim() || 'Nhờ đội ngũ kỹ thuật tư vấn thêm.'}`, '',
    'Trân trọng.',
  ].join('\n');
  document.querySelector('#email-request').href = `mailto:contact@anphatco.vn?subject=${encodeURIComponent('Đăng ký demo Delvo C-Series – ' + values.company.trim())}&body=${encodeURIComponent(body)}`;
  document.querySelector('#form-result').hidden = false;
});

// Exported Figma line assets remain unchanged and retain their intrinsic size.
document.querySelectorAll('.spec-table tr').forEach(row => {
  const line = document.createElement('img');
  line.src = 'assets/10-368-imgLine3.svg';
  line.alt = '';
  line.className = 'spec-divider';
  line.setAttribute('aria-hidden', 'true');
  row.lastElementChild.append(line);
});

// Progressive motion: the complete page remains visible without JavaScript.
(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const counters = [...document.querySelectorAll('[data-count]')];
  const counterFrames = new Map();
  let revealObserver;
  let counterObserver;
  let initialized = false;

  function finishCounters() {
    counterFrames.forEach(frame => cancelAnimationFrame(frame));
    counterFrames.clear();
    counters.forEach(counter => {
      counter.textContent = counter.dataset.count;
      counter.dataset.counted = 'true';
    });
  }

  function countUp(counter) {
    if (counter.dataset.counted) return;
    counter.dataset.counted = 'true';
    const target = Number(counter.dataset.count);
    const started = performance.now();
    const duration = 1150;
    function tick(now) {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = String(Math.round(target * eased));
      if (progress < 1 && !reducedMotion.matches) {
        counterFrames.set(counter, requestAnimationFrame(tick));
      } else {
        counter.textContent = String(target);
        counterFrames.delete(counter);
      }
    }
    counterFrames.set(counter, requestAnimationFrame(tick));
  }

  function initializeMotion() {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    if (initialized) {
      root.classList.add('motion-ready');
      return;
    }
    initialized = true;
    const groups = [
      ['.benefit-item', 90, 'rise'],
      ['.applications-heading > *', 90, 'rise'],
      ['.application-card', 100, 'rise'],
      ['.challenges .section-heading > *', 100, 'rise'],
      ['.challenge-card', 120, 'rise'],
      ['.solution-image', 0, 'left'],
      ['.solution-copy > .eyebrow, .solution-copy > h2, .solution-copy > p:not(.eyebrow)', 95, 'right'],
      ['.solution .check-list li', 80, 'rise'],
      ['.solution-copy > .button', 0, 'rise'],
      ['.features .section-heading > *', 100, 'rise'],
      ['.feature-item', 100, 'rise'],
      ['.features-cta', 0, 'rise'],
      ['.spec-copy', 0, 'left'],
      ['.video-preview', 100, 'right'],
      ['.certificate-button', 0, 'left'],
      ['.partner-copy > *', 90, 'rise'],
      ['.demo-copy > p, .demo-copy > h2', 90, 'rise'],
      ['.demo-checks li', 80, 'rise'],
      ['.demo-form', 100, 'right'],
      ['.footer-masthead, .footer-office-row, .footer-contacts', 90, 'rise'],
    ];
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    groups.forEach(([selector, stagger, direction]) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        element.classList.add('reveal');
        element.dataset.reveal = direction;
        element.style.setProperty('--reveal-delay', `${index * stagger}ms`);
        revealObserver.observe(element);
      });
    });
    counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(counter => counterObserver.observe(counter));
    root.classList.add('motion-ready');
  }

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      root.classList.remove('motion-ready');
      revealObserver?.disconnect();
      counterObserver?.disconnect();
      document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-revealed'));
      finishCounters();
    } else {
      initializeMotion();
    }
  });

  document.addEventListener('delvo:modelchange', () => {
    if (reducedMotion.matches) return;
    document.querySelectorAll('[data-spec]').forEach((value, index) => {
      value.getAnimations().forEach(animation => animation.cancel());
      value.animate([
        { opacity: 0.35, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 260, delay: index * 35, easing: 'ease-out' });
    });
  });
  document.addEventListener('visibilitychange', () => root.classList.toggle('motion-paused', document.hidden));
  initializeMotion();
})();
