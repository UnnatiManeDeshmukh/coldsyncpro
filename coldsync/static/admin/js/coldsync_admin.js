/* ColdSync Pro — Admin Enhancements */
(function () {
  'use strict';

  // ── Sidebar active link highlight on load ──────────────────
  document.querySelectorAll('.nav-sidebar .nav-link').forEach(function (link) {
    if (link.href === window.location.href) {
      link.classList.add('active');
    }
  });

  // ── Auto-dismiss messages after 4s ────────────────────────
  setTimeout(function () {
    document.querySelectorAll('.messagelist li').forEach(function (msg) {
      msg.style.transition = 'opacity .5s';
      msg.style.opacity = '0';
      setTimeout(function () { msg.remove(); }, 500);
    });
  }, 4000);

  // ── Row click → open change link ──────────────────────────
  document.querySelectorAll('#result_list tbody tr').forEach(function (row) {
    var link = row.querySelector('a');
    if (link) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function (e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'A') {
          window.location = link.href;
        }
      });
    }
  });

  // ── Confirm bulk delete ────────────────────────────────────
  var actionForm = document.querySelector('#changelist-form');
  if (actionForm) {
    actionForm.addEventListener('submit', function (e) {
      var action = document.querySelector('select[name="action"]');
      if (action && action.value === 'delete_selected') {
        var checked = document.querySelectorAll('input[name="_selected_action"]:checked').length;
        if (checked > 0 && !confirm('Delete ' + checked + ' selected item(s)? This cannot be undone.')) {
          e.preventDefault();
        }
      }
    });
  }
})();
