const forms = document.querySelectorAll('.convert-form');

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(value >= 10 || exp === 0 ? 0 : 1)} ${units[exp]}`;
};

const clearNode = (node) => {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
};

const renderUploadMeta = (container, files) => {
  clearNode(container);
  if (!files?.length) return null;

  const progressWrap = document.createElement('div');
  progressWrap.className = 'progress-wrap';
  progressWrap.innerHTML = `
    <p>Please wait while your file is being uploaded</p>
    <div class="progress-track"><div class="progress-fill"></div></div>
    <div class="file-row">
      <span>${files[0].name}${files.length > 1 ? ` +${files.length - 1} more` : ''}</span>
      <span>${formatBytes([...files].reduce((sum, file) => sum + file.size, 0))}</span>
    </div>
  `;

  container.appendChild(progressWrap);
  return progressWrap.querySelector('.progress-fill');
};

const runProgressSimulation = (fillEl) => {
  if (!fillEl) return () => {};

  let progress = 8;
  fillEl.style.width = `${progress}%`;
  const timer = setInterval(() => {
    progress = Math.min(progress + Math.random() * 14, 92);
    fillEl.style.width = `${progress}%`;
  }, 220);

  return (final = 100) => {
    clearInterval(timer);
    fillEl.style.width = `${final}%`;
  };
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
  const p = document.createElement('p');
  p.className = 'success';
  p.textContent = payload.message || 'Conversion complete';
  container.appendChild(p);

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
      const link = document.createElement('a');
      link.href = file.url;
      link.textContent = `Download ${file.label}`;
      link.rel = 'noopener';
      li.appendChild(link);
      list.appendChild(li);
    });

    container.appendChild(list);
  }
};

forms.forEach((form) => {
  const input = form.querySelector('.file-input');
  const dropzone = form.querySelector('.dropzone');
  const result = form.parentElement.querySelector('.result');
  const meta = form.parentElement.querySelector('.upload-meta');
  const button = form.querySelector('.action-btn');

  const assignFiles = (files) => {
    const transfer = new DataTransfer();
    [...files].forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
  };

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (event) => {
    if (!event.dataTransfer?.files?.length) return;
    assignFiles(event.dataTransfer.files);
  });

  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const files = input.files;
    const maxFiles = Number.parseInt(form.dataset.max || '1', 10);

    clearNode(result);

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
    const progressFill = renderUploadMeta(meta, files);
    const stopProgress = runProgressSimulation(progressFill);

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

      stopProgress(100);
      renderSuccess(result, payload);
      form.reset();
    } catch (error) {
      stopProgress(100);
      renderError(result, error.message || 'Conversion failed');
    } finally {
      button.disabled = false;
      setTimeout(() => clearNode(meta), 3500);
    }
  });
});
