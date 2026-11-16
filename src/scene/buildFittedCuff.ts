import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

/** Fitted fabric cuff aligned to the current mannequin's posed right upper arm. */
export function buildFittedCuff(scene: Scene, patient: TransformNode): Mesh {
	const body = patient.getChildMeshes().find(mesh => mesh.getTotalVertices() === 1464);
	const positions = body?.getVerticesData("position");
	if (!body || !positions) throw new Error("Braço do paciente não encontrado para posicionar o manguito.");
	body.computeWorldMatrix(true);
	// Complete cross sections inspected on sitting_mannequin.glb. The pose helper
	// modifies these vertices before this function runs; use their final world positions.
	const ring = [1022, 1023, 1028, 1038, 1039, 1040, 1041, 1042, 1045];
	const lowerRing = [1025, 1026, 1027, 1029, 1032, 1037, 1043, 1044, 1046];
	const points = (indices: number[]) => indices.map(index => Vector3.TransformCoordinates(Vector3.FromArray(positions, index * 3), body.getWorldMatrix()));
	const centerOf = (vertices: Vector3[]) => {
		const min = vertices.reduce((a, b) => Vector3.Minimize(a, b), new Vector3(Infinity, Infinity, Infinity));
		const max = vertices.reduce((a, b) => Vector3.Maximize(a, b), new Vector3(-Infinity, -Infinity, -Infinity));
		return min.add(max).scale(0.5);
	};
	const vertices = points(ring);
	const center = centerOf(vertices);
	const axis = center.subtract(centerOf(points(lowerRing))).normalize();
	const radius = Math.max(...vertices.map(point => {
		const delta = point.subtract(center);
		return delta.subtract(axis.scale(Vector3.Dot(delta, axis))).length();
	})) + 0.004;
	const cuff = CreateCylinder("fitted-cuff-sleeve", {
		height: 0.13, diameterTop: radius * 2.08, diameterBottom: radius * 2,
		tessellation: 64, cap: Mesh.NO_CAP, sideOrientation: Mesh.DOUBLESIDE,
	}, scene);
	cuff.position.copyFrom(center);
	cuff.rotationQuaternion = Quaternion.Identity();
	Quaternion.FromUnitVectorsToRef(Vector3.Up(), axis, cuff.rotationQuaternion);
	cuff.computeWorldMatrix(true);
	const inverse = cuff.getWorldMatrix().clone().invert();
	const localRing = vertices.map(point => Vector3.TransformCoordinates(point, inverse));
	// Follow the mannequin's oval cross section rather than leaving a circular
	// air gap around its narrower side. Children/ports inherit the same fit.
	cuff.scaling.x = Math.max(0.85, (Math.max(...localRing.map(point => Math.abs(point.x))) + 0.003) / radius);
	cuff.scaling.z = Math.max(0.85, (Math.max(...localRing.map(point => Math.abs(point.z))) + 0.003) / radius);
	cuff.metadata = { assetId: "fitted-cuff-sleeve", logicalTarget: "cuff", arm: "direito", hosePorts: [[radius * 1.03, -0.065, -0.009], [radius * 1.03, -0.065, 0.009]] };
	cuff.isPickable = true;
	const fabric = new StandardMaterial("fitted-cuff-fabric", scene);
	fabric.diffuseColor = Color3.White();
	fabric.specularColor.setAll(0.035);
	const texture = new DynamicTexture("fitted-cuff-weave", { width: 1024, height: 512 }, scene, false);
	const context = texture.getContext();
	context.fillStyle = "#202a30";
	context.fillRect(0, 0, 1024, 512);
	context.fillStyle = "#29343a";
	for (let x = 0; x < 1024; x += 5) context.fillRect(x, 0, 1, 512);
	context.fillStyle = "#182227";
	for (let y = 0; y < 512; y += 5) context.fillRect(0, y, 1024, 1);
	context.fillStyle = "#6e7d81";
	for (let x = 0; x < 1024; x += 14) {
		context.fillRect(x, 14, 7, 2);
		context.fillRect(x, 496, 7, 2);
	}
	texture.update();
	fabric.diffuseTexture = texture;
	cuff.material = fabric;
	const trim = new StandardMaterial("fitted-cuff-trim", scene);
	trim.diffuseColor = Color3.FromHexString("#10191e");
	trim.specularColor.setAll(0.02);
	for (const y of [-0.064, 0.064]) {
		const seam = CreateTorus(`fitted-cuff-seam-${y}`, { diameter: radius * (y > 0 ? 2.08 : 2), thickness: 0.0025, tessellation: 64 }, scene);
		seam.parent = cuff;
		seam.position.y = y;
		seam.material = trim;
		seam.isPickable = false;
	}
	const flap = CreateBox("fitted-cuff-velcro", { width: 0.004, height: 0.105, depth: 0.033 }, scene);
	flap.parent = cuff;
	flap.position.x = radius + 0.003;
	flap.material = trim;
	flap.isPickable = false;
	const tag = CreatePlane("fitted-cuff-artery-label", { width: 0.032, height: 0.043 }, scene);
	tag.parent = cuff;
	tag.position.set(radius + 0.0055, -0.015, 0);
	tag.rotation.y = -Math.PI / 2;
	tag.isPickable = false;
	const labelTexture = new DynamicTexture("fitted-cuff-label-texture", { width: 256, height: 320 }, scene, false);
	const labelContext = labelTexture.getContext() as unknown as CanvasRenderingContext2D;
	labelContext.fillStyle = "#e8eeeb";
	labelContext.fillRect(0, 0, 256, 320);
	labelContext.fillStyle = "#183c35";
	labelContext.textAlign = "center";
	labelContext.font = "bold 34px Arial";
	labelContext.fillText("ARTÉRIA", 128, 65);
	labelContext.font = "bold 100px Arial";
	labelContext.fillText("↓", 128, 195);
	labelContext.font = "26px Arial";
	labelContext.fillText("BRAÇO DIREITO", 128, 274);
	labelTexture.update();
	const label = new StandardMaterial("fitted-cuff-label", scene);
	label.diffuseTexture = labelTexture;
	label.specularColor.setAll(0);
	tag.material = label;
	cuff.computeWorldMatrix(true);
	return cuff;
}
