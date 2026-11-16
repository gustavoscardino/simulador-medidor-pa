// A single learner position serves preparation, the supported right arm, and measurement.
export const patientStationOffset = [-0.80, 0, 0] as const;
export const supplyTableCenter = [-0.95, -1.90] as const;
export const supplyPositions = {
	sanitizer: [-1.23, -1.90],
	stethoscope: [-0.97, -1.90],
	record: [-0.67, -1.90],
} as const;

export const clinicalStations = {
	overview: { pos: [0, 1.6, 0.5], lookAt: [-1.3, 1.1, -1.3] },
	hygiene: { pos: [-1.05, 1.60, -1.50], lookAt: [-1.23, 1.0, -1.90] },
	prontuario: { pos: [-1.05, 1.60, -1.50], lookAt: [-0.67, 1.0, -1.90] },
	mesa: { pos: [-1.05, 1.60, -1.50], lookAt: [-0.95, 1.0, -1.90] },
	cadeira: { pos: [-0.65, 1.65, -0.45], lookAt: [-1.65, 1.05, -1.20] },
	esquerdo: { pos: [-1.05, 1.60, -0.45], lookAt: [-1.65, 0.85, -0.95] },
	direito: { pos: [-1.05, 1.60, -1.50], lookAt: [-1.60, 1.10, -1.40] },
} satisfies Record<string, { pos: [number, number, number]; lookAt: [number, number, number] }>;
