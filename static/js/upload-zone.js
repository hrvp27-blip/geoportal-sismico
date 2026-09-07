(function () {

    var zoneRegistry = {};

    function initUploadZone(zoneEl) {
        var input      = zoneEl.querySelector('.upload-zone-input');
        var idleEl     = zoneEl.querySelector('.upload-zone-idle');
        var selectedEl = zoneEl.querySelector('.upload-zone-selected');
        var filenameEl = zoneEl.querySelector('.upload-zone-filename');
        var clearBtn   = zoneEl.querySelector('.upload-zone-clear');
        var btnId      = zoneEl.dataset.triggerBtn;
        var triggerBtn = btnId ? document.getElementById(btnId) : null;

        function showFile(name) {
            filenameEl.textContent = name;
            idleEl.classList.add('is-hidden');
            selectedEl.classList.remove('is-hidden');
            zoneEl.classList.add('has-file');
            if (triggerBtn) {
                triggerBtn.disabled = false;
                triggerBtn.classList.remove('btn-disabled');
            }
        }

        function clearFile() {
            try { input.value = ''; } catch (_) {}
            idleEl.classList.remove('is-hidden');
            selectedEl.classList.add('is-hidden');
            zoneEl.classList.remove('has-file');
            if (triggerBtn) {
                triggerBtn.disabled = true;
                triggerBtn.classList.add('btn-disabled');
            }
        }

        // Starts disabled until a file is chosen
        if (triggerBtn) {
            triggerBtn.disabled = true;
            triggerBtn.classList.add('btn-disabled');
        }

        if (btnId) zoneRegistry[btnId] = clearFile;

        input.addEventListener('change', function () {
            if (input.files && input.files[0]) showFile(input.files[0].name);
            else clearFile();
        });

        clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            clearFile();
        });

        // Drag-over highlight
        ['dragenter', 'dragover'].forEach(function (evt) {
            zoneEl.addEventListener(evt, function (e) {
                e.preventDefault();
                zoneEl.classList.add('is-drag-over');
            });
        });

        ['dragleave', 'dragend'].forEach(function (evt) {
            zoneEl.addEventListener(evt, function (e) {
                // Only remove if leaving the zone itself, not a child element
                if (!zoneEl.contains(e.relatedTarget)) {
                    zoneEl.classList.remove('is-drag-over');
                }
            });
        });

        zoneEl.addEventListener('drop', function (e) {
            e.preventDefault();
            zoneEl.classList.remove('is-drag-over');

            var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (!file) return;

            // Validate extension against accept attribute
            var accept = (input.accept || '').toLowerCase();
            if (accept) {
                var exts = accept.split(',').map(function (s) { return s.trim(); });
                var ok = exts.some(function (ext) {
                    return file.name.toLowerCase().endsWith(ext);
                });
                if (!ok) return;
            }

            // Assign file to the hidden input
            try {
                var dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
            } catch (_) {}

            showFile(file.name);
        });
    }

    window.clearUploadZone = function (btnId) {
        var fn = zoneRegistry[btnId];
        if (fn) fn();
    };

    function init() {
        document.querySelectorAll('.upload-zone').forEach(initUploadZone);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
