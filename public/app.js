const TOKEN_KEY = 'itm_auth_token';

const els = {
  loginView: document.getElementById('loginView'),
  appView: document.getElementById('appView'),
  sidebar: document.getElementById('sidebar'),
  menuToggle: document.getElementById('menuToggle'),
  loginForm: document.getElementById('loginForm'),
  logoutBtn: document.getElementById('logoutBtn'),
  userId: document.getElementById('userId'),
  password: document.getElementById('password'),
  demoUsers: document.getElementById('demoUsers'),
  toastRoot: document.getElementById('toastRoot'),
  sessionInfo: document.getElementById('sessionInfo'),
  navLinks: Array.from(document.querySelectorAll('.nav-link')),
  pages: Array.from(document.querySelectorAll('[data-page-view]')),

  welcomeMessage: document.getElementById('welcomeMessage'),
  dashboardCards: document.getElementById('dashboardCards'),
  dashboardActions: document.getElementById('dashboardActions'),

  employeeSelectorWrap: document.getElementById('employeeSelectorWrap'),
  employeeSelect: document.getElementById('employeeSelect'),
  employeeProfile: document.getElementById('employeeProfile'),
  skillsGrid: document.getElementById('skillsGrid'),
  aspirationForm: document.getElementById('aspirationForm'),
  skillForm: document.getElementById('skillForm'),
  skillRequestForm: document.getElementById('skillRequestForm'),
  careerAspirations: document.getElementById('careerAspirations'),
  skillSelect: document.getElementById('skillSelect'),
  requestedSkillName: document.getElementById('requestedSkillName'),
  requestedSkillCategory: document.getElementById('requestedSkillCategory'),
  requestedSkillReason: document.getElementById('requestedSkillReason'),
  skillLevel: document.getElementById('skillLevel'),

  searchForm: document.getElementById('searchForm'),
  searchText: document.getElementById('searchText'),
  departmentFilter: document.getElementById('departmentFilter'),
  typeFilter: document.getElementById('typeFilter'),
  opportunities: document.getElementById('opportunities'),

  createOpportunityWrap: document.getElementById('createOpportunityWrap'),
  opportunityForm: document.getElementById('opportunityForm'),
  oppTitle: document.getElementById('oppTitle'),
  oppType: document.getElementById('oppType'),
  oppJobId: document.getElementById('oppJobId'),
  oppDepartment: document.getElementById('oppDepartment'),
  oppDuration: document.getElementById('oppDuration'),
  oppRelatedSkills: document.getElementById('oppRelatedSkills'),
  oppDescription: document.getElementById('oppDescription'),

  applications: document.getElementById('applications'),

  journeyForm: document.getElementById('journeyForm'),
  journeyOpportunitySelect: document.getElementById('journeyOpportunitySelect'),
  journeyResult: document.getElementById('journeyResult'),
  careerPathGraph: document.getElementById('careerPathGraph'),
  roleArchitectureGraph: document.getElementById('roleArchitectureGraph'),
  careerDepartmentSelect: document.getElementById('careerDepartmentSelect'),

  teamList: document.getElementById('teamList'),

  skillsLibraryList: document.getElementById('skillsLibraryList'),
  skillRequestsList: document.getElementById('skillRequestsList'),
  skillsLibraryForm: document.getElementById('skillsLibraryForm'),
  librarySkillName: document.getElementById('librarySkillName'),
  librarySkillCategory: document.getElementById('librarySkillCategory'),

  jobProfilesList: document.getElementById('jobProfilesList'),
  jobProfileForm: document.getElementById('jobProfileForm'),
  jobProfileTitle: document.getElementById('jobProfileTitle'),
  jobProfileDepartment: document.getElementById('jobProfileDepartment'),
  jobProfileSkillSelect: document.getElementById('jobProfileSkillSelect'),
  jobProfileSkillMinProficiency: document.getElementById('jobProfileSkillMinProficiency'),
  jobProfileSkillWeight: document.getElementById('jobProfileSkillWeight'),
  addJobProfileSkillBtn: document.getElementById('addJobProfileSkillBtn'),
  jobProfileSkillDraftList: document.getElementById('jobProfileSkillDraftList'),
  jobProfileRequiredSkills: document.getElementById('jobProfileRequiredSkills'),
  careerPathsList: document.getElementById('careerPathsList'),
  careerPathForm: document.getElementById('careerPathForm'),
  careerPathDepartment: document.getElementById('careerPathDepartment'),
  careerPathSequence: document.getElementById('careerPathSequence'),

  analyticsCards: document.getElementById('analyticsCards'),
  opportunityMix: document.getElementById('opportunityMix'),
  exportLink: document.getElementById('exportLink'),

  policyList: document.getElementById('policyList'),
  policyForm: document.getElementById('policyForm'),
  policyName: document.getElementById('policyName'),
  policyDepartment: document.getElementById('policyDepartment'),
  policyType: document.getElementById('policyType'),
  policyStages: document.getElementById('policyStages')
};

const state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  currentUser: null,
  employees: [],
  selectedEmployeeId: null,
  opportunities: [],
  opportunityTypes: [],
  applications: [],
  policies: [],
  careerPaths: [],
  skills: [],
  skillRequests: [],
  jobProfiles: [],
  jobProfileDraftSkills: [],
  analytics: null,
  demoUsers: []
};

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error((body && body.error) || 'Request failed');
  }

  return body;
}

function toast(message, isError = false) {
  const node = document.createElement('div');
  node.className = `toast${isError ? ' error' : ''}`;
  node.textContent = message;
  els.toastRoot.appendChild(node);
  setTimeout(() => node.remove(), 4000);
}

