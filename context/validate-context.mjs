import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const contextRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(contextRoot);
const failures = [];

const requiredProjectFiles = [
  'agent.md',
  'example.md',
  'prompt/plan-1.md',
  'prompt/plan-2.md',
];

const requiredContextFiles = [
  'README.md',
  'project-scope.md',
  'system-architecture.md',
  'architecture-decisions.md',
  'contract-catalog.md',
  'security-baseline.md',
  'task-register.md',
  'project-status.md',
  'current-task.md',
  'task-history.md',
];

function requireNonEmpty(base, relativePath) {
  const absolutePath = join(base, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return;
  }
  if (!statSync(absolutePath).isFile() || statSync(absolutePath).size === 0) {
    failures.push(`Required file is empty or not a file: ${relativePath}`);
  }
}

for (const path of requiredProjectFiles) requireNonEmpty(projectRoot, path);
for (const path of requiredContextFiles) requireNonEmpty(contextRoot, path);

const registerPath = join(contextRoot, 'task-register.md');
const register = existsSync(registerPath) ? readFileSync(registerPath, 'utf8') : '';
const taskRows = [];

for (const [index, line] of register.split(/\r?\n/u).entries()) {
  if (!/^\|\s*[A-Z]{2,4}-\d{3}\s*\|/u.test(line)) continue;
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

  if (cells.length !== 5) {
    failures.push(`Malformed task row at task-register.md:${index + 1}`);
    continue;
  }

  taskRows.push({
    id: cells[0],
    task: cells[1],
    dependencyText: cells[2],
    evidence: cells[3],
    status: cells[4],
    line: index + 1,
  });
}

const taskById = new Map();
const allowedStatuses = new Set(['not started', 'in progress', 'blocked', 'complete']);

for (const task of taskRows) {
  if (taskById.has(task.id)) {
    failures.push(`Duplicate task ID ${task.id} at task-register.md:${task.line}`);
  }
  taskById.set(task.id, task);

  if (!allowedStatuses.has(task.status)) {
    failures.push(`Invalid status for ${task.id}: ${task.status}`);
  }
  if (!task.task || !task.evidence) {
    failures.push(`Task ${task.id} must include scope and completion evidence`);
  }

  const dependencyListPattern = /^[A-Z]{2,4}-\d{3}(?:, [A-Z]{2,4}-\d{3})*$/u;
  if (task.dependencyText !== 'None' && !dependencyListPattern.test(task.dependencyText)) {
    failures.push(
      `Task ${task.id} uses a non-machine-readable dependency expression: ${task.dependencyText}`,
    );
  }
  const dependencies =
    task.dependencyText === 'None' ? [] : task.dependencyText.split(', ').filter(Boolean);
  if (new Set(dependencies).size !== dependencies.length) {
    failures.push(`Task ${task.id} lists a duplicate dependency`);
  }
  task.dependencies = dependencies;
}

for (const task of taskRows) {
  for (const dependency of task.dependencies ?? []) {
    if (!taskById.has(dependency)) {
      failures.push(`Task ${task.id} references unknown dependency ${dependency}`);
    }
    if (dependency === task.id) {
      failures.push(`Task ${task.id} depends on itself`);
    }
  }
  if (task.status === 'complete') {
    const incompleteDependencies = task.dependencies.filter(
      (dependency) => taskById.get(dependency)?.status !== 'complete',
    );
    if (incompleteDependencies.length > 0) {
      failures.push(
        `Completed task ${task.id} has incomplete dependencies: ${incompleteDependencies.join(', ')}`,
      );
    }
  }
}

const visitState = new Map();
const visitStack = [];

function visit(taskId) {
  if (visitState.get(taskId) === 'done') return;
  if (visitState.get(taskId) === 'visiting') {
    const cycleStart = visitStack.indexOf(taskId);
    failures.push(`Dependency cycle: ${[...visitStack.slice(cycleStart), taskId].join(' -> ')}`);
    return;
  }

  visitState.set(taskId, 'visiting');
  visitStack.push(taskId);
  for (const dependency of taskById.get(taskId)?.dependencies ?? []) {
    if (taskById.has(dependency)) visit(dependency);
  }
  visitStack.pop();
  visitState.set(taskId, 'done');
}

