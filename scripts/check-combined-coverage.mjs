import fs from 'node:fs';
import path from 'node:path';

import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const projectRoot = process.cwd();
const outputDirectory = path.join(projectRoot, 'coverage', 'combined');
const thresholds = {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
};

function loadCoverageMap(label, relativeFile) {
  const coverageFile = path.join(projectRoot, relativeFile);
  if (!fs.existsSync(coverageFile)) {
    throw new Error(
      `${label} coverage is missing at ${relativeFile}. Run its coverage suite first.`
    );
  }

  const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  const coverageMap = libCoverage.createCoverageMap(coverage);
  if (coverageMap.files().length === 0) {
    throw new Error(`${label} coverage did not contain any files.`);
  }
  return coverageMap;
}

function normalizedFile(file) {
  const absoluteFile = path.resolve(file);
  return process.platform === 'win32'
    ? absoluteFile.toLowerCase()
    : absoluteFile;
}

function findTypeScriptSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findTypeScriptSources(entryPath);
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')
      ? [entryPath]
      : [];
  });
}

function assertExactFiles(label, coverageMap, expectedFiles) {
  const actual = new Set(coverageMap.files().map(normalizedFile));
  const expected = new Set(expectedFiles.map(normalizedFile));
  const missing = [...expected].filter((file) => !actual.has(file));
  const unexpected = [...actual].filter((file) => !expected.has(file));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} coverage file ownership mismatch.` +
        `${missing.length ? ` Missing: ${missing.join(', ')}.` : ''}` +
        `${unexpected.length ? ` Unexpected: ${unexpected.join(', ')}.` : ''}`
    );
  }
}

function formatLineRanges(lines) {
  const sortedLines = [...new Set(lines)].sort((a, b) => a - b);
  const ranges = [];
  for (const line of sortedLines) {
    const current = ranges.at(-1);
    if (current && line === current.end + 1) {
      current.end = line;
    } else {
      ranges.push({ start: line, end: line });
    }
  }
  return ranges
    .map(({ start, end }) => (start === end ? `${start}` : `${start}-${end}`))
    .join(', ');
}

function getCoverageDetails(fileCoverage) {
  const data = fileCoverage.toJSON();
  const uncoveredLines = Object.entries(fileCoverage.getLineCoverage())
    .filter(([, hits]) => hits === 0)
    .map(([line]) => Number(line));
  const branchLines = Object.entries(data.branchMap)
    .filter(([id]) => data.b[id].some((hits) => hits === 0))
    .map(([, branch]) => branch.line ?? branch.loc.start.line);
  const uncoveredFunctions = Object.entries(data.fnMap)
    .filter(([id]) => data.f[id] === 0)
    .map(([, fn]) => {
      const line = fn.line ?? fn.decl.start.line ?? fn.loc.start.line;
      return `${fn.name} (line ${line})`;
    });

  return {
    branchLines: formatLineRanges(branchLines),
    uncoveredFunctions,
    uncoveredLines: formatLineRanges(uncoveredLines),
  };
}

function relativeFile(file) {
  return path.relative(projectRoot, file).split(path.sep).join('/');
}

function escapeWorkflowData(value) {
  return String(value)
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
}

function escapeWorkflowProperty(value) {
  return escapeWorkflowData(value)
    .replaceAll(':', '%3A')
    .replaceAll(',', '%2C');
}

function annotateCoverageFailure(file, summary, details) {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    return;
  }

  const metrics = Object.keys(thresholds)
    .map((metric) => `${metric} ${summary[metric].pct}%`)
    .join(', ');
  const uncovered = [
    details.uncoveredLines
      ? `uncovered lines: ${details.uncoveredLines}`
      : undefined,
    details.branchLines
      ? `partially covered branches: ${details.branchLines}`
      : undefined,
    details.uncoveredFunctions.length
      ? `uncovered functions: ${details.uncoveredFunctions.join(', ')}`
      : undefined,
  ]
    .filter(Boolean)
    .join('; ');
  const message = `${metrics}${uncovered ? `; ${uncovered}` : ''}`;

  console.error(
    `::error file=${escapeWorkflowProperty(file)},title=Coverage threshold not met::` +
      escapeWorkflowData(message)
  );
}

const jestCoverage = loadCoverageMap(
  'Jest',
  'coverage/jest/coverage-final.json'
);
const e2eCoverage = loadCoverageMap(
  'E2E',
  'coverage/e2e/coverage-final.json'
);

const serverSource = path.join(projectRoot, 'gserver', 'src', 'server.ts');
const jestSources = findTypeScriptSources(
  path.join(projectRoot, 'gserver', 'src')
).filter(
  (file) =>
    !['pages.handler.ts', 'server.ts', 'types.ts'].includes(path.basename(file))
);
assertExactFiles('Jest', jestCoverage, jestSources);
assertExactFiles('E2E', e2eCoverage, [serverSource]);

const jestFiles = new Set(jestCoverage.files().map(normalizedFile));
const overlap = e2eCoverage
  .files()
  .filter((file) => jestFiles.has(normalizedFile(file)));
if (overlap.length > 0) {
  throw new Error(
    `Jest and E2E coverage overlap for: ${overlap.join(', ')}. ` +
      'Each source file must have one coverage owner before maps are combined.'
  );
}

const serverFile = e2eCoverage
  .files()
  .find((file) => normalizedFile(file) === normalizedFile(serverSource));
if (!serverFile) {
  throw new Error(
    'E2E coverage does not contain source-mapped gserver/src/server.ts data.'
  );
}

const serverSummary = e2eCoverage.fileCoverageFor(serverFile).toSummary();
if (serverSummary.statements.total === 0) {
  throw new Error('E2E server.ts coverage contains no executable statements.');
}

const combinedCoverage = libCoverage.createCoverageMap({});
combinedCoverage.merge(jestCoverage);
combinedCoverage.merge(e2eCoverage);

fs.rmSync(outputDirectory, { recursive: true, force: true });
const context = libReport.createContext({
  coverageMap: combinedCoverage,
  dir: outputDirectory,
});
for (const reporter of ['text', 'html', 'lcovonly', 'json-summary', 'json']) {
  reports.create(reporter).execute(context);
}

const fileFailures = jestCoverage.files().flatMap((file) => {
  const fileCoverage = jestCoverage.fileCoverageFor(file);
  const fileSummary = fileCoverage.toSummary().toJSON();
  const failedMetrics = Object.entries(thresholds).filter(
    ([metric, threshold]) => {
      const actual = fileSummary[metric].pct;
      return typeof actual !== 'number' || actual < threshold;
    }
  );
  return failedMetrics.length > 0
    ? [
        {
          details: getCoverageDetails(fileCoverage),
          file: relativeFile(file),
          summary: fileSummary,
        },
      ]
    : [];
});

console.log(
  `Combined ${jestCoverage.files().length} enforced Jest-owned file(s) and ` +
    `${e2eCoverage.files().length} report-only E2E-owned file(s).`
);

if (fileFailures.length > 0) {
  fileFailures.forEach(({ details, file, summary }) => {
    annotateCoverageFailure(file, summary, details);
  });

  const fileDetails = fileFailures
    .map(({ details, file, summary: fileSummary }) => {
      const metrics = Object.keys(thresholds)
        .map((metric) => `${metric} ${fileSummary[metric].pct}%`)
        .join(', ');
      const uncovered = [
        details.uncoveredLines
          ? `  uncovered lines: ${details.uncoveredLines}`
          : undefined,
        details.branchLines
          ? `  partially covered branch lines: ${details.branchLines}`
          : undefined,
        details.uncoveredFunctions.length
          ? `  uncovered functions: ${details.uncoveredFunctions.join(', ')}`
          : undefined,
      ]
        .filter(Boolean)
        .join('\n');
      return `- ${file}\n  coverage: ${metrics}${
        uncovered ? `\n${uncovered}` : ''
      }`;
    })
    .join('\n');

  console.error(
    `Files with incomplete enforced coverage:\n${fileDetails}\n` +
      `❌ Coverage check failed: ${fileFailures.length} ` +
      `${fileFailures.length === 1 ? 'file has' : 'files have'} ` +
      'incomplete coverage.'
  );
  process.exitCode = 1;
} else {
  const fileCount = jestCoverage.files().length;
  console.log(
    `✅ Coverage check passed: ${fileCount} enforced ` +
      `${fileCount === 1 ? 'file has' : 'files have'} complete coverage; ` +
      'server.ts coverage is reported without a threshold.'
  );
}
