// Single source for the clinical room's spatial layout, in meters (Babylon
// left-handed axes, +Y up). Room expansion (B13), the patient model (B12) and
// item placement (B14) should change values here instead of in scene code.

export type Vec3 = [number, number, number];

export type StationId = "overview" | "hygiene" | "prontuario" | "mesa" | "cadeira" | "esquerdo" | "direito";

export interface Station {
	/** Desktop camera eye position. */
	position: Vec3;
	lookAt: Vec3;
	/** WebXR teleport snap point on the floor, when the station offers one. */
	teleportPoint?: [number, number];
}

const eyeHeight = 1.6;

export const clinicalLayout = {
	eyeHeight,

	/** doctors_office.glb is authored at roughly half real-world size. */
	officeScale: 2.4,

	/** Interior bounds: GLB walls on −X/−Z, added enclosure walls on +X/+Z. */
	room: { minX: -2.45, maxX: 2.28, minZ: -2.52, maxZ: 2.40, height: 2.88 },

	/** Distance kept between the XR teleport floor and the walls. */
	teleportWallMargin: 0.2,

	spawn: { position: [0, eyeHeight, 0.5] as Vec3, lookAt: [0, 1.1, -1.8] as Vec3 },

	stations: {
		overview: { position: [0, eyeHeight, 0.5], lookAt: [0, 1.1, -1.8], teleportPoint: [0, 0.5] },
		hygiene: { position: [0.79, eyeHeight, -1.5], lookAt: [0.79, 1.27, -2.39], teleportPoint: [0.79, -1.6] },
		prontuario: { position: [-0.07, eyeHeight, -1.2], lookAt: [-0.07, 0.88, -1.82], teleportPoint: [-0.07, -1.3] },
		mesa: { position: [-1.5, eyeHeight, -0.5], lookAt: [-2.04, 1.0, -1.0], teleportPoint: [-1.5, -0.5] },
		cadeira: { position: [-0.2, 1.7, -0.35], lookAt: [-1.0, 1.0, -1.15] },
		esquerdo: { position: [0.05, eyeHeight, -0.55], lookAt: [-0.85, 0.85, -0.95], teleportPoint: [0.05, -0.55] },
		direito: { position: [-0.18, eyeHeight, -1.82], lookAt: [-0.98, 1.085, -1.5], teleportPoint: [-0.18, -1.82] },
	} satisfies Record<StationId, Station>,

	chair: { position: [-1.15, 0.02, -1.25] as Vec3, rotationY: Math.PI / 2, scale: 0.035 },
	patient: { position: [-1.04, 0.332, -1.095] as Vec3, rotationY: Math.PI / 2, scale: 1.0 },

	/** Consultation desk items: x is shared, z per item; heights come from the desk mesh. */
	desk: {
		x: -2.04,
		sphygmomanometerZ: -0.88,
		stethoscopeZ: -1.17,
		sanitizerZ: -0.62,
		trayZ: -1.04,
		traySize: { width: 0.33, depth: 0.62 },
	},

	/** Invisible interaction anchors on the patient's arms. */
	anchors: {
		forearm: { esquerdo: [-0.85, 0.85, -0.95] as Vec3, direito: [-0.98, 1.085, -1.5] as Vec3 },
		wrist: { esquerdo: [-0.85, 0.85, -0.72] as Vec3, direito: [-0.98, 1.085, -1.72] as Vec3 },
	},

	soapDispenser: [0.792, 1.272, -2.391] as Vec3,
	record: [-0.072, 0.88, -1.824] as Vec3,
	cuffTray: [-1.15, 0.85, -1.75] as Vec3,
	dialogueTrigger: [-0.8, 1.35, -1.15] as Vec3,
	/** General XR guidance slate, offset from the wall behind the sanitizer. */
	xrSlate: [-2.3, 1.85, -0.62] as Vec3,
};

/** Rectangle of the room floor that accepts XR teleportation. */
export function teleportFloorBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
	const { room, teleportWallMargin: margin } = clinicalLayout;
	return { minX: room.minX + margin, maxX: room.maxX - margin, minZ: room.minZ + margin, maxZ: room.maxZ - margin };
}
