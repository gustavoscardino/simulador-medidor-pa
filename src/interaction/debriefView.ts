import type { DebriefReport } from "../simulation/debrief";
import type { CommunicationRecord } from "../simulation/types";

const timingBadge = (record: CommunicationRecord): string => {
	if (record.status === "omitted") return `<span class="debrief-badge omitted">❌ Omitido</span>`;
	if (record.timing === "ideal") return `<span class="debrief-badge ideal">✓ Momento Ideal</span>`;
	if (record.timing === "late") return `<span class="debrief-badge late">⚠ Tardio</span>`;
	return `<span class="debrief-badge early">⚠ Precoce</span>`;
};

export const timingLabel = (record: CommunicationRecord): string => {
	if (record.status === "omitted") return "Omitido";
	return { ideal: "Ideal", late: "Tardio", early: "Precoce", omitted: "Omitido" }[record.timing];
};

const reading = (value: number | null): string => value === null ? "não registrada" : `${value} mmHg`;

export function diastolicLabel(report: DebriefReport): string {
	return report.readings.persistentSounds ? "Abafamento" : "Diastólica";
}

/** Desktop debriefing card; button handlers are attached by the caller. */
export function renderDebriefHtml(report: DebriefReport): string {
	const { readings } = report;
	const physicalDetail = report.stepsWithErrors.length
		? `<ul class="debrief-list">${report.stepsWithErrors.map(step => `
			<li>⚠ <strong>Passo ${step.checklistNumber}</strong> — ${step.prompt}
				${step.errors} ${step.errors === 1 ? "tentativa incorreta" : "tentativas incorretas"}.
				${step.lastFeedback ? `<br><span class="debrief-item-detail">${step.lastFeedback}</span>` : ""}</li>`).join("")}
		</ul>`
		: `<p class="debrief-item-detail">✓ Todas as etapas físicas foram realizadas sem tentativas incorretas.</p>`;

	return `
		<div class="guidance-header">
			<span class="step-counter-badge" style="background: #2e7d32;">Concluído</span>
			<span class="step-target-badge">📊 Debriefing Formativo</span>
		</div>
		<div class="debrief-score-card">
			<div class="debrief-score-num">${report.totalScore} / 100</div>
			<div class="debrief-score-label">Pontuação geral (procedimento ${report.physicalScore} • comunicação ${report.communicationScore})</div>
		</div>

		<div class="debrief-section">
			<h4 class="debrief-section-title">🩺 Procedimento Físico — ${report.flawlessStepCount} de ${report.physicalStepCount} etapas sem erros</h4>
			${physicalDetail}
		</div>

		<div class="debrief-section">
			<h4 class="debrief-section-title">📈 Valores Registrados</h4>
			<ul class="debrief-list">
				<li>Sistólica: ${reading(readings.recordedSystolic)} (referência do caso: ${readings.referenceSystolic} mmHg)</li>
				<li>${diastolicLabel(report)}: ${reading(readings.recordedDiastolic)} (referência do caso: ${readings.referenceDiastolic} mmHg)</li>
			</ul>
		</div>

		<div class="debrief-section">
			<h4 class="debrief-section-title">💬 Comunicação e Anamnese (Ícone Lateral)</h4>
			${report.communication.map(record => `
				<div class="debrief-item">
					<div class="debrief-item-header">
						<strong>${record.title}</strong>
						${timingBadge(record)}
					</div>
					<p class="debrief-item-detail">${record.feedback}</p>
				</div>`).join("")}
		</div>

		<div class="step-actions-row" style="margin-top: 10px;">
			<button id="debrief-restart-btn" class="button primary" type="button" style="flex: 1;">
				<span>Reiniciar Simulação</span>
				<span>🔄</span>
			</button>
		</div>
		<div class="step-actions-row">
			<button id="debrief-menu-btn" class="button secondary" type="button" style="width: 100%;">
				Voltar ao Menu Principal
			</button>
		</div>
	`;
}
