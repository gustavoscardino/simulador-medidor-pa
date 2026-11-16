import type { SessionState } from "../simulation/types";

const auscultationListeningSteps = new Set([
	"start-deflation", "identify-systolic", "identify-diastolic", "confirm-disappearance", "persistent-sounds",
]);
type KorotkoffPhase = "I" | "II" | "III" | "IV";

/**
 * Interface chimes and synthesized Korotkoff sounds for one session. The audio
 * context is created on the first chime, which always follows a learner action.
 */
export class SimulationAudio {
	private _audioCtx: AudioContext | null = null;
	private _nextKorotkoffBeatAt = 0;
	private _korotkoffListening = false;

	public updateKorotkoff(snapshot: SessionState | null, pressure: number): void {
		const placedEarpieces = Boolean(snapshot?.observations["place-earpieces:earpieces-placed"]);
		const placedChestpiece = Boolean(snapshot?.observations["place-bell:chestpiece-placed"]);
		const listening = Boolean(snapshot && placedEarpieces && placedChestpiece
			&& auscultationListeningSteps.has(snapshot.currentStepId ?? "")
			&& pressure <= snapshot.config.pressure.systolic
			&& (snapshot.config.persistentSounds ? pressure > 0 : pressure > snapshot.config.pressure.diastolic));

		if (!listening) {
			this._korotkoffListening = false;
			this._nextKorotkoffBeatAt = 0;
			return;
		}
		if (!this._audioCtx || this._audioCtx.state !== "running") return;

		const now = this._audioCtx.currentTime;
		if (!this._korotkoffListening) {
			this._korotkoffListening = true;
			this._nextKorotkoffBeatAt = now + 0.08;
		}
		if (now < this._nextKorotkoffBeatAt) return;

		const { systolic, diastolic } = snapshot!.config.pressure;
		const phaseFourStart = diastolic + 5;
		let phase: KorotkoffPhase;
		if (pressure > systolic - 8) phase = "I";
		else if (pressure > systolic - (systolic - diastolic) * 0.35) phase = "II";
		else if (pressure > phaseFourStart) phase = "III";
		else phase = "IV";
		this._playKorotkoffBeat(phase);
		this._nextKorotkoffBeatAt = now + 60 / 72;
	}

	private _playKorotkoffBeat(phase: KorotkoffPhase): void {
		const ctx = this._audioCtx;
		if (!ctx || ctx.state !== "running") return;
		const settings = {
			"I": { cutoff: 1800, level: 0.24, duration: 0.11, q: 1.5 },
			"II": { cutoff: 520, level: 0.16, duration: 0.25, q: 0.55 },
			"III": { cutoff: 1250, level: 0.34, duration: 0.16, q: 1.25 },
			"IV": { cutoff: 300, level: 0.09, duration: 0.23, q: 0.7 },
		}[phase];
		const start = ctx.currentTime;
		const duration = settings.duration;
		const frameCount = Math.ceil(ctx.sampleRate * duration);
		const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < frameCount; i++) {
			const elapsed = i / ctx.sampleRate;
			const envelope = phase === "II"
				? Math.min(1, elapsed / 0.025) * Math.exp(-elapsed / 0.12)
				: Math.exp(-elapsed / (phase === "IV" ? 0.065 : 0.032));
			data[i] = (Math.random() * 2 - 1) * envelope;
		}
		const source = ctx.createBufferSource();
		const filter = ctx.createBiquadFilter();
		const gain = ctx.createGain();
		source.buffer = buffer;
		filter.type = "bandpass";
		filter.frequency.setValueAtTime(settings.cutoff, start);
		filter.Q.setValueAtTime(settings.q, start);
		gain.gain.setValueAtTime(settings.level, start);
		gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(ctx.destination);
		source.start(start);
		source.stop(start + duration);
	}

	public playChime(isSuccess: boolean): void {
		try {
			const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (!AudioContextClass) return;
			if (!this._audioCtx) this._audioCtx = new AudioContextClass();
			// A pending resume rejects once the session closes the context; nothing to do then.
			if (this._audioCtx.state === "suspended") this._audioCtx.resume().catch(() => {});

			const ctx = this._audioCtx;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);

			if (isSuccess) {
				osc.frequency.setValueAtTime(659.25, ctx.currentTime);
				osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
				gain.gain.setValueAtTime(0.08, ctx.currentTime);
				gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
				osc.start(ctx.currentTime);
				osc.stop(ctx.currentTime + 0.28);
			} else {
				osc.type = "sine";
				osc.frequency.setValueAtTime(261.63, ctx.currentTime);
				gain.gain.setValueAtTime(0.08, ctx.currentTime);
				gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
				osc.start(ctx.currentTime);
				osc.stop(ctx.currentTime + 0.22);
			}
		} catch {
			// Audio context blocked or unsupported
		}
	}

	public dispose(): void {
		this._audioCtx?.close().catch(() => {});
		this._audioCtx = null;
	}
}