function roleBadge(role) {
  const cls = role === 'employee' ? 'role-employee' : role === 'manager' ? 'role-manager' : 'role-hr';
  return `<span class="role-badge ${cls}">${role.toUpperCase()}</span>`;
}

function statusClass(status = '') {
  return `status-${String(status).toLowerCase().replaceAll(' ', '-')}`;
}

function typeClass(type = '') {
  return `type-${String(type).toLowerCase()}`;
}

function renderLevel(level = 1) {
  return `<div class="level">${Array.from({ length: 5 }).map((_, i) => `<span class="dot ${i < level ? 'active' : ''}"></span>`).join('')}</div>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function drawJourneyGraph(journey) {
  const roles = Array.isArray(journey.pathProgression) && journey.pathProgression.length
    ? journey.pathProgression
    : [journey.employee.role, journey.targetOpportunity.title];
  const spacing = 190;
  const startX = 80;
  const y = 110;
  const width = Math.max(640, startX * 2 + (roles.length - 1) * spacing);
  const readiness = Math.max(0, Math.min(100, Number(journey.readinessScore || 0)));

  let lines = '';
  for (let i = 0; i < roles.length - 1; i += 1) {
    const x1 = startX + i * spacing;
    const x2 = startX + (i + 1) * spacing;
    lines += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#d7d4d0" stroke-width="3" />`;
  }

  const nodes = roles
    .map((role, i) => {
      const x = startX + i * spacing;
      const isCurrent = i === 0;
      const isTarget = i === roles.length - 1;
      const fill = isTarget ? '#ef6b51' : isCurrent ? '#1a334e' : '#ffffff';
      const stroke = isTarget || isCurrent ? fill : '#d7d4d0';
      const textColor = isTarget || isCurrent ? '#ffffff' : '#14182b';
      return `
        <g>
          <circle cx="${x}" cy="${y}" r="24" fill="${fill}" stroke="${stroke}" stroke-width="2"></circle>
          <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="11" fill="${textColor}" font-weight="700">${i + 1}</text>
          <text x="${x}" y="${y + 48}" text-anchor="middle" font-size="12" fill="#494a52">${escapeXml(role)}</text>
        </g>
      `;
    })
    .join('');

  const ringSize = 82;
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (readiness / 100) * c;

  return `
    <svg class="graph-svg" viewBox="0 0 ${width} 240" role="img" aria-label="Career journey graph">
      <g transform="translate(${width - 130}, 45)">
        <circle cx="${ringSize / 2}" cy="${ringSize / 2}" r="${r}" fill="none" stroke="#ece9e5" stroke-width="8"></circle>
        <circle cx="${ringSize / 2}" cy="${ringSize / 2}" r="${r}" fill="none" stroke="#ef6b51" stroke-width="8"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" transform="rotate(-90 ${ringSize / 2} ${ringSize / 2})"></circle>
        <text x="${ringSize / 2}" y="${ringSize / 2 + 5}" text-anchor="middle" font-size="16" font-weight="800" fill="#14182b">${readiness}%</text>
        <text x="${ringSize / 2}" y="${ringSize + 20}" text-anchor="middle" font-size="11" fill="#494a52">Readiness</text>
      </g>
      ${lines}
      ${nodes}
    </svg>
  `;
}

function drawArchitectureGraph(paths, department, selectedRole, targetLabel) {
  const filtered = department && department !== 'All'
    ? paths.filter((p) => p.department === department)
    : paths;

  if (!filtered.length) {
    return '<p class="muted">No role architecture available for this department.</p>';
  }

  const rowHeight = 95;
  const spacing = 170;
  const startX = 80;
  const width = Math.max(760, startX * 2 + Math.max(...filtered.map((p) => (p.jobSequence.length - 1) * spacing)));
  const height = 90 + filtered.length * rowHeight;

  let svg = `<svg class="graph-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Role architecture graph">`;

  filtered.forEach((path, rowIndex) => {
    const y = 70 + rowIndex * rowHeight;
    svg += `<text x="20" y="${y + 5}" font-size="12" fill="#494a52" font-weight="700">${escapeXml(path.department)}</text>`;

    path.jobSequence.forEach((role, i) => {
      const x = startX + i * spacing;
      if (i < path.jobSequence.length - 1) {
        const x2 = startX + (i + 1) * spacing;
        svg += `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y}" stroke="#ced4db" stroke-width="2.5" />`;
      }

      const isSelected = role === selectedRole;
      const isTarget = targetLabel && targetLabel.includes(role);
      const fill = isTarget ? '#ef6b51' : isSelected ? '#1a334e' : '#ffffff';
      const stroke = isTarget || isSelected ? fill : '#d7d4d0';
      const labelColor = isTarget || isSelected ? '#ffffff' : '#14182b';

      svg += `
        <g>
          <rect x="${x - 58}" y="${y - 21}" width="116" height="42" rx="21" fill="${fill}" stroke="${stroke}" stroke-width="1.5"></rect>
          <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${labelColor}">${escapeXml(role)}</text>
        </g>
      `;
    });
  });

  svg += '</svg>';
  return svg;
}

function updateJobProfileRequiredSkillsField() {
  els.jobProfileRequiredSkills.value = JSON.stringify(state.jobProfileDraftSkills);
}