for (const taskId of taskById.keys()) visit(taskId);

if (taskById.has('LCH-001')) {
  const launchAncestors = new Set();
  function collectLaunchAncestors(taskId) {
    for (const dependency of taskById.get(taskId)?.dependencies ?? []) {
      if (launchAncestors.has(dependency)) continue;
      launchAncestors.add(dependency);
      collectLaunchAncestors(dependency);
    }
  }
  collectLaunchAncestors('LCH-001');
  const disconnectedTasks = taskRows
    .map((task) => task.id)
    .filter((taskId) => taskId !== 'LCH-001' && !launchAncestors.has(taskId));
  if (disconnectedTasks.length > 0) {
    failures.push(`Tasks disconnected from launch dependency graph: ${disconnectedTasks.join(', ')}`);
  }
}

const inProgressTasks = taskRows.filter((task) => task.status === 'in progress');
if (inProgressTasks.length > 1) {
  failures.push(`More than one task is in progress: ${inProgressTasks.map((task) => task.id).join(', ')}`);
}

const currentTaskPath = join(contextRoot, 'current-task.md');
const currentTask = existsSync(currentTaskPath) ? readFileSync(currentTaskPath, 'utf8') : '';
const currentId = currentTask.match(/^# Current Task - ([A-Z]{2,4}-\d{3})\s*$/mu)?.[1];
const currentStatus = currentTask.match(/^Status:\s*`(not started|in progress|blocked|complete)`/mu)?.[1];
const projectStatusPath = join(contextRoot, 'project-status.md');
const projectStatus = existsSync(projectStatusPath) ? readFileSync(projectStatusPath, 'utf8') : '';
const projectSelectedId = projectStatus.match(
  /^- \*\*Selected task:\*\* `([A-Z]{2,4}-\d{3})`\s*$/mu,
)?.[1];
const projectSelectedStatus = projectStatus.match(
  /^- \*\*Selected status:\*\* `(not started|in progress|blocked|complete)`\s*$/mu,
)?.[1];
const projectSelectedTitle = projectStatus.match(/^- \*\*Selected task title:\*\* (.+)$/mu)?.[1];
const projectLastCompleted = projectStatus.match(
  /^- \*\*Last completed task:\*\* `(None|[A-Z]{2,4}-\d{3})`\s*$/mu,
)?.[1];
const projectNextCandidate = projectStatus.match(
  /^- \*\*Next candidate after selected:\*\* `(None|[A-Z]{2,4}-\d{3})`\s*$/mu,
)?.[1];
const projectBlockedText = projectStatus.match(/^- \*\*Blocked tasks:\*\* `([^`]+)`\s*$/mu)?.[1];

if (!currentId || !currentStatus) {
  failures.push('current-task.md must declare a machine-readable task ID and status');
} else if (!taskById.has(currentId)) {
  failures.push(`current-task.md references unknown task ${currentId}`);
} else {
  const registeredTask = taskById.get(currentId);
  if (registeredTask.status !== currentStatus) {
    failures.push(
      `Current task status mismatch: current-task.md=${currentStatus}, register=${registeredTask.status}`,
    );
  }
  if (projectSelectedId !== currentId || projectSelectedStatus !== currentStatus) {
    failures.push(
      `Task state mismatch: current=${currentId}/${currentStatus}, project-status=${projectSelectedId ?? 'missing'}/${projectSelectedStatus ?? 'missing'}`,
    );
  }
  if (projectSelectedTitle !== registeredTask.task) {
    failures.push(
      `Selected task title mismatch: project-status=${projectSelectedTitle ?? 'missing'}, register=${registeredTask.task}`,
    );
  }
  if (currentStatus === 'in progress' && inProgressTasks[0]?.id !== currentId) {
    failures.push(`The in-progress register task does not match current-task.md (${currentId})`);
  }
  if (currentStatus !== 'in progress' && inProgressTasks.length > 0) {
    failures.push('A register task is in progress while the selected task is not in progress');
  }
  if (currentStatus === 'complete') {
    failures.push('current-task.md must be advanced after completion; it cannot remain complete');
  }
  if (currentStatus === 'in progress' || currentStatus === 'not started') {
    const incompleteDependencies = registeredTask.dependencies.filter(
      (dependency) => taskById.get(dependency)?.status !== 'complete',
    );
    if (incompleteDependencies.length > 0) {
      failures.push(
        `Selected next task ${currentId} has incomplete dependencies: ${incompleteDependencies.join(', ')}`,
      );
    }
  }
  if (currentStatus === 'blocked') {
    if (!/^Blocker condition:\s*\S.+$/mu.test(currentTask)) {
      failures.push('A blocked current task must declare Blocker condition');
    }
    if (!/^Blocker owner:\s*\S.+$/mu.test(currentTask)) {
      failures.push('A blocked current task must declare Blocker owner');
    }
    if (!/^Unblock signal:\s*\S.+$/mu.test(currentTask)) {
      failures.push('A blocked current task must declare Unblock signal');
    }
  }
}

const taskHistoryPath = join(contextRoot, 'task-history.md');
const taskHistory = existsSync(taskHistoryPath) ? readFileSync(taskHistoryPath, 'utf8') : '';
const completedTasks = taskRows.filter((candidate) => candidate.status === 'complete');
for (const task of completedTasks) {
  const archiveRelativePath = `tasks/${task.id}.md`;
  const archivePath = join(contextRoot, archiveRelativePath);
  if (!existsSync(archivePath)) {
    failures.push(`Completed task ${task.id} is missing archive ${archiveRelativePath}`);
    continue;
  }
  const archive = readFileSync(archivePath, 'utf8');
  if (!new RegExp(`^# Completed Task - ${task.id}\\s*$`, 'mu').test(archive)) {
    failures.push(`Archive ${archiveRelativePath} has no matching completed-task heading`);
  }
  if (!/^Status:\s*`complete`\s*$/mu.test(archive)) {
    failures.push(`Archive ${archiveRelativePath} is not marked complete`);
  }
  if (!/^Completed:\s*\d{4}-\d{2}-\d{2}\s*$/mu.test(archive)) {
    failures.push(`Archive ${archiveRelativePath} has no ISO completion date`);
  }
  if (!/^Reviewer:\s*\S.+$/mu.test(archive)) {
    failures.push(`Archive ${archiveRelativePath} has no reviewer`);
  }
  if (!/^## Acceptance results\s*$/mu.test(archive) || !/^- \[x\] .+$/mu.test(archive)) {
    failures.push(`Archive ${archiveRelativePath} has no checked acceptance results`);
  }
  if (/^- \[ \] .+$/mu.test(archive)) {
    failures.push(`Archive ${archiveRelativePath} contains unchecked acceptance criteria`);
  }
  const evidenceSection = archive.split(/^## Validation evidence\s*$/mu)[1]?.split(/^## /mu)[0] ?? '';
  if (!/^- Command: `[^`]+`\s*$/mu.test(evidenceSection)) {
    failures.push(`Archive ${archiveRelativePath} has no concrete validation command`);
  }
  if (!/^- Result: `[^`]+`\s*$/mu.test(evidenceSection)) {
    failures.push(`Archive ${archiveRelativePath} has no concrete validation result`);
  }
  if (!/^- Artifacts?: .+$/mu.test(evidenceSection)) {
    failures.push(`Archive ${archiveRelativePath} has no artifact evidence`);
  }
  const historyRow = new RegExp(
    `^\\| \\[${task.id}\\]\\(tasks/${task.id}\\.md\\) \\| \\d{4}-\\d{2}-\\d{2} \\| [^|]+ \\| [^|]+ \\|$`,
    'mu',
  );
  if (!historyRow.test(taskHistory)) {
    failures.push(`task-history.md has no valid completion row for ${task.id}`);
  }
}

