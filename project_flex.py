# project_flex.py
# Place this file in the ROOT of your React + TSX + Vite project
# Run:
# python project_flex.py

import os
from pathlib import Path

ROOT = Path(__file__).parent.resolve()

# Ignore folders
IGNORE_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".vite",
    ".idea",
    ".vscode",
    "coverage",
    "__pycache__",
}

# Ignore files
IGNORE_FILES = {
    "vite.config.ts",
    "vite-env.d.ts",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
}

# Allowed extensions
VALID_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".html",
}

# Default Vite template files to ignore completely
DEFAULT_TEMPLATE_KEYWORDS = [
    "counter",
    "count is",
    "vite logo",
    "react logo",
    "edit src/App.tsx",
    "learn react",
]

total_files = 0
total_lines = 0
total_chars = 0


def is_generated_or_default(file_path: Path) -> bool:
    try:
        content = file_path.read_text(
            encoding="utf-8",
            errors="ignore"
        ).lower()

        for keyword in DEFAULT_TEMPLATE_KEYWORDS:
            if keyword in content:
                return True

    except Exception:
        pass

    return False


def should_ignore(file_path: Path) -> bool:
    # Ignore directories
    for part in file_path.parts:
        if part in IGNORE_DIRS:
            return True

    # Ignore CSS
    if file_path.suffix == ".css":
        return True

    # Ignore unsupported extensions
    if file_path.suffix not in VALID_EXTENSIONS:
        return True

    # Ignore known files
    if file_path.name in IGNORE_FILES:
        return True

    return False


def format_number(value: int) -> str:
    """
    Examples:
    62 -> 60+
    67 -> 65+
    743242 -> 743000+
    """

    if value < 100:
        rounded = (value // 5) * 5
        return f"{rounded}+"

    if value < 1000:
        rounded = (value // 10) * 10
        return f"{rounded}+"

    rounded = (value // 100) * 100
    return f"{rounded}+"



for root, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

    for file in files:
        path = Path(root) / file

        if should_ignore(path):
            continue

        if is_generated_or_default(path):
            continue

        try:
            content = path.read_text(
                encoding="utf-8",
                errors="ignore"
            )

            lines = len(content.splitlines())
            chars = len(content)

            total_files += 1
            total_lines += lines
            total_chars += chars

        except Exception:
            continue


formatted_files = format_number(total_files)
formatted_lines = format_number(total_lines)
formatted_chars = format_number(total_chars)

ts_content = f"""export const CODEBASE_INFO = {{
  files: "{formatted_files}",
  lines: "{formatted_lines}",
  chars: "{formatted_chars}",
}} as const;
"""

output_path = ROOT / "codebase-info.ts"

output_path.write_text(
    ts_content,
    encoding="utf-8"
)

print("\nGenerated: codebase-info.ts")
print(f"Files: {formatted_files}")
print(f"Lines: {formatted_lines}")
print(f"Chars: {formatted_chars}")