function renderJobProfileSkillDraft() {
  if (!els.jobProfileSkillDraftList) return;
  if (!state.jobProfileDraftSkills.length) {
    els.jobProfileSkillDraftList.innerHTML = '<article class="item"><p class="muted">No required skills added yet.</p></article>';
    updateJobProfileRequiredSkillsField();
    return;
  }

  els.jobProfileSkillDraftList.innerHTML = state.jobProfileDraftSkills
    .map((skill, index) => {
      const skillName = state.skills.find((s) => s.skillId === skill.skillId)?.skillName || skill.skillId;
      return `
        <article class="item">
          <div class="actions">
            <strong>${skillName}</strong>
            <button class="btn btn-danger" type="button" data-remove-job-skill="${index}">Remove</button>
          </div>
          <p class="muted">Min proficiency: ${skill.minProficiency} · Weight: ${skill.weight}</p>
        </article>
      `;
    })
    .join('');

  updateJobProfileRequiredSkillsField();
}

function showAuthView() {
  els.loginView.classList.remove('hidden');
  els.appView.classList.add('hidden');
}

function showAppView() {
  els.loginView.classList.add('hidden');
  els.appView.classList.remove('hidden');
}

function currentPage() {
  const hash = window.location.hash.replace('#', '').trim();
  return hash || 'dashboard';
}

function setRoute(route) {
  window.location.hash = route;
}

function visibleForRole(page, role) {
  if (['analytics', 'team', 'policies', 'skills', 'roles'].includes(page)) {
    return role === 'manager' || role === 'hr';
  }
  return true;
}

function canEditSelectedEmployee() {
  if (!state.currentUser || !state.selectedEmployeeId) return false;
  return state.currentUser.role === 'hr' || state.currentUser.employeeId === state.selectedEmployeeId;
}

function applyRoleVisibility() {
  const role = state.currentUser?.role;
  const isManagerOrHr = role === 'manager' || role === 'hr';

  document.querySelectorAll('.nav-role').forEach((el) => {
    el.classList.toggle('hidden', !isManagerOrHr);
  });

  els.createOpportunityWrap.classList.toggle('hidden', !isManagerOrHr);

  const policyEditable = role === 'hr';
  Array.from(els.policyForm.elements).forEach((el) => {
    el.disabled = !policyEditable;
  });
  Array.from(els.skillsLibraryForm.elements).forEach((el) => {
    el.disabled = !policyEditable;
  });
  Array.from(els.jobProfileForm.elements).forEach((el) => {
    el.disabled = !policyEditable;
  });
  Array.from(els.careerPathForm.elements).forEach((el) => {
    el.disabled = !policyEditable;
  });

  const canEditProfile = canEditSelectedEmployee();
  Array.from(els.aspirationForm.elements).forEach((el) => {
    el.disabled = !canEditProfile;
  });
  Array.from(els.skillForm.elements).forEach((el) => {
    el.disabled = !canEditProfile;
  });
  Array.from(els.skillRequestForm.elements).forEach((el) => {
    el.disabled = role !== 'employee';
  });
}

function updateSessionInfo() {
  if (!state.currentUser) {
    els.sessionInfo.innerHTML = '';
    return;
  }
  els.sessionInfo.innerHTML = `
    <strong>${state.currentUser.name}</strong>
    ${roleBadge(state.currentUser.role)}
  `;
}

async function loadDemoUsers() {
  state.demoUsers = await api('/api/auth/demo-users', { headers: {} });
  els.demoUsers.innerHTML = state.demoUsers
    .map((u) => `
      <article class="demo-card">
        <strong>${u.name}</strong>
        <span class="muted">${u.userId}</span>
        ${roleBadge(u.role)}
        <button class="btn btn-secondary" type="button" data-quick-login="${u.userId}">Quick Login</button>
      </article>
    `)
    .join('');
}

function setupQuickLogin() {
  els.demoUsers.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-quick-login]');
    if (!button) return;
    els.userId.value = button.getAttribute('data-quick-login');
    els.password.value = 'demo123';
    await handleLogin();
  });
}

async function ensureUser() {
  if (!state.token) return false;
  try {
    state.currentUser = await api('/api/auth/me');
    return true;
  } catch {
    state.token = null;
    state.currentUser = null;
    localStorage.removeItem(TOKEN_KEY);
    return false;
  }
}

async function loadBaseData() {
  state.opportunityTypes = await api('/api/opportunity-types');
  state.employees = await api('/api/employees');
  state.skills = await api('/api/skills');
  state.careerPaths = await api('/api/career-paths');
  state.jobProfiles = await api('/api/job-profiles');
  state.skillRequests = await api('/api/skill-requests');

  if (!state.selectedEmployeeId) {
    if (state.currentUser.role === 'employee') {
      state.selectedEmployeeId = state.currentUser.employeeId;
    } else {
      state.selectedEmployeeId = state.employees[0]?.employeeId || null;
    }
  }

  if (state.currentUser.role === 'employee') {
    els.employeeSelectorWrap.classList.add('hidden');
    state.selectedEmployeeId = state.currentUser.employeeId;
  } else {
    els.employeeSelectorWrap.classList.remove('hidden');
  }

  els.employeeSelect.innerHTML = state.employees
    .map((e) => `<option value="${e.employeeId}">${e.name} - ${e.role}</option>`)
    .join('');
  els.employeeSelect.value = state.selectedEmployeeId || '';

  const typeAll = '<option value="">All opportunity types</option>';
  const typeOptions = state.opportunityTypes.map((t) => `<option value="${t}">${t}</option>`).join('');
  els.typeFilter.innerHTML = typeAll + typeOptions;
  els.oppType.innerHTML = typeOptions;
  els.policyType.innerHTML = '<option value="*">All types (*)</option>' + typeOptions;
  els.skillSelect.innerHTML = state.skills
    .map((s) => `<option value="${s.skillId}">${s.skillName} (${s.category || 'General'})</option>`)
    .join('');
  els.jobProfileSkillSelect.innerHTML = state.skills
    .map((s) => `<option value="${s.skillId}">${s.skillName} (${s.category || 'General'})</option>`)
    .join('');
  renderJobProfileSkillDraft();

  const depts = ['All', ...new Set(state.careerPaths.map((p) => p.department))];
  const current = els.careerDepartmentSelect.value || 'All';
  els.careerDepartmentSelect.innerHTML = depts.map((d) => `<option value="${d}">${d}</option>`).join('');
  els.careerDepartmentSelect.value = depts.includes(current) ? current : 'All';
}

