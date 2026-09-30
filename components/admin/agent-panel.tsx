import { applyRun, runAgent } from "@/lib/actions/ai-runs";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, quietClass } from "@/components/admin/ui";

type Agent = { id: string; name: string; slug: string };
type Run = {
  id: string;
  output: string;
  model: string;
  slug: string;
  name: string;
  appliedAt: Date | null;
  createdAt: Date;
};

export function AgentPanel({
  targetType,
  targetId,
  agents,
  runs,
  draftLocked,
}: {
  targetType: "document" | "meeting";
  targetId: string;
  agents: Agent[];
  runs: Run[];
  draftLocked: boolean;
}) {
  return (
    <section className="mt-10 rounded-xl border border-line bg-card p-5">
      <h2 className="font-serif text-2xl">{t.admin.aiTitle}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{t.admin.aiHelp}</p>
      {agents.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t.admin.noAgents}</p>
      ) : (
        <form action={runAgent} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <Field label={t.admin.aiTitle}>
            <select name="agentId" className={inputClass} defaultValue={agents[0]?.id}>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Field>
          <SubmitButton>{t.admin.run}</SubmitButton>
        </form>
      )}
      <ul className="mt-6 space-y-4">
        {runs.map((run) => {
          const lockDraft = draftLocked && run.slug === "draft-document" && !run.appliedAt;
          return (
            <li key={run.id} className="border-t border-line pt-4">
              <p className="text-sm text-muted">
                {run.name} · {formatWhen(run.createdAt)} · {run.model}
                {run.appliedAt ? ` · ${t.admin.applied} ${formatWhen(run.appliedAt)}` : ""}
              </p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6">{run.output}</pre>
              {!run.appliedAt && !lockDraft ? (
                <form action={applyRun} className="mt-3">
                  <input type="hidden" name="runId" value={run.id} />
                  <button className={quietClass}>{t.admin.apply}</button>
                </form>
              ) : null}
              {lockDraft ? <p className="mt-2 text-sm text-clay">{t.errors.approved_locked}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
