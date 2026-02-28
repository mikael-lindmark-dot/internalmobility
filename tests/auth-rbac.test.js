const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createStore } = require('../src/storage');
const { createApp } = require('../src/server');

const sourceDbPath = path.join(__dirname, '..', 'data', 'db.json');

function makeTempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'itm-tests-'));
  const dbPath = path.join(dir, 'db.json');
  fs.copyFileSync(sourceDbPath, dbPath);
  return { dir, dbPath };
}

async function startTestServer(dbPath) {
  const store = createStore({ mode: 'json', dbPath });
  const { app } = createApp({ store });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      await store.close();
    }
  };
}

async function request(baseUrl, token, method, pathname, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const parsed = contentType.includes('application/json') ? await response.json() : await response.text();

  return { status: response.status, body: parsed };
}

async function login(baseUrl, userId, password = 'demo123') {
  const result = await request(baseUrl, null, 'POST', '/api/auth/login', { userId, password });
  assert.equal(result.status, 200, `Expected login success for ${userId}`);
  return result.body.token;
}

test('employee can only view own profile scope', async () => {
  const { dbPath, dir } = makeTempDb();
  const server = await startTestServer(dbPath);

  try {
    const token = await login(server.baseUrl, 'u_emp_001');

    const employees = await request(server.baseUrl, token, 'GET', '/api/employees');
    assert.equal(employees.status, 200);
    assert.equal(employees.body.length, 1);
    assert.equal(employees.body[0].employeeId, 'emp_001');

    const forbiddenProfile = await request(server.baseUrl, token, 'GET', '/api/employees/emp_002');
    assert.equal(forbiddenProfile.status, 403);
  } finally {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('manager can view direct reports and create opportunity', async () => {
  const { dbPath, dir } = makeTempDb();
  const server = await startTestServer(dbPath);

  try {
    const token = await login(server.baseUrl, 'u_mgr_010');

    const employees = await request(server.baseUrl, token, 'GET', '/api/employees');
    assert.equal(employees.status, 200);
    const ids = employees.body.map((e) => e.employeeId);
    assert.deepEqual(ids.sort(), ['emp_001', 'emp_010'].sort());

    const createOpp = await request(server.baseUrl, token, 'POST', '/api/opportunities', {
      title: 'Engineering Growth Project',
      jobId: 'job_201',
      department: 'Engineering',
      description: 'Lead internal platform expansion.'
    });

    assert.equal(createOpp.status, 201);
    assert.equal(createOpp.body.hiringManagerId, 'emp_010');
  } finally {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('employee cannot create opportunities', async () => {
  const { dbPath, dir } = makeTempDb();
  const server = await startTestServer(dbPath);

  try {
    const token = await login(server.baseUrl, 'u_emp_001');

    const createOpp = await request(server.baseUrl, token, 'POST', '/api/opportunities', {
      title: 'Unauthorized Role',
      jobId: 'job_201',
      department: 'Engineering'
    });

    assert.equal(createOpp.status, 403);
  } finally {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('only HR can export analytics CSV', async () => {
  const { dbPath, dir } = makeTempDb();
  const server = await startTestServer(dbPath);

  try {
    const employeeToken = await login(server.baseUrl, 'u_emp_001');
    const hrToken = await login(server.baseUrl, 'u_hr_001');

    const employeeExport = await request(server.baseUrl, employeeToken, 'GET', '/api/analytics/export.csv');
    assert.equal(employeeExport.status, 403);

    const hrExport = await request(server.baseUrl, hrToken, 'GET', '/api/analytics/export.csv');
    assert.equal(hrExport.status, 200);
    assert.match(hrExport.body, /application_id/);
  } finally {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('applications follow policy-driven approvals', async () => {
  const { dbPath, dir } = makeTempDb();
  const server = await startTestServer(dbPath);

  try {
    const employeeToken = await login(server.baseUrl, 'u_emp_001');
    const managerToken = await login(server.baseUrl, 'u_mgr_010');

    const apply = await request(server.baseUrl, employeeToken, 'POST', '/api/applications', {
      opportunityId: 'opp_103'
    });

    assert.equal(apply.status, 201);
    assert.equal(apply.body.status, 'Pending Approval');
    assert.equal(apply.body.approvalPolicyId, 'pol_project_fastlane');

    const approve = await request(
      server.baseUrl,
      managerToken,
      'POST',
      `/api/applications/${apply.body.applicationId}/approvals`,
      { decision: 'Approved', notes: 'approved in test' }
    );

    assert.equal(approve.status, 200);
    assert.equal(approve.body.status, 'Under Review');
  } finally {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('career journey returns readiness roadmap and learning recommendations', async () => {
  const { dbPath, dir } = makeTempDb();
  const server = await startTestServer(dbPath);

  try {
    const employeeToken = await login(server.baseUrl, 'u_emp_002');
    const journey = await request(
      server.baseUrl,
      employeeToken,
      'GET',
      '/api/career-journey?employeeId=emp_002&targetOpportunityId=opp_102'
    );

    assert.equal(journey.status, 200);
    assert.equal(journey.body.targetOpportunity.opportunityId, 'opp_102');
    assert.ok(Array.isArray(journey.body.roadmap));
    assert.ok(Array.isArray(journey.body.learningRecommendations));
  } finally {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