async function renderDashboard() {
  els.welcomeMessage.textContent = `Welcome back, ${state.currentUser.name}.`;

  const role = state.currentUser.role;
  let cards = [];

  if (role === 'employee') {
    const employeeId = encodeURIComponent(state.selectedEmployeeId || state.currentUser.employeeId || '');
    const opportunities = await api(`/api/opportunities?employeeId=${employeeId}`);
    const myApps = state.applications.length;
    const me = state.employees.find((e) => e.employeeId === state.currentUser.employeeId);
    const bookmarks = me?.bookmarks?.length || 0;
    const matches = opportunities.map((o) => o.matchPercent).filter((v) => Number.isFinite(v));
    const avgMatch = matches.length ? Math.round(matches.reduce((a, b) => a + b, 0) / matches.length) : 0;
    cards = [
      ['Your Applications', myApps],
      ['Bookmarked', bookmarks],
      ['Avg Skill Match', `${avgMatch}%`]
    ];
  }

  if (role === 'manager') {
    const teamSize = state.employees.filter((e) => e.managerId === state.currentUser.employeeId).length;
    const openOpps = state.opportunities.length;
    const pending = state.applications.filter((a) => (a.approvals || []).some((s) => s.status === 'Pending')).length;
    cards = [
      ['Team Size', teamSize],
      ['Open Opportunities', openOpps],
      ['Pending Approvals', pending]
    ];
  }

  if (role === 'hr') {
    const stats = state.analytics || {};
    cards = [
      ['Total Employees', stats.totalEmployees || 0],
      ['Total Opportunities', stats.totalOpportunities || 0],
      ['Applications', stats.totalApplications || 0],
      ['Internal Mobility Rate', `${stats.internalMobilityRate || 0}%`]
    ];
  }

  els.dashboardCards.innerHTML = cards
    .map(([label, value]) => `<article class="kpi"><p class="muted">${label}</p><div class="kpi-value">${value}</div></article>`)
    .join('');

  els.dashboardActions.innerHTML = `
    <h2>Quick Actions</h2>
    <div class="actions">
      <button class="btn btn-secondary" data-go="marketplace" type="button">Browse Opportunities</button>
      <button class="btn btn-secondary" data-go="applications" type="button">View Applications</button>
      <button class="btn btn-secondary" data-go="career" type="button">Open Career Journey</button>
    </div>
  `;

  els.dashboardActions.querySelectorAll('[data-go]').forEach((button) => {
    button.addEventListener('click', () => setRoute(button.getAttribute('data-go')));
  });
}

async function renderProfile() {
  if (!state.selectedEmployeeId) return;
  const employee = await api(`/api/employees/${state.selectedEmployeeId}`);

  els.employeeProfile.innerHTML = `
    <h2>${employee.name}</h2>
    <p class="muted">${employee.role} · ${employee.department}</p>
    <p class="muted">${employee.location} · Tenure ${employee.tenureMonths} months</p>
  `;

  els.careerAspirations.value = employee.careerAspirations || '';

  els.skillsGrid.innerHTML = employee.skills.length
    ? employee.skills
        .map((s) => {
          const libSkill = state.skills.find((lib) => lib.skillId === s.skillId);
          const category = libSkill?.category || 'General';
          return `
          <article class="skill-card">
            <strong>${s.skillName}</strong>
            <div class="muted">${category}</div>
            ${renderLevel(Number(s.proficiency || 1))}
            <div class="muted">Endorsements: ${(s.endorsedBy || []).length}</div>
          </article>
        `;
        })
        .join('')
    : '<div class="empty-state">No skills added yet.</div>';
}

function opportunityCard(o) {
  const missing = (o.missingSkills || []).map((s) => `<span class="pill">${s.skillName}</span>`).join('');
  const match = Number.isFinite(o.matchPercent) ? o.matchPercent : 0;

  const employeeActions = state.currentUser.role === 'employee'
    ? `
      <div class="actions">
        <button class="btn btn-secondary" type="button" data-bookmark="${o.opportunityId}">Bookmark</button>
        <button class="btn btn-primary" type="button" data-apply="${o.opportunityId}">Apply</button>
      </div>
    `
    : '';

  return `
    <article class="item">
      <div class="actions">
        <strong>${o.title}</strong>
        <span class="pill ${typeClass(o.type)}">${o.type}</span>
      </div>
      <p class="muted">${o.department} · ${o.duration || 'Flexible'}</p>
      <p>${o.description || ''}</p>
      <div class="progress-wrap">
        <p class="muted">Match ${match}%</p>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, match))}%"></div></div>
      </div>
      <div>${missing || '<span class="muted">No missing skills</span>'}</div>
      ${employeeActions}
    </article>
  `;
}

