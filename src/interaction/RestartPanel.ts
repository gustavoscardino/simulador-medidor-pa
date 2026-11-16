import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { clinicalLayout } from "../scene/clinicalLayout";
import type { GuidanceMode } from "../simulation/types";
import { labels } from "../ui/labels";

const textureSize = { width: 1024, height: 640 };
const panelSize = { width: 0.8, height: 0.5 };
const confirmWindowMs = 5000;

const buttons: { mode: GuidanceMode; label: string; x: number }[] = [
	{ mode: "tutorial", label: "Com orientação", x: 60 },
	{ mode: "evaluation", label: "Sem orientação", x: 532 },
];
const buttonBox = { y: 300, width: 432, height: 150 };

/**
 * Wall panel that restarts the session in a chosen guidance mode. It is a
 * scene object so it also works inside an immersive session. A button must be
 * selected twice within a few seconds, so a stray ray cannot discard progress.
 */
export class RestartPanel {
	private _root: TransformNode;
	private _texture: DynamicTexture;
	private _armedMode: GuidanceMode | null = null;
	private _armedAt = 0;
	private _disarmTimeout: ReturnType<typeof setTimeout> | null = null;

	public constructor(
		scene: Scene,
		private _currentMode: GuidanceMode,
		private _onRestart: (mode: GuidanceMode) => void
	) {
		this._root = new TransformNode("restart-panel-root", scene);
		this._root.position.fromArray(clinicalLayout.restartPanel);
		// CreatePlane's front faces local -Z, which already points into the room from the +Z wall.

		const plane = CreatePlane("restart-panel", panelSize, scene);
		plane.parent = this._root;
		plane.isPickable = false;
		this._texture = new DynamicTexture("restart-panel-texture", textureSize, scene, false);
		const material = new StandardMaterial("restart-panel-material", scene);
		material.diffuseTexture = this._texture;
		material.emissiveColor = Color3.White();
		material.specularColor = Color3.Black();
		material.backFaceCulling = false;
		plane.material = material;

		const hitMaterial = new StandardMaterial("restart-panel-hit-material", scene);
		hitMaterial.alpha = 0.001;
		hitMaterial.disableDepthWrite = true;
		for (const button of buttons) {
			const hit = CreatePlane(`restart-panel-${button.mode}`, {
				width: (buttonBox.width / textureSize.width) * panelSize.width,
				height: (buttonBox.height / textureSize.height) * panelSize.height,
			}, scene);
			hit.parent = this._root;
			const centerX = button.x + buttonBox.width / 2;
			const centerY = buttonBox.y + buttonBox.height / 2;
			hit.position.set(
				(centerX / textureSize.width - 0.5) * panelSize.width,
				(0.5 - centerY / textureSize.height) * panelSize.height,
				-0.004
			);
			hit.material = hitMaterial;
			hit.isPickable = true;
			hit.metadata = { logicalTarget: "restart-session", mode: button.mode };
		}
		this._draw();
	}

	/** Handles a pick on one of the panel's buttons; returns true when it was one. */
	public handlePick(mesh: Mesh): boolean {
		if (mesh.metadata?.logicalTarget !== "restart-session") return false;
		const mode = mesh.metadata.mode as GuidanceMode;
		const now = performance.now();
		if (this._armedMode === mode && now - this._armedAt <= confirmWindowMs) {
			this._disarm();
			this._onRestart(mode);
			return true;
		}
		this._armedMode = mode;
		this._armedAt = now;
		if (this._disarmTimeout) clearTimeout(this._disarmTimeout);
		this._disarmTimeout = setTimeout(() => this._disarm(), confirmWindowMs);
		this._draw();
		return true;
	}

	private _disarm(): void {
		if (this._disarmTimeout) clearTimeout(this._disarmTimeout);
		this._disarmTimeout = null;
		this._armedMode = null;
		this._draw();
	}

	private _draw(): void {
		const ctx = this._texture.getContext() as unknown as CanvasRenderingContext2D;
		const { width: w, height: h } = textureSize;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "#f4f6f1";
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = "#1b5947";
		ctx.lineWidth = 10;
		ctx.strokeRect(5, 5, w - 10, h - 10);

		ctx.textAlign = "center";
		ctx.fillStyle = "#173c34";
		ctx.font = "bold 64px 'Segoe UI', Arial, sans-serif";
		ctx.fillText("↺ Reiniciar simulação", w / 2, 110);
		ctx.fillStyle = "#51685e";
		ctx.font = "34px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(`Modo atual: ${labels.modes[this._currentMode]}`, w / 2, 180);
		ctx.fillText("Escolha o modo da nova sessão:", w / 2, 250);

		for (const button of buttons) {
			const armed = this._armedMode === button.mode;
			ctx.fillStyle = armed ? "#bc651f" : "#1b5947";
			ctx.beginPath();
			ctx.roundRect(button.x, buttonBox.y, buttonBox.width, buttonBox.height, 24);
			ctx.fill();
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 44px 'Segoe UI', Arial, sans-serif";
			ctx.fillText(armed ? "Confirmar?" : button.label, button.x + buttonBox.width / 2, buttonBox.y + 70);
			ctx.font = "30px 'Segoe UI', Arial, sans-serif";
			ctx.fillText(armed ? "Selecione de novo" : (button.mode === "tutorial" ? "(tutorial)" : "(avaliação)"),
				button.x + buttonBox.width / 2, buttonBox.y + 118);
		}

		ctx.fillStyle = "#51685e";
		ctx.font = "italic 28px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(this._armedMode
			? "O progresso atual será perdido. Selecione o mesmo botão para confirmar."
			: "Aponte para um botão e selecione. O progresso atual será perdido.", w / 2, 540);
		ctx.textAlign = "left";
		this._texture.update();
	}

	public dispose(): void {
		if (this._disarmTimeout) clearTimeout(this._disarmTimeout);
		this._disarmTimeout = null;
		this._root.dispose(false, true);
		this._texture.dispose();
	}
}
