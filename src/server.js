const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { createStore } = require('./storage');

const PORT = process.env.PORT || 3000;

const APPLICATION_STATUSES = [
  'Draft',
  'Submitted',
  'Under Review',
  'Interviewing',
  'Offered',
  'Accepted',
  'Rejected'
];

const sessions = new Map();

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function createToken() {
  return crypto.randomBytes(24).toString('hex');
}

function normalizeSkillName(name = '') {
  return name.trim().toLowerCase();
}

function withoutPassword(user) {
  if (!user) return null;
  return {
    userId: user.userId,
    name: user.name,
    role: user.role,
    employeeId: user.employeeId
  };
}

function forbidden(res, message = 'You do not have permission for this action.') {
  return res.status(403).json({ error: message });
}

function canAccessEmployee(user, targetEmployeeId, db) {
  if (user.role === 'hr') return true;
  if (user.employeeId === targetEmployeeId) return true;

  if (user.role === 'manager') {
    const target = db.employees.find((e) => e.employeeId === targetEmployeeId);
    if (target && target.managerId === user.employeeId) return true;
  }

  return false;
}

function canManageOpportunity(user, opportunityId, db) {
  if (user.role === 'hr') return true;
  if (user.role !== 'manager') return false;

  const opportunity = db.opportunities.find((opp) => opp.opportunityId === opportunityId);
  return Boolean(opportunity && opportunity.hiringManagerId === user.employeeId);
}

function computeMatch(db, employeeId, opportunity) {
  const jobProfile = db.jobProfiles.find((job) => job.jobId === opportunity.jobId);
  if (!jobProfile) {
    return { matchPercent: 0, missingSkills: [] };
  }

  const employeeSkills = db.employeeSkills.filter((item) => item.employeeId === employeeId);
  const skillById = new Map(employeeSkills.map((item) => [item.skillId, item]));

  let weightedScore = 0;
  let totalWeight = 0;
  const missingSkills = [];

  for (const req of jobProfile.requiredSkills) {
    totalWeight += req.weight;
    const employeeSkill = skillById.get(req.skillId);
    const proficiency = employeeSkill ? employeeSkill.proficiency : 0;

    const cappedRatio = Math.min(proficiency / req.minProficiency, 1);
    weightedScore += cappedRatio * req.weight;

    if (!employeeSkill || proficiency < req.minProficiency) {
      const skillName = db.skills.find((s) => s.skillId === req.skillId)?.skillName || req.skillId;
      missingSkills.push({
        skillId: req.skillId,
        skillName,
        requiredLevel: req.minProficiency,
        currentLevel: proficiency
      });
    }
  }

  const matchPercent = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  return { matchPercent, missingSkills };
}