async function renderMarketplace() {
  const q = encodeURIComponent(els.searchText.value || '');
  const department = encodeURIComponent(els.departmentFilter.value || '');
  const type = encodeURIComponent(els.typeFilter.value || '');
  const employeeId = encodeURIComponent(state.selectedEmployeeId || '');

  state.opportunities = await api(`/api/opportunities?q=${q}&department=${department}&type=${type}&employeeId=${employeeId}`);

  els.opportunities.innerHTML = state.opportunities.length
    ? state.opportunities.map(opportunityCard).join('')
    : `<article class="card empty-state"><p>No opportunities found. Try a broader filter.</p></article>`;

  const journeyCandidates = state.opportunities.filter((o) => o.type !== 'Learning');
  els.journeyOpportunitySelect.innerHTML = journeyCandidates
    .map((o) => `<option value="${o.opportunityId}">${o.title} (${o.type})</option>`)
    .join('');

  els.opportunities.querySelectorAll('[data-bookmark]').forEach((btn) => {
    btn.addEventListener('click', () => bookmarkOpportunity(btn.getAttribute('data-bookmark')));
  });

  els.opportunities.querySelectorAll('[data-apply]').forEach((btn) => {
    btn.addEventListener('click', () => applyOpportunity(btn.getAttribute('data-apply')));
  });
}

function renderApprovalSteps(approvals = []) {
  if (!approvals.length) {
    return '<div class="muted">No approval stages required.</div>';
  }

  return `<div class="approval-steps">${approvals
    .map((s) => {
      const cls = s.status === 'Approved' ? 'approved' : s.status === 'Rejected' ? 'rejected' : 'pending';
      return `<div class="step ${cls}">${s.stageId} · ${s.approverType} · ${s.status}</div>`;
    })
    .join('')}</div>`;
}

async function renderApplications() {
  state.applications = await api('/api/applications');

  els.applications.innerHTML = state.applications.length
    ? state.applications
        .map((app) => {
          const canDecide = (state.currentUser.role === 'manager' || state.currentUser.role === 'hr') &&
            (app.approvals || []).some((s) => s.status === 'Pending');
          return `
            <article class="item">
              <div class="actions">
                <strong>${app.opportunity?.title || app.opportunityId}</strong>
                <span class="status-badge ${statusClass(app.status)}">${app.status}</span>
              </div>
              <p class="muted">Applicant: ${app.employee?.name || app.employeeId}</p>
              ${renderApprovalSteps(app.approvals || [])}
              <p class="muted">Updated: ${new Date(app.updatedAt).toLocaleString()}</p>
              ${canDecide ? `
                <div class="actions">
                  <button class="btn btn-primary" type="button" data-approve="${app.applicationId}">Approve Stage</button>
                  <button class="btn btn-danger" type="button" data-reject="${app.applicationId}">Reject Stage</button>
                </div>
              ` : ''}
            </article>
          `;
        })
        .join('')
    : '<article class="card empty-state"><p>No applications yet. Browse the marketplace to find your next opportunity.</p></article>';

  els.applications.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', () => decideApproval(btn.getAttribute('data-approve'), 'Approved'));
  });
  els.applications.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', () => decideApproval(btn.getAttribute('data-reject'), 'Rejected'));
  });
}

async function renderCareerJourney() {
  const targetOpportunityId = els.journeyOpportunitySelect.value;
  const selectedEmployee = state.employees.find((e) => e.employeeId === state.selectedEmployeeId);
  const department = els.careerDepartmentSelect.value || selectedEmployee?.department || 'All';

  if (!targetOpportunityId || !state.selectedEmployeeId) {
    els.journeyResult.innerHTML = '<p class="muted">Select a target opportunity to generate your roadmap.</p>';
    els.careerPathGraph.innerHTML = '<p class="muted">Career graph will appear after you choose a target opportunity.</p>';
    els.roleArchitectureGraph.innerHTML = drawArchitectureGraph(
      state.careerPaths,
      department,
      selectedEmployee?.role,
      ''
    );
    return;
  }

  const journey = await api(`/api/career-journey?employeeId=${state.selectedEmployeeId}&targetOpportunityId=${targetOpportunityId}`);
  els.careerPathGraph.innerHTML = drawJourneyGraph(journey);
  els.roleArchitectureGraph.innerHTML = drawArchitectureGraph(
    state.careerPaths,
    department,
    journey.employee.role,
    journey.targetOpportunity.title
  );

  els.journeyResult.innerHTML = `
    <h2>${journey.targetOpportunity.title}</h2>
    <p><strong>Readiness:</strong> ${journey.readinessScore}%</p>

    <h3>Path Progression</h3>
    <div class="path-row">${(journey.pathProgression || []).map((node) => `<span class="path-node">${node}</span>`).join('')}</div>

    <h3>Skill Gap Roadmap</h3>
    <div class="timeline">
      ${(journey.roadmap || []).map((step) => `
        <article class="timeline-item">
          <strong>Step ${step.step}: ${step.skillName}</strong>
          <p class="muted">Current ${step.currentLevel} → Target ${step.targetLevel}</p>
          <p>${step.action}</p>
        </article>
      `).join('') || '<p class="muted">No roadmap steps required.</p>'}
    </div>

    <h3>Learning Recommendations</h3>
    <div class="card-list">
      ${(journey.learningRecommendations || []).map((l) => `
        <article class="item">
          <strong>${l.title}</strong>
          <p>${l.description || ''}</p>
        </article>
      `).join('') || '<p class="muted">No recommendations available.</p>'}
    </div>
  `;
}

