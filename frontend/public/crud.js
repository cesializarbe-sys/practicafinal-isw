// Simple frontend logic: fetch clientes, create, update, delete
document.addEventListener('DOMContentLoaded', () => {
  // check session first
  fetch('/api/session').then(async r => {
    if (r.status === 401) return window.location = '/login.html';
    const d = await r.json();
    if (d && d.user) {
      const span = document.getElementById('usuario-name');
      if (span) span.textContent = d.user.usuario || d.user.username || '';
    }
  }).catch(() => { window.location = '/login.html'; });

  const form = document.getElementById('form-cliente');
  const tbody = document.querySelector('#tabla-clientes tbody');
  const cancelBtn = document.getElementById('cancel');
  const agregarBtn = document.getElementById('agregar');
  const hiddenId = document.getElementById('id_clientes');
  const msgEl = document.getElementById('msg');
  const dniInput = form.querySelector('input[name="dni_ruc"]');

  function showMessage(text, type = 'error') {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.style.display = 'block';
    if (type === 'success') {
      msgEl.className = 'success';
    } else {
      msgEl.className = 'error';
    }
    setTimeout(() => { msgEl.style.display = 'none'; }, 5000);
  }

  // helper: check if dni exists on server (optionally exclude id)
  async function checkDniExists(dni, excludeId) {
    if (!dni) return false;
    try {
      const url = '/api/clientes/check?dni_ruc=' + encodeURIComponent(dni) + (excludeId ? ('&id=' + encodeURIComponent(excludeId)) : '');
      const r = await fetch(url);
      if (!r.ok) return false;
      const j = await r.json();
      return j && j.exists;
    } catch (err) {
      console.error('checkDniExists error', err);
      return false;
    }
  }

  // debounce helper
  function debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  // realtime check on dni input (on blur and on input debounce)
  if (dniInput) {
    const runCheck = async () => {
      const value = dniInput.value.trim();
      const exclude = hiddenId ? hiddenId.value : '';
      if (!value) return;
      const exists = await checkDniExists(value, exclude);
      if (exists) {
        showMessage('Este DNI/RUC ya está en uso. Por favor utiliza uno diferente.', 'error');
      } else {
        // hide message if it was an earlier duplicate
        if (msgEl) { msgEl.style.display = 'none'; }
      }
    };
    dniInput.addEventListener('blur', runCheck);
    dniInput.addEventListener('input', debounce(runCheck, 500));
  }

  async function load() {
    const r = await fetch('/api/clientes');
    const data = await r.json();
    tbody.innerHTML = '';
    if (data && data.clientes) {
      data.clientes.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
              <td>${c.id_clientes}</td>
          <td>${c.dni_ruc || ''}</td>
          <td>${c.nombre_completo || ''}</td>
          <td>${c.telefono || ''}</td>
          <td>${c.correo || ''}</td>
          <td>${c.direccion || ''}</td>
          <td>${c.estado || ''}</td>
          <td>
            <button class="edit">Editar</button>
            <button class="del">Eliminar</button>
          </td>
        `;
        tr.querySelector('.edit').addEventListener('click', () => fillForm(c));
        tr.querySelector('.del').addEventListener('click', async () => {
          if (!confirm('Eliminar cliente?')) return;
          await fetch('/api/clientes/' + c.id_clientes, { method: 'DELETE' });
          tr.style.opacity = 0.3; // animation
          setTimeout(() => load(), 300);
        });
        tbody.appendChild(tr);
      });
    }
  }

  function fillForm(c) {
    // populate form and set hidden id so submit will update
    if (hiddenId) hiddenId.value = c.id_clientes;
    form.dni_ruc.value = c.dni_ruc || '';
    form.nombre_completo.value = c.nombre_completo || '';
    form.telefono.value = c.telefono || '';
    form.correo.value = c.correo || '';
    form.direccion.value = c.direccion || '';
    form.estado.value = c.estado || 'Activo';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      dni_ruc: form.dni_ruc.value.trim(),
      nombre_completo: form.nombre_completo.value.trim(),
      telefono: form.telefono.value.trim(),
      correo: form.correo.value.trim(),
      direccion: form.direccion.value.trim(),
      estado: form.estado.value
    };
    // simple validation
    if (!payload.dni_ruc || !payload.nombre_completo) return alert('DNI/RUC y Nombre completo son obligatorios');
    if (payload.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.correo)) return alert('Correo inválido');

    const idVal = hiddenId ? hiddenId.value : (form.id_clientes ? form.id_clientes.value : '');
    if (idVal) {
      // update
      const id = idVal;
      try {
        const res = await fetch('/api/clientes/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409 && data && data.message) {
            showMessage(data.message, 'error');
            return;
          }
          showMessage(data.error || 'Error al actualizar cliente', 'error');
          return;
        }
        // small animation
        form.style.transition = 'background 0.3s'; form.style.background = '#e7ffe7';
        setTimeout(() => form.style.background = '', 300);
      } catch (err) {
        console.error(err);
        showMessage('Error al actualizar cliente', 'error');
        return;
      }
    } else {
      // create
      try {
        const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409 && data && data.message) {
            showMessage(data.message, 'error');
            return;
          }
          showMessage(data.error || 'Error al crear cliente', 'error');
          return;
        }
        form.style.transition = 'transform 0.2s'; form.style.transform = 'scale(0.99)';
        setTimeout(() => form.style.transform = '', 200);
      } catch (err) {
        console.error(err);
        showMessage('Error al crear cliente', 'error');
        return;
      }
    }
    form.reset();
    if (hiddenId) hiddenId.value = '';
    showMessage('Cliente guardado correctamente', 'success');
    load();
  });

  cancelBtn.addEventListener('click', () => {
    form.reset();
    if (hiddenId) hiddenId.value = '';
  });

  // 'Agregar' button: always insert (POST) using current form values, ignoring hidden id
  if (agregarBtn) {
    agregarBtn.addEventListener('click', async () => {
      const payload = {
        dni_ruc: form.dni_ruc.value.trim(),
        nombre_completo: form.nombre_completo.value.trim(),
        telefono: form.telefono.value.trim(),
        correo: form.correo.value.trim(),
        direccion: form.direccion.value.trim(),
        estado: form.estado.value
      };
      if (!payload.dni_ruc || !payload.nombre_completo) return alert('DNI/RUC y Nombre completo son obligatorios');
      if (payload.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.correo)) return alert('Correo inválido');
      try {
        const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409 && data && data.message) {
            showMessage(data.message, 'error');
            return;
          }
          showMessage(data.error || 'Error al agregar cliente', 'error');
          return;
        }
        form.reset();
        if (hiddenId) hiddenId.value = '';
        showMessage('Cliente agregado correctamente', 'success');
        load();
      } catch (err) {
        console.error('Agregar error', err);
        alert('Error al agregar cliente');
      }
    });
  }

  load();
});