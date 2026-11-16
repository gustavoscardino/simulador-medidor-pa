import { auscultatoryScenario } from "./auscultatoryScenario.js";
import { CONVERSATION_STEP_IDS, PRE_ESTABLISHED_STEP_IDS } from "./SimulationController.js";
import type { CommunicationRecord, SessionState } from "./types.js";

export interface StepAssessment {
	stepId: string;
	checklistNumber: number;
	prompt: string;
	/** Rejected submissions while this step was active. */
	errors: number;
	lastFeedback: string;
}

export interface ReadingAssessment {
	recordedSystolic: number | null;
	recordedDiastolic: number | null;
	referenceSystolic: number;
	referenceDiastolic: number;
	persistentSounds: boolean;
}

export interface DebriefReport {
	totalScore: number;
	physicalScore: number;
	communicationScore: number;
	physicalStepCount: number;
	flawlessStepCount: number;
	stepsWithErrors: StepAssessment[];
	readings: ReadingAssessment;
	communication: CommunicationRecord[];
}

// Scoring policy (formative, not clinically validated): each physical step is
// worth one point, losing half a point per rejected attempt; communication
// loses 25 points per omitted topic and 10 per mistimed one. Both halves weigh 50%.
const errorPenalty = 0.5;
const omittedCommunicationPenalty = 25;
const mistimedCommunicationPenalty = 10;

export function buildDebrief(session: SessionState): DebriefReport {
	const excluded = new Set([...CONVERSATION_STEP_IDS, ...PRE_ESTABLISHED_STEP_IDS]);
	const physicalSteps = auscultatoryScenario.filter(step =>
		!excluded.has(step.id) && session.steps[step.id]?.status === "completed");

	const assessments = physicalSteps.map(step => {
		const rejected = session.attempts.filter(attempt => attempt.stepId === step.id && !attempt.accepted);
		return {
			stepId: step.id,
			checklistNumber: step.checklistNumber,
			prompt: step.prompt,
			errors: rejected.length,
			lastFeedback: rejected.at(-1)?.feedback ?? "",
		};
	});
	const credit = assessments.reduce((sum, step) => sum + Math.max(0, 1 - errorPenalty * step.errors), 0);
	const physicalScore = assessments.length ? Math.round((credit / assessments.length) * 100) : 0;

	const communication = CONVERSATION_STEP_IDS
		.map(id => session.communicationRecords?.[id])
		.filter((record): record is CommunicationRecord => Boolean(record));
	let communicationScore = 100;
	for (const id of CONVERSATION_STEP_IDS) {
		const record = session.communicationRecords?.[id];
		if (!record || record.status === "omitted") communicationScore -= omittedCommunicationPenalty;
		else if (record.timing !== "ideal") communicationScore -= mistimedCommunicationPenalty;
	}
	communicationScore = Math.max(0, communicationScore);

	const { pressure, persistentSounds } = session.config;
	const observed = (key: string) => {
		const value = session.observations[key];
		return typeof value === "number" ? value : null;
	};

	return {
		totalScore: Math.round(physicalScore * 0.5 + communicationScore * 0.5),
		physicalScore,
		communicationScore,
		physicalStepCount: assessments.length,
		flawlessStepCount: assessments.filter(step => step.errors === 0).length,
		stepsWithErrors: assessments.filter(step => step.errors > 0),
		readings: {
			recordedSystolic: observed("identify-systolic:first-sound-recorded"),
			recordedDiastolic: observed(persistentSounds ? "persistent-sounds:muffling-recorded" : "identify-diastolic:sound-disappearance-recorded"),
			referenceSystolic: pressure.systolic,
			referenceDiastolic: pressure.diastolic,
			persistentSounds,
		},
		communication,
	};
}