function renderTeam() {
  if (state.currentUser.role !== 'manager' && state.currentUser.role !== 'hr') {
    els.teamList.innerHTML = '<article class="card empty-state"><p>Team page unavailable for this role.</p></article>';
    return;
  }

  const team = state.currentUser.role === 'manager'
    ? state.employees.filter((e) => e.managerId === state.currentUser.employeeId)
    : state.employees;

  els.teamList.innerHTML = team.length
    ? team
        .map((member) => `
          <article class="item">
            <strong>${member.name}</strong>
            <p class="muted">${member.role} · ${member.department}</p>
            <p class="muted">${member.location}</p>
          </article>
        `)
        .join('')
    : '<article class="card empty-state"><p>No team members found.</p></article>';
}

async function renderAnalytics() {
  if (state.currentUser.role !== 'manager' && state.currentUser.role !== 'hr') {
    els.analyticsCards.innerHTML = '';
    els.opportunityMix.innerHTML = '<p class="muted">Analytics unavailable for this role.</p>';
    return;
  }

  state.analytics = await api('/api/analytics');

  const stats = state.analytics;
  const kpis = [
    ['Total Employees', stats.totalEmployees],
    ['Total Opportunities', stats.totalOpportunities],
    ['Applications', stats.totalApplications],
    ['Mobility Rate', `${stats.internalMobilityRate}%`],
    ['Fill Rate', `${stats.internalFillRate}%`],
    ['Avg Tenure', `${stats.avgTimeInRoleMonths} mo`],
    ['Skills Coverage', stats.skillsInventoryCoveragePerEmployee]
  ];

  els.analyticsCards.innerHTML = kpis
    .map(([label, value]) => `<article class="kpi"><p class="muted">${label}</p><div class="kpi-value">${value}</div></article>`)
    .join('');

  const mixEntries = Object.entries(stats.opportunitiesByType || {});
  const total = mixEntries.reduce((sum, [, count]) => sum + Number(count || 0), 0);

  els.opportunityMix.innerHTML = mixEntries.length
    ? mixEntries
        .map(([type, count]) => {
          const pct = total ? Math.round((count / total) * 100) : 0;
          return `
            <div class="mix-row">
              <span>${type}</span>
              <div class="mix-bar"><div class="mix-fill" style="width:${pct}%"></div></div>
              <span>${count}</span>
            </div>
          `;
        })
        .join('')
    : '<p class="muted">No opportunity mix data.</p>';
}

async function renderPolicies() {
  if (state.currentUser.role !== 'manager' && state.currentUser.role !== 'hr') {
    els.policyList.innerHTML = '<article class="card empty-state"><p>Policies unavailable for this role.</p></article>';
    return;
  }

  state.policies = await api('/api/approval-policies');
  els.policyList.innerHTML = state.policies.length
    ? state.policies
        .map((policy) => `
          <article class="item">
            <strong>${policy.name}</strong>
            <p class="muted">Department: ${policy.department} · Type: ${policy.opportunityType}</p>
            <p>Stages: ${(policy.stages || []).map((s) => s.stageId).join(', ') || 'None'}</p>
          </article>
        `)
        .join('')
    : '<article class="card empty-state"><p>No approval policies configured.</p></article>';
}

async function renderSkillsLibrary() {
  if (state.currentUser.role !== 'manager' && state.currentUser.role !== 'hr') {
    els.skillsLibraryList.innerHTML = '<article class="card empty-state"><p>Skills library unavailable for this role.</p></article>';
    els.skillRequestsList.innerHTML = '';
    return;
  }

  els.skillsLibraryList.innerHTML = state.skills.length
    ? state.skills
        .map((skill) => `
          <article class="item">
            <strong>${skill.skillName}</strong>
            <p class="muted">${skill.category || 'General'}</p>
            <p class="muted">ID: ${skill.skillId}</p>
          </article>
        `)
        .join('')
    : '<article class="card empty-state"><p>No skills in repository yet.</p></article>';

  els.skillRequestsList.innerHTML = state.skillRequests.length
    ? state.skillRequests
        .map((req) => `
          <article class="item">
            <div class="actions">
              <strong>${req.skillName}</strong>
              <span class="status-badge ${statusClass(req.status)}">${req.status}</span>
            </div>
            <p class="muted">Requested by: ${req.employee?.name || req.employeeId}</p>
            <p class="muted">Category: ${req.category || 'General'}</p>
            <p>${req.reason || 'No reason provided.'}</p>
            ${state.currentUser.role === 'hr' && req.status === 'Pending' ? `
              <div class="actions">
                <button class="btn btn-primary" type="button" data-skillreq-approve="${req.requestId}">Approve</button>
                <button class="btn btn-danger" type="button" data-skillreq-reject="${req.requestId}">Reject</button>
              </div>
            ` : ''}
          </article>
        `)
        .join('')
    : '<article class="card empty-state"><p>No skill requests.</p></article>';

  els.skillRequestsList.querySelectorAll('[data-skillreq-approve]').forEach((btn) => {
    btn.addEventListener('click', () => reviewSkillRequest(btn.getAttribute('data-skillreq-approve'), 'Approved'));
  });
  els.skillRequestsList.querySelectorAll('[data-skillreq-reject]').forEach((btn) => {
    btn.addEventListener('click', () => reviewSkillRequest(btn.getAttribute('data-skillreq-reject'), 'Rejected'));
  });
}

