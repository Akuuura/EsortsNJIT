document.addEventListener('DOMContentLoaded', function () {
  function parseDate(val) {
    if (!val) return null;
    const d = new Date(val + 'T00:00:00');
    return isNaN(d) ? null : d;
  }

  function daysInclusive(start, end) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.round((end - start) / MS_PER_DAY) + 1;
  }

  document.querySelectorAll('[data-rental]').forEach(function (root) {
    const startInput = root.querySelector('.rental-start');
    const endInput = root.querySelector('.rental-end');
    const daysEl = root.querySelector('.rental-days');
    const errEl = root.querySelector('.rental-form__error');
    const totalEl = root.querySelector('.rental-total');
  const propStart = root.querySelector('.rental-prop-start');
  const propEnd = root.querySelector('.rental-prop-end');
  const propDays = root.querySelector('.rental-prop-days');
  const perDayEl = root.querySelector('.rental-per-day-amount');
    let basePriceCents = parseInt(root.dataset.basePrice || '0', 10);
    const currency = root.dataset.currency || (window.Shopify && window.Shopify.currency) || 'USD';

    function formatMoney(cents) {
      try {
        const locale = document.documentElement.lang || navigator.language;
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(cents / 100);
      } catch (e) {
        return (cents / 100).toFixed(2) + ' ' + currency;
      }
    }

    function validateAndUpdate() {
      errEl.hidden = true;
      const s = parseDate(startInput.value);
      const e = parseDate(endInput.value);
      if (!s || !e) {
        daysEl.textContent = '0';
        // show per-day price even when dates are empty
        if (perDayEl) perDayEl.textContent = formatMoney(basePriceCents);
        if (totalEl) totalEl.textContent = formatMoney(0);
        disableSubmit(true);
        return;
      }
      if (e < s) {
        errEl.hidden = false;
        errEl.textContent = root.dataset.invalidRangeMessage || 'End date must be the same or after start date.';
        daysEl.textContent = '0';
        if (perDayEl) perDayEl.textContent = formatMoney(basePriceCents);
        if (totalEl) totalEl.textContent = formatMoney(0);
        disableSubmit(true);
        return;
      }
      const days = daysInclusive(s, e);
      daysEl.textContent = String(days);
      propStart.value = startInput.value;
      propEnd.value = endInput.value;
      propDays.value = String(days);
      // update visual total
      if (totalEl) {
        const totalCents = basePriceCents * days;
        totalEl.textContent = formatMoney(totalCents);
      }
      // update per-day display
      if (perDayEl) perDayEl.textContent = formatMoney(basePriceCents);
      disableSubmit(false);
    }

    function disableSubmit(disabled) {
      // find enclosing form and submit button
      const form = root.closest('form[data-type="add-to-cart-form"]');
      if (!form) return;
      const submit = form.querySelector('[type="submit"]');
      if (submit) submit.disabled = disabled;
    }

    startInput.addEventListener('change', validateAndUpdate);
    endInput.addEventListener('change', validateAndUpdate);

    // Subscribe to variant changes so base price updates if variant changes
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
        try {
          const variant = event.data && event.data.variant;
          if (variant && variant.price !== undefined) {
            basePriceCents = parseInt(variant.price, 10) || basePriceCents;
          }
        } catch (e) {
          // ignore
        }
        // Update per-day display and total after variant change
        if (perDayEl) perDayEl.textContent = formatMoney(basePriceCents);
        validateAndUpdate();
      });
    }

    // Initial check
    validateAndUpdate();
  });
});
