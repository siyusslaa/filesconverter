const forms = document.querySelectorAll('form[data-endpoint]');

const clearNode = (node) => {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
};

const renderError = (container, message) => {
  clearNode(container);
  const p = document.createElement('p');
  p.className = 'error';
  p.textContent = message;
  container.appendChild(p);
};

const renderSuccess = (container, payload) => {
  clearNode(container);

  const ok = document.createElement('p');
  ok.className = 'success';
  ok.textContent = payload.message || 'Conversion complete';
  container.appendChild(ok);

  if (payload.zipUrl) {
    const zip = document.createElement('a');
    zip.href = payload.zipUrl;
    zip.textContent = 'Download all as ZIP';
    zip.rel = 'noopener';
    container.appendChild(zip);
  }

  if (Array.isArray(payload.files) && payload.files.length) {
    const list = document.createElement('ul');
    payload.files.forEach((file) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = file.url;
      a.textContent = `Download ${file.label}`;
      a.rel = 'noopener';
      li.appendChild(a);
      list.appendChild(li);
    });
    container.appendChild(list);
  }
};

forms.forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    const input = form.querySelector('input[type="file"]');
    const result = form.parentElement.querySelector('.result');

    if (!input || !result) return;

    const files = input.files;
    const maxFiles = Number.parseInt(form.dataset.max || '1', 10);

    if (!files || files.length === 0) {
      renderError(result, 'Please select at least one file.');
      return;
    }

    if (files.length > maxFiles) {
      renderError(result, `This tool supports up to ${maxFiles} files.`);
      return;
    }

    const formData = new FormData();
    [...files].forEach((file) => formData.append('files', file));

    button.disabled = true;
    clearNode(result);
    const status = document.createElement('p');
    status.className = 'status';
    status.textContent = 'Processing upload and conversion...';
    result.appendChild(status);

    try {
      const response = await fetch(form.dataset.endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Conversion failed');
      }

      renderSuccess(result, payload);
      form.reset();
    } catch (error) {
      renderError(result, error.message || 'Conversion failed');
    } finally {
      button.disabled = false;
    }
  });
});
