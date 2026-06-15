import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFilePath = path.join(
  process.cwd(),
  'version.ts'
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const logSuccess = (message) => {
  console.log(
    `${colors.green}${message}${colors.reset}`
  );
};

const logWarning = (message) => {
  console.log(
    `${colors.yellow}${message}${colors.reset}`
  );
};

const logError = (message) => {
  console.log(
    `${colors.red}${message}${colors.reset}`
  );
};

const logInfo = (message) => {
  console.log(
    `${colors.cyan}${message}${colors.reset}`
  );
};

const getPreviousVersion = () => {
  try {
    if (!fs.existsSync(versionFilePath)) {
      return 'v1.0.0';
    }

    const fileContent = fs.readFileSync(
      versionFilePath,
      'utf-8'
    );

    const match = fileContent.match(
      /export const VERSION = '(.*)';/
    );

    return match?.[1] || 'v1.0.0';
  } catch (error) {
    logError('Failed to read previous version.');
    return 'v1.0.0';
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const previousVersion = getPreviousVersion();

logInfo(`Previous Version: ${previousVersion}`);

rl.question(
  `${colors.cyan}Enter Version Name: (leave blank for previous version): ${colors.reset}`,
  (inputVersion) => {
    try {
      const finalVersion =
        inputVersion.trim() || previousVersion;

      if (!inputVersion.trim()) {
        logWarning(
          `No version entered. Using previous version: ${finalVersion}`
        );
      }

      const content = `export const VERSION = '${finalVersion}';

export const UPDATE_TIME = new Date('${new Date().toISOString()}');
`;

      fs.writeFileSync(versionFilePath, content);

      logSuccess(
        `version.ts generated successfully with version: ${finalVersion}`
      );

      rl.close();
    } catch (error) {
      logError('Failed to generate version.ts');
      console.error(error);
      rl.close();
      process.exit(1);
    }
  }
);