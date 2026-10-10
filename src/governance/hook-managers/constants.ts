export const SPECTY_HOOK_CMD = "npx --no-install @barcidev/specty check-approval --staged";
export const SPECTY_START_MARKER = "# >>> specty-hook >>>";
export const SPECTY_END_MARKER = "# <<< specty-hook <<<";
export const SPECTY_MANAGED_COMMENT = "# Managed by specty (AI assistant governance)";

export const NATIVE_HOOK_BLOCK = `${SPECTY_START_MARKER}
${SPECTY_MANAGED_COMMENT}
${SPECTY_HOOK_CMD}
${SPECTY_END_MARKER}
`;
