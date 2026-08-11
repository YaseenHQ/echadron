/**
 * Compact welcome header shown at the top of the TUI.
 * Keeps identity, workspace, model, and entry-point hints visible without
 * surrounding the whole startup state in a large panel.
 */

import type { Component } from '@moonshot-ai/pi-tui';
import { truncateToWidth, visibleWidth } from '@moonshot-ai/pi-tui';
import chalk from 'chalk';

import { effectiveModelAlias } from '@moonshot-ai/kimi-code-sdk';

import { isRainbowDancing, renderDanceWelcomeHeader } from '#/tui/easter-eggs/dance';
import type { AppState } from '#/tui/types';
import { currentTheme } from '#/tui/theme';

export class WelcomeComponent implements Component {
  private state: AppState;

  constructor(state: AppState) {
    this.state = state;
  }

  invalidate(): void {}

  render(width: number): string[] {
    const safeWidth = Math.max(0, width);
    const primary = (s: string): string => chalk.hex(currentTheme.palette.primary)(s);
    const dim = chalk.hex(currentTheme.palette.textDim);
    const muted = chalk.hex(currentTheme.palette.textMuted);
    const isLoggedOut = !this.state.model;
    const activeModel = this.state.availableModels[this.state.model];
    const effectiveActiveModel = activeModel === undefined ? undefined : effectiveModelAlias(activeModel);
    const modelValue = isLoggedOut
      ? chalk.hex(currentTheme.palette.warning)('/login to connect a model')
      : (effectiveActiveModel?.displayName ?? effectiveActiveModel?.model ?? this.state.model);
    const intent = primary('→') + ' ' + chalk.hex(currentTheme.palette.textStrong)('Ask, edit, or run anything');
    const shortcuts = muted('/ commands  ·  @ files  ·  ! shell');

    if (safeWidth < 24) {
      return [
        '',
        chalk.bold.hex(currentTheme.palette.primary)('Echadron'),
        dim(this.state.workDir),
        intent,
        modelValue,
        shortcuts,
        '',
      ].map((line) =>
        truncateToWidth(line, safeWidth, '…'),
      );
    }

    const logo = ['▐█▛█▛█▌', '▐█████▌'] as const;
    const logoWidth = Math.max(...logo.map((row) => visibleWidth(row)));
    const gap = '  ';
    const textWidth = Math.max(4, safeWidth - logoWidth - gap.length);

    const rightRow0 = truncateToWidth(chalk.bold.hex(currentTheme.palette.primary)('Echadron'), textWidth, '…');
    const rightRow1 = truncateToWidth(
      dim(`${this.state.workDir}  ·  `) + modelValue,
      textWidth,
      '…',
    );

    let renderedHeaderLines = [
      primary(logo[0].padEnd(logoWidth)) + gap + rightRow0,
      primary(logo[1].padEnd(logoWidth)) + gap + rightRow1,
    ];
    if (isRainbowDancing()) {
      renderedHeaderLines = renderDanceWelcomeHeader(logo, textWidth, rightRow1);
    }

    const lines: string[] = ['', ...renderedHeaderLines, '', intent, shortcuts];
    if (this.state.mcpServersSummary) lines.push(muted(`MCP  ${this.state.mcpServersSummary}`));
    lines.push('');

    return lines.map((line) => truncateToWidth(line, safeWidth, '…'));
  }
}