async function renderRoleDesign() {
  if (state.currentUser.role !== 'manager' && state.currentUser.role !== 'hr') {
    els.jobProfilesList.innerHTML = '<article class="card empty-state"><p>Role design unavailable for this role.</p></article>';
    els.careerPathsList.innerHTML = '';
    return;
  }

  els.jobProfilesList.innerHTML = state.jobProfiles.length
    ? state.jobProfiles
        .map((profile) => `
          <article class="item">
            <strong>${profile.title}</strong>
            <p class="muted">${profile.department} · ${profile.jobId}</p>
            <p>Required Skills: ${(profile.requiredSkillsDetailed || [])
              .map((s) => `${s.skillName} (L${s.minProficiency}, w${s.weight})`)
              .join(', ') || 'None'}</p>
          </article>
        `)
        .join('')
    : '<article class="card empty-state"><p>No job profiles configured.</p></article>';

  els.careerPathsList.innerHTML = state.careerPaths.length
    ? state.careerPaths
        .map((path) => `
          <article class="item">
            <strong>${path.department}</strong>
            <p>${(path.jobSequence || []).join(' -> ')}</p>
            <p class="muted">Path ID: ${path.pathId}</p>
          </article>
        `)
        .join('')
    : '<article class="card empty-state"><p>No career paths configured.</p></article>';
}

async function applyOpportunity(opportunityId) {
  try {
    await api('/api/applications', {
      method: 'POST',
      body: JSON.stringify({ opportunityId })
    });
    toast('Application submitted.');
    await refreshData();
    await renderByRoute();
  } catch (error) {
    toast(error.message, true);
  }
}

async function bookmarkOpportunity(opportunityId) {
  try {
    await api(`/api/opportunities/${opportunityId}/bookmark`, { method: 'POST' });
    toast('Opportunity bookmarked.');
    await refreshData();
  } catch (error) {
    toast(error.message, true);
  }
}

async function decideApproval(applicationId, decision) {
  try {
    await api(`/api/applications/${applicationId}/approvals`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes: `${decision} via UI` })
    });
    toast(`Stage ${decision.toLowerCase()}.`);
    await refreshData();
    await renderApplications();
    await renderDashboard();
  } catch (error) {
    toast(error.message, true);
  }
}

