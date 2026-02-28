const employeeSelect = document.getElementById('employeeSelect');
const employeeProfile = document.getElementById('employeeProfile');
const opportunitiesEl = document.getElementById('opportunities');
const applicationsEl = document.getElementById('applications');
const analyticsEl = document.getElementById('analytics');
const messageEl = document.getElementById('message');
const sessionInfoEl = document.getElementById('sessionInfo');
const demoUsersEl = document.getElementById('demoUsers');
const journeyResultEl = document.getElementById('journeyResult');
const policyListEl = document.getElementById('policyList');

const aspirationForm = document.getElementById('aspirationForm');
const skillForm = document.getElementById('skillForm');
const searchForm = document.getElementById('searchForm');
const opportunityForm = document.getElementById('opportunityForm');
const policyForm = document.getElementById('policyForm');
const journeyForm = document.getElementById('journeyForm');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const exportLink = document.getElementById('exportLink');

const employeePanel = document.getElementById('employeePanel');
const managerPanel = document.getElementById('managerPanel');
const analyticsPanel = document.getElementById('analyticsPanel');
const policyPanel = document.getElementById('policyPanel');
const journeyPanel = document.getElementById('journeyPanel');

const typeFilter = document.getElementById('typeFilter');
const oppType = document.getElementById('oppType');
const policyType = document.getElementById('policyType');
const journeyOpportunitySelect = document.getElementById('journeyOpportunitySelect');

const TOKEN_KEY = 'itm_auth_token';

let state = {
  employees: [],
  opportunities: [],
  opportunityTypes: [],
  selectedEmployeeId: null,
  token: localStorage.getItem(TOKEN_KEY) || null,
  currentUser: null
};

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorText = 'Request failed';
    try {
      const body = await response.json();
      errorText = body.error || errorText;
    } catch {
      // ignore
    }
    throw new Error(errorText);
  }

  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? '#b91c1c' : '#1b5e20';
}

function skillPills(skills = []) {
  return skills
    .map((skill) => `<span class="pill">${skill.skillName} (L${skill.proficiency})</span>`)
    .join('');
}

function canEditSelectedEmployee() {
  if (!state.currentUser || !state.selectedEmployeeId) return false;
  return state.currentUser.role === 'hr' || state.currentUser.employeeId === state.selectedEmployeeId;
}

function isManagerOrHr() {
  return ['manager', 'hr'].includes(state.currentUser?.role);
}

function populateTypeSelects() {
  const options = ['<option value="">All opportunity types</option>']
    .concat(state.opportunityTypes.map((type) => `<option value="${type}">${type}</option>`))
    .join('');
  typeFilter.innerHTML = options;

  const createOptions = state.opportunityTypes.map((type) => `<option value="${type}">${type}</option>`).join('');
  oppType.innerHTML = createOptions;

  const policyOptions = ['<option value="*">All types (*)</option>']
    .concat(state.opportunityTypes.map((type) => `<option value="${type}">${type}</option>`))
    .join('');
  policyType.innerHTML = policyOptions;
}

function updateVisibility() {
  const isLoggedIn = Boolean(state.currentUser);
  if (!isLoggedIn) {
    employeePanel.classList.add('hidden');
    managerPanel.classList.add('hidden');
    analyticsPanel.classList.add('hidden');
    policyPanel.classList.add('hidden');
    journeyPanel.classList.add('hidden');
    return;
  }

  employeePanel.classList.remove('hidden');
  journeyPanel.classList.remove('hidden');

  if (isManagerOrHr()) {
    managerPanel.classList.remove('hidden');
    analyticsPanel.classList.remove('hidden');
    policyPanel.classList.remove('hidden');
  } else {
    managerPanel.classList.add('hidden');
    analyticsPanel.classList.add('hidden');
    policyPanel.classList.add('hidden');
  }

  const editable = canEditSelectedEmployee();
  Array.from(aspirationForm.elements).forEach((el) => {
    el.disabled = !editable;
  });
  Array.from(skillForm.elements).forEach((el) => {
    el.disabled = !editable;
  });

  const policyEditable = state.currentUser.role === 'hr';
  Array.from(policyForm.elements).forEach((el) => {
    el.disabled = !policyEditable;
  });
}

function renderSession() {
  if (!state.currentUser) {
    sessionInfoEl.innerHTML = '<p>Not logged in.</p>';
    return;
  }

  sessionInfoEl.innerHTML = `
    <p><strong>User:</strong> ${state.currentUser.name}</p>
    <p><strong>Role:</strong> ${state.currentUser.role}</p>
    <p><strong>User ID:</strong> <span class="code">${state.currentUser.userId}</span></p>
  `;
}

