(function matrixPulseListener() {
  var script = document.currentScript;
  var allowedOrigin = script && script.dataset ? script.dataset.allowedOrigin : '';
  var autoApply = !(script && script.dataset && script.dataset.autoApply === 'false');
  var applySelector = script && script.dataset && script.dataset.applySelector
    ? script.dataset.applySelector
    : 'button[value="Apply"], input[value="Apply"], .btn-apply, #cmdApply';

  function isAllowedOrigin(origin) {
    if (!allowedOrigin) return false;
    return origin === allowedOrigin;
  }

  function findField(fieldName) {
    return document.getElementsByName(fieldName)[0] || document.getElementById(fieldName);
  }

  function clearSelect(select) {
    Array.prototype.forEach.call(select.options || [], function clearOption(option) {
      option.selected = false;
    });
  }

  function setMultiValue(element, values) {
    if (!element) return false;

    if (element.tagName === 'SELECT') {
      clearSelect(element);
      values.forEach(function selectValue(value) {
        var targetOption = Array.prototype.find.call(element.options || [], function findOption(option) {
          return option.value === value || option.text === value;
        });
        if (targetOption) targetOption.selected = true;
      });
      return true;
    }

    values.forEach(function setCheckboxValue(value) {
      var selector = 'input[name="' + element.name + '"][value="' + value + '"]';
      var checkbox = document.querySelector(selector);
      if (checkbox) checkbox.checked = true;
    });
    return true;
  }

  function setScalarValue(element, value) {
    if (!element) return false;

    if (element.type === 'checkbox') {
      element.checked = value === true || value === 'true' || value === 'Y' || value === 'Yes';
      return true;
    }

    if (element.type === 'radio') {
      var radio = document.querySelector('input[name="' + element.name + '"][value="' + value + '"]');
      if (radio) radio.checked = true;
      return Boolean(radio);
    }

    element.value = value == null ? '' : String(value);
    return true;
  }

  function notifyParent(origin, body) {
    if (!window.parent) return;
    window.parent.postMessage(body, origin);
  }

  window.addEventListener('message', function onPulseMessage(event) {
    if (!isAllowedOrigin(event.origin)) return;
    if (!event.data || event.data.type !== 'PULSE_SYNC_CRITERIA') return;

    try {
      var legacyData = event.data.data || {};
      var applied = 0;
      var missing = [];

      Object.keys(legacyData).forEach(function applyField(fieldName) {
        var element = findField(fieldName);
        var value = legacyData[fieldName];

        if (!element) {
          missing.push(fieldName);
          return;
        }

        var didApply = Array.isArray(value)
          ? setMultiValue(element, value)
          : setScalarValue(element, value);

        if (didApply) {
          applied += 1;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      if (autoApply) {
        var applyButton = document.querySelector(applySelector);
        if (applyButton) applyButton.click();
      }

      notifyParent(event.origin, {
        type: 'PULSE_SYNC_ACK',
        applied: applied,
        missing: missing,
        receivedAt: new Date().toISOString()
      });
    } catch (error) {
      notifyParent(event.origin, {
        type: 'PULSE_SYNC_ERROR',
        message: error && error.message ? error.message : 'Matrix listener failed.'
      });
    }
  });
})();