async function reviewSkillRequest(requestId, status) {
  try {
    await api(`/api/skill-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNotes: `${status} from HR dashboard` })
    });
    toast(`Skill request ${status.toLowerCase()}.`);
    await refreshData();
    await renderSkillsLibrary();
  } catch (error) {
    toast(error.message, true);
  }
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 768) els.sidebar.classList.remove('open');
}

function updateRouteUI() {
  const page = currentPage();
  const fallback = visibleForRole(page, state.currentUser?.role) ? page : 'dashboard';

  if (fallback !== page) {
    setRoute(fallback);
    return;
  }

  els.pages.forEach((section) => {
    section.classList.toggle('hidden', section.getAttribute('data-page-view') !== fallback);
  });

  els.navLinks.forEach((link) => {
    const active = link.getAttribute('data-page') === fallback;
    link.classList.toggle('active', active);
    link.setAttribute('aria-current', active ? 'page' : 'false');
  });

  closeSidebarOnMobile();
}

async function renderByRoute() {
  updateRouteUI();
  const page = currentPage();

  if (page === 'dashboard') await renderDashboard();
  if (page === 'profile') await renderProfile();
  if (page === 'marketplace') await renderMarketplace();
  if (page === 'applications') await renderApplications();
  if (page === 'career') await renderCareerJourney();
  if (page === 'skills') await renderSkillsLibrary();
  if (page === 'roles') await renderRoleDesign();
  if (page === 'team') renderTeam();
  if (page === 'analytics') await renderAnalytics();
  if (page === 'policies') await renderPolicies();
}

async function refreshData() {
  await loadBaseData();
  state.applications = await api('/api/applications');
  if (state.currentUser.role === 'manager' || state.currentUser.role === 'hr') {
    state.analytics = await api('/api/analytics');
  }
}

async function handleLogin() {
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId: els.userId.value, password: els.password.value })
    });

    state.token = result.token;
    state.currentUser = result.user;
    localStorage.setItem(TOKEN_KEY, state.token);

    showAppView();
    updateSessionInfo();
    applyRoleVisibility();

    await refreshData();
    if (!window.location.hash) setRoute('dashboard');
    await renderByRoute();
    toast('Login successful.');
  } catch (error) {
    toast(error.message, true);
  }
}

async function handleLogout() {
  try {
    if (state.token) {
      await api('/api/auth/logout', { method: 'POST' });
    }
  } catch {
    // ignore
  }

  state.token = null;
  state.currentUser = null;
  state.selectedEmployeeId = null;
  localStorage.removeItem(TOKEN_KEY);
  showAuthView();
  toast('Logged out.');
}

function bindEvents() {
  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin();
  });

  els.logoutBtn.addEventListener('click', handleLogout);
  els.menuToggle.addEventListener('click', () => els.sidebar.classList.toggle('open'));

  els.employeeSelect.addEventListener('change', async (e) => {
    state.selectedEmployeeId = e.target.value;
    applyRoleVisibility();
    await renderProfile();
    await renderMarketplace();
    if (currentPage() === 'career') await renderCareerJourney();
    if (currentPage() === 'dashboard') await renderDashboard();
  });

  els.careerDepartmentSelect.addEventListener('change', async () => {
    if (currentPage() === 'career') {
      await renderCareerJourney();
    }
  });

  els.aspirationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`/api/employees/${state.selectedEmployeeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ careerAspirations: els.careerAspirations.value })
      });
      toast('Career aspirations updated.');
      await renderProfile();
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.skillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`/api/employees/${state.selectedEmployeeId}/skills`, {
        method: 'POST',
        body: JSON.stringify({
          skillId: els.skillSelect.value,
          proficiency: Number(els.skillLevel.value)
        })
      });
      els.skillForm.reset();
      toast('Skill saved.');
      await renderProfile();
      await renderMarketplace();
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.skillRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/skill-requests', {
        method: 'POST',
        body: JSON.stringify({
          skillName: els.requestedSkillName.value,
          category: els.requestedSkillCategory.value || 'General',
          reason: els.requestedSkillReason.value
        })
      });
      els.skillRequestForm.reset();
      toast('Skill request submitted.');
      await refreshData();
      if (currentPage() === 'skills') await renderSkillsLibrary();
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await renderMarketplace();
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.opportunityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const relatedSkillIds = els.oppRelatedSkills.value.split(',').map((s) => s.trim()).filter(Boolean);

      await api('/api/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          title: els.oppTitle.value,
          type: els.oppType.value,
          jobId: els.oppJobId.value || null,
          department: els.oppDepartment.value,
          duration: els.oppDuration.value,
          description: els.oppDescription.value,
          relatedSkillIds
        })
      });

      els.opportunityForm.reset();
      toast('Opportunity created.');
      await refreshData();
      await renderMarketplace();
      if (currentPage() === 'analytics') await renderAnalytics();
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.journeyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await renderCareerJourney();
      toast('Career roadmap generated.');
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.policyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const stages = JSON.parse(els.policyStages.value);
      await api('/api/approval-policies', {
        method: 'POST',
        body: JSON.stringify({
          name: els.policyName.value,
          department: els.policyDepartment.value,
          opportunityType: els.policyType.value,
          stages
        })
      });
      toast('Policy created.');
      els.policyForm.reset();
      els.policyDepartment.value = '*';
      await renderPolicies();
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.skillsLibraryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/skills', {
        method: 'POST',
        body: JSON.stringify({
          skillName: els.librarySkillName.value,
          category: els.librarySkillCategory.value || 'General'
        })
      });
      els.skillsLibraryForm.reset();
      els.librarySkillCategory.value = 'General';
      toast('Skill added to repository.');
      await refreshData();
      if (currentPage() === 'skills') await renderSkillsLibrary();
      await renderProfile();
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.jobProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      if (!state.jobProfileDraftSkills.length) {
        throw new Error('Add at least one required skill to the job profile.');
      }
      await api('/api/job-profiles', {
        method: 'POST',
        body: JSON.stringify({
          title: els.jobProfileTitle.value,
          department: els.jobProfileDepartment.value,
          requiredSkills: state.jobProfileDraftSkills
        })
      });
      els.jobProfileForm.reset();
      state.jobProfileDraftSkills = [];
      renderJobProfileSkillDraft();
      els.jobProfileSkillMinProficiency.value = '3';
      els.jobProfileSkillWeight.value = '0.5';
      toast('Job profile created.');
      await refreshData();
      if (currentPage() === 'roles') await renderRoleDesign();
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.addJobProfileSkillBtn.addEventListener('click', () => {
    try {
      const skillId = els.jobProfileSkillSelect.value;
      const minProficiency = Number(els.jobProfileSkillMinProficiency.value);
      const weight = Number(els.jobProfileSkillWeight.value);

      if (!skillId) {
        throw new Error('Choose a skill from the library.');
      }
      if (!Number.isInteger(minProficiency) || minProficiency < 1 || minProficiency > 5) {
        throw new Error('Minimum proficiency must be an integer from 1 to 5.');
      }
      if (!Number.isFinite(weight) || weight <= 0 || weight > 1) {
        throw new Error('Weight must be a number between 0 and 1.');
      }
      if (state.jobProfileDraftSkills.some((item) => item.skillId === skillId)) {
        throw new Error('This skill is already added to the job profile.');
      }

      state.jobProfileDraftSkills.push({ skillId, minProficiency, weight });
      renderJobProfileSkillDraft();
      toast('Required skill added to job profile draft.');
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.jobProfileSkillDraftList.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-job-skill]');
    if (!removeButton) return;
    const index = Number(removeButton.getAttribute('data-remove-job-skill'));
    if (!Number.isInteger(index)) return;
    state.jobProfileDraftSkills.splice(index, 1);
    renderJobProfileSkillDraft();
  });

  els.careerPathForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const sequence = els.careerPathSequence.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api('/api/career-paths', {
        method: 'POST',
        body: JSON.stringify({
          department: els.careerPathDepartment.value,
          jobSequence: sequence
        })
      });
      els.careerPathForm.reset();
      toast('Career path created.');
      await refreshData();
      if (currentPage() === 'roles') await renderRoleDesign();
      if (currentPage() === 'career') await renderCareerJourney();
    } catch (error) {
      toast(error.message, true);
    }
  });

  els.exportLink.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/analytics/export.csv', {
        headers: { Authorization: `Bearer ${state.token}` }
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'applications.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('CSV export downloaded.');
    } catch (error) {
      toast(error.message, true);
    }
  });

  window.addEventListener('hashchange', () => {
    if (state.currentUser) {
      renderByRoute().catch((e) => toast(e.message, true));
    }
  });

  els.navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) els.sidebar.classList.remove('open');
    });
  });

  setupQuickLogin();

  window.applyOpportunity = applyOpportunity;
  window.bookmarkOpportunity = bookmarkOpportunity;
  window.decideApproval = decideApproval;
}

async function bootstrap() {
  bindEvents();
  await loadDemoUsers();

  const ok = await ensureUser();
  if (!ok) {
    showAuthView();
    return;
  }

  showAppView();
  updateSessionInfo();
  applyRoleVisibility();

  try {
    await refreshData();
    if (!window.location.hash) setRoute('dashboard');
    await renderByRoute();
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  } catch (error) {
    toast(error.message, true);
  }
}

bootstrap();
