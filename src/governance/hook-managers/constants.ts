export const SPECTY_HOOK_CMD = "npx specty check-approval --staged";
export const SPECTY_START_MARKER = "# >>> specty-hook >>>";
export const SPECTY_END_MARKER = "# <<< specty-hook <<<";
export const SPECTY_MANAGED_COMMENT = "# Managed by specty (AI assistant governance)";

export const NATIVE_HOOK_BLOCK = `${SPECTY_START_MARKER}
${SPECTY_MANAGED_COMMENT}
if [ "$SPECTY_HOOK_DISABLED" = "1" ] || [ "$SPECTY_BYPASS" = "1" ]; then
  exit 0
fi

${SPECTY_HOOK_CMD}
${SPECTY_END_MARKER}
`;