async function loadDemoUsers() {
  const users = await api('/api/auth/demo-users', { headers: {} });
  demoUsersEl.innerHTML = `
    <p><strong>Demo Accounts (password: <span class="code">demo123</span>)</strong></p>
    ${users.map((user) => `<p><span class="code">${user.userId}</span> - ${user.name} (${user.role})</p>`).join('')}
  `;
}

async function loadOpportunityTypes() {
  if (!state.currentUser) return;
  state.opportunityTypes = await api('/api/opportunity-types');
  populateTypeSelects();
}

async function loadEmployees() {
  state.employees = await api('/api/employees');
  employeeSelect.innerHTML = state.employees
    .map((employee) => `<option value="${employee.employeeId}">${employee.name} - ${employee.role}</option>`)
    .join('');

  if (!state.selectedEmployeeId) {
    if (state.currentUser?.role === 'employee') {
      state.selectedEmployeeId = state.currentUser.employeeId;
    } else if (state.employees.length > 0) {
      state.selectedEmployeeId = state.employees[0].employeeId;
    }
  }

  if (state.currentUser?.role === 'employee') {
    employeeSelect.disabled = true;
    state.selectedEmployeeId = state.currentUser.employeeId;
  } else {
    employeeSelect.disabled = false;
  }

  employeeSelect.value = state.selectedEmployeeId;
}

async function loadEmployeeProfile() {
  if (!state.selectedEmployeeId) {
    employeeProfile.innerHTML = '<p>No employee selected.</p>';
    return;
  }

  const employee = await api(`/api/employees/${state.selectedEmployeeId}`);

  employeeProfile.innerHTML = `
    <p><strong>${employee.name}</strong> · ${employee.role} (${employee.department})</p>
    <p>Location: ${employee.location} · Tenure: ${employee.tenureMonths} months</p>
    <p><strong>Career aspiration:</strong> ${employee.careerAspirations || 'Not provided yet.'}</p>
    <p><strong>Skills:</strong> ${skillPills(employee.skills)}</p>
  `;

  document.getElementById('careerAspirations').value = employee.careerAspirations || '';
}

function renderOpportunity(opp) {
  const missing = (opp.missingSkills || [])
    .map((skill) => `${skill.skillName} (need L${skill.requiredLevel}, current L${skill.currentLevel})`)
    .join(', ');

  const actionButtons = state.currentUser?.role === 'employee'
    ? `
      <div class="actions">
        <button onclick="bookmarkOpportunity('${opp.opportunityId}')">Bookmark</button>
        <button onclick="applyOpportunity('${opp.opportunityId}')">Apply</button>
      </div>
    `
    : '';

  return `
    <div class="item">
      <h4>${opp.title}</h4>
      <p>${opp.department} · ${opp.type} · ${opp.duration}</p>
      <p>${opp.description || ''}</p>
      <p><strong>Match:</strong> ${opp.matchPercent ?? '-'}%</p>
      <p><strong>Gap:</strong> ${missing || 'None'}</p>
      ${actionButtons}
    </div>
  `;
}

function renderApprovalStages(stages = []) {
  if (!stages.length) return '<p><strong>Approvals:</strong> None required</p>';
  return `
    <p><strong>Approvals:</strong></p>
    ${stages
      .map(
        (stage) =>
          `<p><span class="pill">${stage.stageId}</span> ${stage.approverType} - <strong>${stage.status}</strong></p>`
      )
      .join('')}
  `;
}

function renderApplicationActions(item) {
  if (!isManagerOrHr()) return '';
  const pending = (item.approvals || []).find((stage) => stage.status === 'Pending');
  if (!pending) return '';

  return `
    <div class="actions">
      <button onclick="decideApproval('${item.applicationId}', 'Approved')">Approve Stage</button>
      <button class="secondary" onclick="decideApproval('${item.applicationId}', 'Rejected')">Reject Stage</button>
    </div>
  `;
}

async function loadOpportunities() {
  if (!state.selectedEmployeeId) return;
  const q = encodeURIComponent(document.getElementById('searchText').value || '');
  const department = encodeURIComponent(document.getElementById('departmentFilter').value || '');
  const type = encodeURIComponent(typeFilter.value || '');
  const opportunities = await api(
    `/api/opportunities?employeeId=${state.selectedEmployeeId}&q=${q}&department=${department}&type=${type}`
  );

  state.opportunities = opportunities;

  opportunitiesEl.innerHTML = opportunities.map(renderOpportunity).join('') || '<p>No opportunities found.</p>';

  journeyOpportunitySelect.innerHTML = opportunities
    .filter((opp) => ['Role', 'Project', 'Mentorship', 'Stretch'].includes(opp.type))
    .map((opp) => `<option value="${opp.opportunityId}">${opp.title} (${opp.type})</option>`)
    .join('');
}

