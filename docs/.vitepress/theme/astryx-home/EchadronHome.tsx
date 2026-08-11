import { useMemo, useState } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { VStack, HStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "./echadron-home.css";

interface EchadronHomeProps {
  locale: string;
  docsHref: string;
  sourceHref: string;
  imageSrc: string;
}

type InstallMethod = "npm" | "pnpm";

const installCommands: Record<InstallMethod, string> = {
  npm: "npm install -g echadron",
  pnpm: "pnpm add -g echadron",
};

export function EchadronHome({
  locale,
  docsHref,
  sourceHref,
  imageSrc,
}: EchadronHomeProps) {
  const isZh = locale.startsWith("zh");
  const [method, setMethod] = useState<InstallMethod>("npm");
  const [copied, setCopied] = useState(false);
  const command = installCommands[method];
  const copy = useMemo(
    () =>
      isZh
        ? {
            title: "Echadron",
            thesis: "一个工具，连接你的所有模型。",
            lede: "一次登录，随任务变化切换模型。",
            installMethod: "安装方式",
            copy: "复制",
            copied: "已复制",
            run: "然后运行",
            showcaseTitle: "一个框架，所有模型",
            showcaseLede: "账号、模型与工具都留在一个专注的终端界面里。",
            screenshotAlt:
              "macOS 终端窗口中运行的 Echadron，显示 Kimi、ChatGPT 与 xAI 的 OAuth 登录选项",
            source: "从源码安装",
            finalTitle: "从终端开始。",
            finalBody:
              "安装 Echadron，登录你已有的账号，然后选择适合当前工作的模型。",
            docs: "阅读文档",
            github: "查看 GitHub",
          }
        : {
            title: "Echadron",
            thesis: "One tool for all your models.",
            lede: "Sign in once. Switch models when the work changes.",
            installMethod: "Install method",
            copy: "Copy",
            copied: "Copied",
            run: "Then run",
            showcaseTitle: "One harness, every model",
            showcaseLede:
              "Accounts, models, and tools stay inside one focused terminal interface.",
            screenshotAlt:
              "Echadron running in a macOS Terminal window with OAuth sign-in options for Kimi, ChatGPT, and xAI",
            source: "Install from source",
            finalTitle: "Start in your terminal.",
            finalBody:
              "Install Echadron, sign in to the accounts you already use, and choose the model that fits the work.",
            docs: "Read the docs",
            github: "View on GitHub",
          },
    [isZh]
  );

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  return (
    <Theme theme={neutralTheme} mode="dark">
      <main className="echadron-home">
        <section className="echadron-hero" aria-labelledby="echadron-title">
          <VStack align="center" gap={5} width="100%">
            <VStack align="center" gap={3} width="100%">
              <Heading
                level={1}
                type="display-1"
                id="echadron-title"
                justify="center"
              >
                {copy.title}
              </Heading>
              <Heading level={2} type="display-3" justify="center">
                {copy.thesis}
              </Heading>
              <Text type="supporting" display="block" justify="center">
                {copy.lede}
              </Text>
            </VStack>

            <div className="install-shell">
              <HStack align="center" justify="between" gap={3} width="100%">
                <SegmentedControl
                  value={method}
                  onChange={(value) => {
                    setMethod(value as InstallMethod);
                  }}
                  label={copy.installMethod}
                  size="sm"
                >
                  <SegmentedControlItem value="npm" label="npm" />
                  <SegmentedControlItem value="pnpm" label="pnpm" />
                </SegmentedControl>
                <a className="source-link" href={sourceHref}>
                  {copy.source}
                </a>
              </HStack>
              <div className="install-command">
                <code>{command}</code>
                <Button
                  label={copied ? copy.copied : copy.copy}
                  variant="secondary"
                  size="sm"
                  onClick={() => void copyCommand()}
                />
              </div>
            </div>

            <Text type="supporting" color="secondary">
              {copy.run} <code className="run-command">echadron</code>
            </Text>
          </VStack>
        </section>

        <section className="echadron-showcase" aria-labelledby="showcase-title">
          <VStack align="center" gap={3}>
            <Heading
              level={2}
              type="display-2"
              id="showcase-title"
              justify="center"
            >
              {copy.showcaseTitle}
            </Heading>
            <Text type="supporting" display="block" justify="center">
              {copy.showcaseLede}
            </Text>
          </VStack>
          <figure className="terminal-stage">
            <img src={imageSrc} alt={copy.screenshotAlt} />
          </figure>
        </section>

        <section className="echadron-final" aria-labelledby="final-title">
          <VStack gap={3} maxWidth={680}>
            <Heading level={2} type="display-2" id="final-title">
              {copy.finalTitle}
            </Heading>
            <Text type="supporting" display="block">
              {copy.finalBody}
            </Text>
          </VStack>
          <HStack gap={2} className="final-actions">
            <Button
              label={copy.docs}
              variant="primary"
              size="lg"
              href={docsHref}
            />
            <Button
              label={copy.github}
              variant="secondary"
              size="lg"
              href="https://github.com/YaseenHQ/kimi"
              target="_blank"
              rel="noreferrer"
            />
          </HStack>
        </section>
      </main>
    </Theme>
  );
}