if (completedTasks.length === 0) {
  if (projectLastCompleted !== 'None') {
    failures.push('project-status.md names a last completed task but the register has none');
  }
} else if (!projectLastCompleted || projectLastCompleted === 'None') {
  failures.push('project-status.md must name the last completed task');
} else if (taskById.get(projectLastCompleted)?.status !== 'complete') {
  failures.push(`project-status.md last completed task is not complete: ${projectLastCompleted}`);
}

if (!projectNextCandidate) {
  failures.push('project-status.md must declare the next candidate after selected');
} else if (projectNextCandidate !== 'None') {
  const nextTask = taskById.get(projectNextCandidate);
  if (!nextTask) {
    failures.push(`project-status.md references unknown next candidate ${projectNextCandidate}`);
  } else if (nextTask.status !== 'not started') {
    failures.push(`Next candidate ${projectNextCandidate} must be not started`);
  } else {
    const unresolvedAfterSelected = nextTask.dependencies.filter(
      (dependency) =>
        dependency !== currentId && taskById.get(dependency)?.status !== 'complete',
    );
    if (unresolvedAfterSelected.length > 0) {
      failures.push(
        `Next candidate ${projectNextCandidate} would remain blocked after selected task: ${unresolvedAfterSelected.join(', ')}`,
      );
    }
  }
}