async function loadApplications() {
  const applications = await api('/api/applications');

  if (!applications.length) {
    applicationsEl.innerHTML = '<p>No applications yet.</p>';
    return;
  }

  applicationsEl.innerHTML = applications
    .map((item) => {
      const employeeName = item.employee?.name ? ` · Applicant: ${item.employee.name}` : '';
      return `
        <div class="item">
          <h4>${item.opportunity?.title || item.opportunityId}${employeeName}</h4>
          <p>Status: <strong>${item.status}</strong></p>
          <p>Policy: ${item.approvalPolicyId || 'N/A'}</p>
          ${renderApprovalStages(item.approvals || [])}
          <p>Last updated: ${new Date(item.updatedAt).toLocaleString()}</p>
          ${renderApplicationActions(item)}
        </div>
      `;
    })
    .join('');
}

async function loadPolicies() {
  if (!isManagerOrHr()) {
    policyListEl.innerHTML = '<p>Policy access unavailable.</p>';
    return;
  }

  const policies = await api('/api/approval-policies');
  policyListEl.innerHTML = policies.length
    ? policies
        .map(
          (policy) => `
          <div class="item">
            <h4>${policy.name}</h4>
            <p>Department: ${policy.department} · Type: ${policy.opportunityType}</p>
            <p>Stages: ${(policy.stages || []).map((stage) => stage.stageId).join(', ') || 'None'}</p>
          </div>
        `
        )
        .join('')
    : '<p>No approval policies configured.</p>';
}

async function loadAnalytics() {
  if (!isManagerOrHr()) {
    analyticsEl.innerHTML = '<p>Analytics unavailable for this role.</p>';
    return;
  }

  const stats = await api('/api/analytics');

  const byType = Object.entries(stats.opportunitiesByType || {})
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  analyticsEl.innerHTML = `
    <p>Total employees: <strong>${stats.totalEmployees}</strong></p>
    <p>Total opportunities: <strong>${stats.totalOpportunities}</strong></p>
    <p>Opportunity mix: <strong>${byType || 'N/A'}</strong></p>
    <p>Total applications: <strong>${stats.totalApplications}</strong></p>
    <p>Internal mobility rate: <strong>${stats.internalMobilityRate}%</strong></p>
    <p>Internal fill rate: <strong>${stats.internalFillRate}%</strong></p>
    <p>Average time in role: <strong>${stats.avgTimeInRoleMonths} months</strong></p>
    <p>Skills coverage per employee: <strong>${stats.skillsInventoryCoveragePerEmployee}</strong></p>
  `;
}

async function loadJourney() {
  const targetOpportunityId = journeyOpportunitySelect.value;
  if (!targetOpportunityId || !state.selectedEmployeeId) {
    journeyResultEl.innerHTML = '<p>Select a target opportunity to generate a roadmap.</p>';
    return;
  }

  const journey = await api(
    `/api/career-journey?employeeId=${state.selectedEmployeeId}&targetOpportunityId=${targetOpportunityId}`
  );

  const roadmapLines = journey.roadmap
    .map((step) => `<p>Step ${step.step}: ${step.action}</p>`)
    .join('');

  const learningLines = journey.learningRecommendations
    .map((item) => `<p><strong>${item.title}</strong>: ${item.description}</p>`)
    .join('');

  const pathProgression = (journey.pathProgression || []).join(' -> ');

  journeyResultEl.innerHTML = `
    <p><strong>Readiness Score:</strong> ${journey.readinessScore}%</p>
    <p><strong>Target:</strong> ${journey.targetOpportunity.title} (${journey.targetOpportunity.type})</p>
    <p><strong>Path Progression:</strong> ${pathProgression || 'No defined path for this role.'}</p>
    <p><strong>Roadmap:</strong></p>
    ${roadmapLines || '<p>No gaps identified.</p>'}
    <p><strong>Learning Recommendations:</strong></p>
    ${learningLines || '<p>No matching learning opportunities found.</p>'}
  `;
}

async function refreshAll() {
  try {
    if (!state.currentUser) return;
    await loadOpportunityTypes();
    await loadEmployees();
    updateVisibility();
    await loadEmployeeProfile();
    await loadOpportunities();
    await loadApplications();
    await loadPolicies();
    await loadAnalytics();
    await loadJourney();
  } catch (error) {
    setMessage(error.message, true);
  }
}

employeeSelect.addEventListener('change', async (event) => {
  state.selectedEmployeeId = event.target.value;
  await refreshAll();
});

aspirationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api(`/api/employees/${state.selectedEmployeeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ careerAspirations: document.getElementById('careerAspirations').value })
    });
    setMessage('Career aspirations updated.');
    await loadEmployeeProfile();
  } catch (error) {
    setMessage(error.message, true);
  }
});

skillForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api(`/api/employees/${state.selectedEmployeeId}/skills`, {
      method: 'POST',
      body: JSON.stringify({
        skillName: document.getElementById('skillName').value,
        category: document.getElementById('skillCategory').value,
        proficiency: Number(document.getElementById('skillLevel').value)
      })
    });
    skillForm.reset();
    document.getElementById('skillCategory').value = 'General';
    setMessage('Skill saved.');
    await refreshAll();
  } catch (error) {
    setMessage(error.message, true);
  }
});

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadOpportunities();
});

journeyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await loadJourney();
    setMessage('Career journey generated.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

opportunityForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const relatedSkillIds = document
      .getElementById('oppRelatedSkills')
      .value.split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await api('/api/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        title: document.getElementById('oppTitle').value,
        type: document.getElementById('oppType').value,
        jobId: document.getElementById('oppJobId').value || null,
        department: document.getElementById('oppDepartment').value,
        duration: document.getElementById('oppDuration').value,
        description: document.getElementById('oppDescription').value,
        relatedSkillIds
      })
    });

    opportunityForm.reset();
    setMessage('Opportunity created.');
    await refreshAll();
  } catch (error) {
    setMessage(error.message, true);
  }
});

policyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const stages = JSON.parse(document.getElementById('policyStages').value);
    await api('/api/approval-policies', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('policyName').value,
        department: document.getElementById('policyDepartment').value,
        opportunityType: document.getElementById('policyType').value,
        stages
      })
    });

    policyForm.reset();
    document.getElementById('policyDepartment').value = '*';
    setMessage('Approval policy created.');
    await loadPolicies();
  } catch (error) {
    setMessage(error.message, true);
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        userId: document.getElementById('userId').value,
        password: document.getElementById('password').value
      })
    });

    state.token = result.token;
    state.currentUser = result.user;
    localStorage.setItem(TOKEN_KEY, state.token);

    renderSession();
    updateVisibility();
    await refreshAll();
    setMessage('Login successful.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    if (state.token) {
      await api('/api/auth/logout', { method: 'POST' });
    }
  } catch (_error) {
    // ignore
  }

  state.token = null;
  state.currentUser = null;
  state.selectedEmployeeId = null;
  localStorage.removeItem(TOKEN_KEY);

  employeeProfile.innerHTML = '';
  opportunitiesEl.innerHTML = '';
  applicationsEl.innerHTML = '';
  analyticsEl.innerHTML = '';
  journeyResultEl.innerHTML = '';
  policyListEl.innerHTML = '';

  renderSession();
  updateVisibility();
  setMessage('Logged out.');
});

exportLink.addEventListener('click', async (event) => {
  event.preventDefault();
  try {
    const response = await fetch('/api/analytics/export.csv', {
      headers: {
        Authorization: `Bearer ${state.token}`
      }
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Export failed.' }));
      throw new Error(errorBody.error || 'Export failed.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'applications.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage('CSV export downloaded.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

window.applyOpportunity = async function applyOpportunity(opportunityId) {
  try {
    await api('/api/applications', {
      method: 'POST',
      body: JSON.stringify({ opportunityId })
    });
    setMessage('Application submitted.');
    await loadApplications();
    await loadAnalytics();
  } catch (error) {
    setMessage(error.message, true);
  }
};

window.bookmarkOpportunity = async function bookmarkOpportunity(opportunityId) {
  try {
    await api(`/api/opportunities/${opportunityId}/bookmark`, {
      method: 'POST'
    });
    setMessage('Opportunity bookmarked.');
  } catch (error) {
    setMessage(error.message, true);
  }
};

window.decideApproval = async function decideApproval(applicationId, decision) {
  try {
    await api(`/api/applications/${applicationId}/approvals`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes: `${decision} via dashboard` })
    });
    setMessage(`Approval decision recorded: ${decision}.`);
    await loadApplications();
  } catch (error) {
    setMessage(error.message, true);
  }
};

async function initSession() {
  await loadDemoUsers();

  if (!state.token) {
    renderSession();
    updateVisibility();
    return;
  }

  try {
    state.currentUser = await api('/api/auth/me');
    renderSession();
    updateVisibility();
    await refreshAll();
  } catch (_error) {
    state.token = null;
    state.currentUser = null;
    localStorage.removeItem(TOKEN_KEY);
    renderSession();
    updateVisibility();
  }
}

initSession();