function pushAudit(db, action, entityType, entityId, changedBy = 'system') {
  db.auditLogs.push({
    auditId: createId('audit'),
    action,
    entityType,
    entityId,
    changedBy,
    timestamp: new Date().toISOString()
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function createApp(options = {}) {
  const store = options.store || createStore();
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const requireAuth = asyncHandler(async (req, res, next) => {
    const db = await store.readDb();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const user = db.users.find((u) => u.userId === session.userId);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    req.user = user;
    req.db = db;
    req.authToken = token;
    return next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/auth/demo-users', asyncHandler(async (_req, res) => {
    const db = await store.readDb();
    const users = db.users.map((user) => ({
      userId: user.userId,
      name: user.name,
      role: user.role,
      password: 'demo123'
    }));
    res.json(users);
  }));

  app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const db = await store.readDb();
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ error: 'userId and password are required.' });
    }

    const user = db.users.find((entry) => entry.userId === userId && entry.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = createToken();
    sessions.set(token, { userId: user.userId, createdAt: Date.now() });

    return res.json({ token, user: withoutPassword(user) });
  }));

  app.post('/api/auth/logout', requireAuth, asyncHandler(async (req, res) => {
    sessions.delete(req.authToken);
    res.json({ ok: true });
  }));

  app.get('/api/auth/me', requireAuth, asyncHandler(async (req, res) => {
    res.json(withoutPassword(req.user));
  }));

  app.get('/api/employees', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const { role, employeeId } = req.user;

    if (role === 'hr') {
      return res.json(db.employees);
    }

    if (role === 'manager') {
      const visible = db.employees.filter((e) => e.employeeId === employeeId || e.managerId === employeeId);
      return res.json(visible);
    }

    const me = db.employees.filter((e) => e.employeeId === employeeId);
    return res.json(me);
  }));

  app.get('/api/employees/:employeeId', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const employee = db.employees.find((e) => e.employeeId === req.params.employeeId);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    if (!canAccessEmployee(req.user, employee.employeeId, db)) {
      return forbidden(res);
    }

    const skills = db.employeeSkills
      .filter((item) => item.employeeId === employee.employeeId)
      .map((item) => ({
        ...item,
        skillName: db.skills.find((s) => s.skillId === item.skillId)?.skillName || item.skillId
      }));

    return res.json({ ...employee, skills });
  }));

  app.patch('/api/employees/:employeeId', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const employee = db.employees.find((e) => e.employeeId === req.params.employeeId);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const canEdit = req.user.role === 'hr' || req.user.employeeId === employee.employeeId;
    if (!canEdit) {
      return forbidden(res);
    }

    const updatableFields = [
      'name',
      'department',
      'role',
      'location',
      'tenureMonths',
      'managerId',
      'careerAspirations'
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    }

    pushAudit(db, 'UPDATE', 'Employee', employee.employeeId, req.user.userId);
    await store.writeDb(db);

    return res.json(employee);
  }));

  app.post('/api/employees/:employeeId/skills', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const employee = db.employees.find((e) => e.employeeId === req.params.employeeId);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const canEdit = req.user.role === 'hr' || req.user.employeeId === employee.employeeId;
    if (!canEdit) {
      return forbidden(res);
    }

    const { skillId, skillName, category = 'General', proficiency = 1 } = req.body;
    if (!skillId && !skillName) {
      return res.status(400).json({ error: 'Provide skillId or skillName.' });
    }

    let resolvedSkillId = skillId;

    if (!resolvedSkillId) {
      const normalizedName = normalizeSkillName(skillName);
      const existing = db.skills.find((s) => normalizeSkillName(s.skillName) === normalizedName);
      if (existing) {
        resolvedSkillId = existing.skillId;
      } else {
        resolvedSkillId = createId('sk');
        db.skills.push({
          skillId: resolvedSkillId,
          skillName: skillName.trim(),
          category
        });
      }
    }

    const existingEmployeeSkill = db.employeeSkills.find(
      (item) => item.employeeId === employee.employeeId && item.skillId === resolvedSkillId
    );

    if (existingEmployeeSkill) {
      existingEmployeeSkill.proficiency = proficiency;
    } else {
      db.employeeSkills.push({
        employeeId: employee.employeeId,
        skillId: resolvedSkillId,
        proficiency,
        endorsedBy: []
      });
    }

    pushAudit(db, 'UPSERT', 'EmployeeSkill', `${employee.employeeId}:${resolvedSkillId}`, req.user.userId);
    await store.writeDb(db);

    return res.status(201).json({
      employeeId: employee.employeeId,
      skillId: resolvedSkillId,
      proficiency
    });
  }));

  app.post('/api/employees/:employeeId/skills/:skillId/endorse', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const { employeeId, skillId } = req.params;

    if (!['manager', 'hr'].includes(req.user.role)) {
      return forbidden(res);
    }

    if (req.user.role === 'manager') {
      const target = db.employees.find((e) => e.employeeId === employeeId);
      if (!target || target.managerId !== req.user.employeeId) {
        return forbidden(res, 'Managers can only endorse direct reports.');
      }
    }

    const entry = db.employeeSkills.find((item) => item.employeeId === employeeId && item.skillId === skillId);
    if (!entry) {
      return res.status(404).json({ error: 'Employee skill not found.' });
    }

    const managerId = req.user.employeeId || req.user.userId;
    if (!entry.endorsedBy.includes(managerId)) {
      entry.endorsedBy.push(managerId);
    }

    pushAudit(db, 'ENDORSE', 'EmployeeSkill', `${employeeId}:${skillId}`, req.user.userId);
    await store.writeDb(db);

    return res.json(entry);
  }));

  app.get('/api/opportunities', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const { q = '', department = '', employeeId } = req.query;

    let targetEmployeeId = employeeId;
    if (req.user.role === 'employee') {
      targetEmployeeId = req.user.employeeId;
    }

    if (targetEmployeeId && !canAccessEmployee(req.user, String(targetEmployeeId), db)) {
      return forbidden(res);
    }

    let results = db.opportunities.filter((opp) => {
      const matchesText = [opp.title, opp.description, opp.type].join(' ').toLowerCase().includes(String(q).toLowerCase());
      const matchesDepartment = department ? opp.department === department : true;
      return matchesText && matchesDepartment;
    });

    results = results.map((opp) => {
      const job = db.jobProfiles.find((j) => j.jobId === opp.jobId);
      if (targetEmployeeId) {
        const match = computeMatch(db, String(targetEmployeeId), opp);
        return { ...opp, jobProfile: job, ...match };
      }
      return { ...opp, jobProfile: job };
    });

    return res.json(results);
  }));

  app.post('/api/opportunities', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;

    if (!['manager', 'hr'].includes(req.user.role)) {
      return forbidden(res);
    }

    const { title, type, duration, jobId, department, description } = req.body;

    if (!title || !jobId || !department) {
      return res.status(400).json({ error: 'title, jobId, and department are required.' });
    }

    const opportunity = {
      opportunityId: createId('opp'),
      title,
      type: type || 'Role',
      duration: duration || 'Full-time',
      jobId,
      department,
      hiringManagerId: req.user.employeeId || null,
      description: description || '',
      createdAt: new Date().toISOString()
    };

    db.opportunities.push(opportunity);
    pushAudit(db, 'CREATE', 'Opportunity', opportunity.opportunityId, req.user.userId);
    await store.writeDb(db);

    return res.status(201).json(opportunity);
  }));

  app.post('/api/opportunities/:opportunityId/bookmark', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const { opportunityId } = req.params;

    if (req.user.role !== 'employee') {
      return forbidden(res, 'Only employees can bookmark opportunities.');
    }

    const employee = db.employees.find((e) => e.employeeId === req.user.employeeId);
    const opportunity = db.opportunities.find((o) => o.opportunityId === opportunityId);

    if (!employee || !opportunity) {
      return res.status(404).json({ error: 'Employee or opportunity not found.' });
    }

    if (!employee.bookmarks.includes(opportunityId)) {
      employee.bookmarks.push(opportunityId);
    }

    pushAudit(db, 'BOOKMARK', 'Opportunity', opportunityId, req.user.userId);
    await store.writeDb(db);

    return res.status(201).json({ employeeId: employee.employeeId, opportunityId, bookmarks: employee.bookmarks });
  }));

  app.get('/api/match/:employeeId/:opportunityId', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;

    if (!canAccessEmployee(req.user, req.params.employeeId, db)) {
      return forbidden(res);
    }

    const employee = db.employees.find((e) => e.employeeId === req.params.employeeId);
    const opportunity = db.opportunities.find((o) => o.opportunityId === req.params.opportunityId);

    if (!employee || !opportunity) {
      return res.status(404).json({ error: 'Employee or opportunity not found.' });
    }

    return res.json(computeMatch(db, employee.employeeId, opportunity));
  }));

  app.post('/api/applications', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;

    if (req.user.role !== 'employee') {
      return forbidden(res, 'Only employees can submit applications.');
    }

    const { opportunityId, status = 'Submitted' } = req.body;
    const employeeId = req.user.employeeId;

    if (!employeeId || !opportunityId) {
      return res.status(400).json({ error: 'employeeId and opportunityId are required.' });
    }

    if (!APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${APPLICATION_STATUSES.join(', ')}` });
    }

    const existing = db.applications.find(
      (appItem) => appItem.employeeId === employeeId && appItem.opportunityId === opportunityId
    );

    if (existing) {
      return res.status(409).json({ error: 'Application already exists.' });
    }

    const application = {
      applicationId: createId('app'),
      employeeId,
      opportunityId,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.applications.push(application);
    pushAudit(db, 'CREATE', 'InternalApplication', application.applicationId, req.user.userId);
    await store.writeDb(db);

    return res.status(201).json(application);
  }));

  app.patch('/api/applications/:applicationId/status', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const application = db.applications.find((item) => item.applicationId === req.params.applicationId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const isHr = req.user.role === 'hr';
    const canManagerUpdate = canManageOpportunity(req.user, application.opportunityId, db);

    if (!isHr && !canManagerUpdate) {
      return forbidden(res, 'Only owning manager or HR can change status.');
    }

    const { status } = req.body;
    if (!APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${APPLICATION_STATUSES.join(', ')}` });
    }

    application.status = status;
    application.updatedAt = new Date().toISOString();

    pushAudit(db, 'STATUS_CHANGE', 'InternalApplication', application.applicationId, req.user.userId);
    await store.writeDb(db);

    return res.json(application);
  }));

  app.get('/api/applications', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const { employeeId, hiringManagerId } = req.query;

    let list = db.applications;

    if (req.user.role === 'employee') {
      list = list.filter((item) => item.employeeId === req.user.employeeId);
    }

    if (req.user.role === 'manager') {
      const managerOpportunityIds = db.opportunities
        .filter((opp) => opp.hiringManagerId === req.user.employeeId)
        .map((opp) => opp.opportunityId);
      list = list.filter((item) => managerOpportunityIds.includes(item.opportunityId));
    }

    if (req.user.role === 'hr') {
      if (employeeId) {
        list = list.filter((item) => item.employeeId === employeeId);
      }

      if (hiringManagerId) {
        const managerOpportunityIds = db.opportunities
          .filter((opp) => opp.hiringManagerId === hiringManagerId)
          .map((opp) => opp.opportunityId);
        list = list.filter((item) => managerOpportunityIds.includes(item.opportunityId));
      }
    }

    const enriched = list.map((item) => ({
      ...item,
      employee: db.employees.find((e) => e.employeeId === item.employeeId),
      opportunity: db.opportunities.find((o) => o.opportunityId === item.opportunityId)
    }));

    return res.json(enriched);
  }));

  app.get('/api/career-paths', requireAuth, asyncHandler(async (req, res) => {
    res.json(req.db.careerPaths);
  }));

  app.get('/api/career-paths/readiness', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;
    const { employeeId, opportunityId } = req.query;

    if (!employeeId || !opportunityId) {
      return res.status(400).json({ error: 'employeeId and opportunityId are required.' });
    }

    if (!canAccessEmployee(req.user, String(employeeId), db)) {
      return forbidden(res);
    }

    const opportunity = db.opportunities.find((o) => o.opportunityId === opportunityId);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }

    const match = computeMatch(db, String(employeeId), opportunity);
    const developmentActions = match.missingSkills.map((skill) =>
      `Complete a learning plan for ${skill.skillName} to reach level ${skill.requiredLevel}.`
    );

    return res.json({
      readinessScore: match.matchPercent,
      nextRole: opportunity.title,
      missingSkills: match.missingSkills,
      developmentActions
    });
  }));

  app.get('/api/analytics', requireAuth, asyncHandler(async (req, res) => {
    const db = req.db;

    if (!['manager', 'hr'].includes(req.user.role)) {
      return forbidden(res, 'Only manager or HR can view analytics.');
    }

    const totalOpportunities = db.opportunities.length;
    const acceptedApplications = db.applications.filter((a) => a.status === 'Accepted').length;
    const internalFillRate = totalOpportunities > 0 ? Number(((acceptedApplications / totalOpportunities) * 100).toFixed(1)) : 0;

    const avgTimeInRoleMonths = db.employees.length > 0
      ? Number((db.employees.reduce((sum, e) => sum + (e.tenureMonths || 0), 0) / db.employees.length).toFixed(1))
      : 0;

    const totalSkillAssignments = db.employeeSkills.length;
    const skillsCoverage = db.employees.length > 0
      ? Number((totalSkillAssignments / db.employees.length).toFixed(1))
      : 0;

    const mobilityRate = db.employees.length > 0
      ? Number(((db.applications.length / db.employees.length) * 100).toFixed(1))
      : 0;

    res.json({
      totalEmployees: db.employees.length,
      totalOpportunities,
      totalApplications: db.applications.length,
      internalMobilityRate: mobilityRate,
      internalFillRate,
      avgTimeInRoleMonths,
      skillsInventoryCoveragePerEmployee: skillsCoverage
    });
  }));

  app.get('/api/analytics/export.csv', requireAuth, asyncHandler(async (req, res) => {
    if (req.user.role !== 'hr') {
      return forbidden(res, 'Only HR can export analytics.');
    }

    const db = req.db;
    const rows = [
      ['application_id', 'employee_id', 'opportunity_id', 'status', 'created_at', 'updated_at'],
      ...db.applications.map((a) => [a.applicationId, a.employeeId, a.opportunityId, a.status, a.createdAt, a.updatedAt])
    ];

    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
    res.send(csv);
  }));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return { app, store };
}

function startServer(options = {}) {
  const { app } = createApp(options);
  const server = app.listen(PORT, () => {
    console.log(`Internal Talent Mobility Platform listening on http://localhost:${PORT}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer
};