const blockedTaskIds = taskRows
  .filter((task) => task.status === 'blocked')
  .map((task) => task.id);
const projectBlockedIds =
  projectBlockedText === 'None'
    ? []
    : (projectBlockedText?.split(', ').filter(Boolean) ?? []);
if (blockedTaskIds.some((taskId) => taskId !== currentId)) {
  failures.push('Only the selected task may be blocked');
}
if (blockedTaskIds.join(',') !== projectBlockedIds.join(',')) {
  failures.push(
    `Blocked task mismatch: register=${blockedTaskIds.join(',') || 'None'}, project-status=${projectBlockedIds.join(',') || 'None'}`,
  );
}

const completedArchiveFiles = completedTasks.map((task) => `tasks/${task.id}.md`);
const markdownFiles = [...requiredContextFiles, ...completedArchiveFiles];
for (const fileName of markdownFiles) {
  const markdownPath = join(contextRoot, fileName);
  if (!existsSync(markdownPath)) continue;
  const markdown = readFileSync(markdownPath, 'utf8');
  const relativeLinkPattern = /\[[^\]]*\]\((?!https?:\/\/|mailto:|#)([^)#]+)(?:#[^)]+)?\)/gu;

  for (const match of markdown.matchAll(relativeLinkPattern)) {
    const linkTarget = decodeURIComponent(match[1].trim().replace(/^<|>$/gu, ''));
    const resolvedTarget = resolve(dirname(markdownPath), normalize(linkTarget));
    if (!existsSync(resolvedTarget)) {
      failures.push(`Broken relative link in ${fileName}: ${linkTarget}`);
    }
  }
}

const contextText = markdownFiles
  .filter((fileName) => existsSync(join(contextRoot, fileName)))
  .map((fileName) => readFileSync(join(contextRoot, fileName), 'utf8'))
  .join('\n');

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\b(?:api[_-]?key|client[_-]?secret|password)\s*[:=]\s*["'][^"']{8,}["']/iu,
];

for (const pattern of secretPatterns) {
  if (pattern.test(contextText)) failures.push(`Potential committed secret matched ${pattern}`);
}

if (taskRows.length === 0) failures.push('No task rows were parsed from task-register.md');

if (failures.length > 0) {
  console.error(`Context validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Context validation passed: ${requiredContextFiles.length} documents, ${taskRows.length} tasks, ${inProgressTasks.length} in progress.`,
  );
}
